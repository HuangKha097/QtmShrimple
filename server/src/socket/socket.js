import "dotenv/config";
import { Server } from "socket.io";
import http from "http";
import express from "express";

const CLIENT_ORIGINS = (process.env.CLIENT_ORIGINS || "http://localhost:5173,https://shrimplechat.netlify.app")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: CLIENT_ORIGINS,
        methods: ["GET", "POST"],
        credentials: true,
    },
});

import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import { upDateConversationAfterCreateMessage } from "../utils/messageHelper.js";

// Map { [userId: string]: Set<socketId> }
const userSocketMap = {}; 
// Map { [userId: string]: boolean }
const userVisibilityMap = {};

// Active group calls: Map<conversationId, { conversationId, startedBy, startedAt, participants: Map<socketId, { userId, socketId, name, avatar, isMuted, isCameraOn, isScreenSharing, joinedAt }> }>
const activeGroupCalls = new Map();

const formatCallPayload = (conversationId, call) => {
    if (!call || call.participants.size === 0) {
        return {
            conversationId,
            isActive: false,
            participants: [],
            startedBy: null,
            startedAt: null,
        };
    }
    return {
        conversationId,
        isActive: true,
        startedBy: call.startedBy,
        startedAt: call.startedAt,
        participants: Array.from(call.participants.values()),
    };
};

const broadcastGroupCallStatus = async (conversationId, callData) => {
    try {
        const convo = await Conversation.findById(conversationId).select("participants");
        if (convo && convo.participants) {
            convo.participants.forEach((p) => {
                const uid = (p.userId?._id || p.userId)?.toString();
                if (uid) {
                    io.to(uid).emit("groupCallStatusChanged", callData);
                }
            });
        }
    } catch (err) {
        console.error("Error broadcasting group call status:", err);
    }
    io.to(`group-call-${conversationId}`).emit("groupCallStatusChanged", callData);
};

const handleLeaveGroupCall = async (socket, conversationId) => {
    const call = activeGroupCalls.get(conversationId);
    if (!call) return;

    const participant = call.participants.get(socket.id);
    if (!participant) return;

    call.participants.delete(socket.id);
    socket.leave(`group-call-${conversationId}`);

    // Notify remaining participants in this room
    io.to(`group-call-${conversationId}`).emit("groupCallUserLeft", {
        socketId: socket.id,
        userId: participant.userId,
        conversationId,
    });

    if (call.participants.size === 0) {
        activeGroupCalls.delete(conversationId);
        const endedPayload = {
            conversationId,
            isActive: false,
            participants: [],
            startedBy: null,
            startedAt: null,
        };
        await broadcastGroupCallStatus(conversationId, endedPayload);
    } else {
        const updatedPayload = formatCallPayload(conversationId, call);
        await broadcastGroupCallStatus(conversationId, updatedPayload);
    }
};

export const broadcastOnlineUsers = () => {
    const visibleOnlineUserIds = Object.keys(userSocketMap).filter(
        (uid) => userVisibilityMap[uid] !== false
    );

    Object.entries(userSocketMap).forEach(([uid, sockets]) => {
        const isSelfVisible = userVisibilityMap[uid] !== false;
        const listToSend = isSelfVisible ? visibleOnlineUserIds : [];
        sockets.forEach((sid) => {
            io.to(sid).emit("getOnlineUsers", listToSend);
        });
    });
};

export const getReceiverSocketId = (receiverId) => {
    if (!receiverId) return null;
    const id = receiverId.toString();
    const sockets = userSocketMap[id];
    if (!sockets || sockets.size === 0) return null;
    return Array.from(sockets)[0];
};

export const isUserOnline = (userId) => {
    if (!userId) return false;
    const sockets = userSocketMap[userId.toString()];
    const isVisible = userVisibilityMap[userId.toString()] !== false;
    return !!(sockets && sockets.size > 0 && isVisible);
};

io.on("connection", (socket) => {
    console.log("A user connected", socket.id);

    const userId = socket.handshake.query.userId?.toString();
    const showOnline = socket.handshake.query.showOnlineStatus !== "false";

    if (userId && userId !== "undefined") {
        if (!userSocketMap[userId]) {
            userSocketMap[userId] = new Set();
        }
        userSocketMap[userId].add(socket.id);
        userVisibilityMap[userId] = showOnline;
        // Cho socket gia nhập room theo userId
        socket.join(userId);
    }

    broadcastOnlineUsers();

    socket.on("setOnlineVisibility", (isVisible) => {
        if (userId) {
            userVisibilityMap[userId] = !!isVisible;
            broadcastOnlineUsers();
        }
    });

    // --- 1-ON-1 CALLING EVENTS (Signaling) ---
    
    // 1. Initiate Call
    socket.on("callUser", ({ userToCall, signalData, from, name, avatar, isVideo }) => {
        const targetUserId = userToCall?.toString();
        if (targetUserId && isUserOnline(targetUserId)) {
            io.to(targetUserId).emit("callUser", { signal: signalData, from, name, avatar, isVideo });
        } else {
             // Notify caller that user is offline
             io.to(socket.id).emit("callUserOffline", { userId: userToCall });
        }
    });

    // 2. Answer Call
    socket.on("answerCall", (data) => {
        const targetUserId = data.to?.toString();
        if (targetUserId) {
            io.to(targetUserId).emit("callAccepted", data.signal);
        }
    });

    // 3. ICE Candidates (Network path discovery)
    socket.on("ice-candidate", ({ candidate, to }) => {
        const targetUserId = to?.toString();
        if (targetUserId) {
            io.to(targetUserId).emit("ice-candidate", candidate);
        }
    });

    // 4. End Call / Reject Call
    socket.on("endCall", ({ to }) => {
        const targetUserId = to?.toString();
        if (targetUserId) {
            io.to(targetUserId).emit("endCall");
        }
    });

    // --- DISCORD-LIKE GROUP CALLING (Mesh WebRTC & Voice Channels) ---

    // 1. Join Group Call Room
    socket.on("joinGroupCall", async ({ conversationId, user }) => {
        if (!conversationId || !user?._id) return;
        
        let call = activeGroupCalls.get(conversationId);
        const isNewCall = !call;

        if (!call) {
            call = {
                conversationId,
                startedBy: {
                    _id: user._id,
                    name: user.displayName || user.username || "User",
                    avatar: user.avatarURL || "",
                },
                startedAt: new Date(),
                participants: new Map(),
            };
            activeGroupCalls.set(conversationId, call);

            // Create in-group notification message for the group call
            try {
                const callMessage = await Message.create({
                    conversationId,
                    senderId: user._id,
                    content: "Cuộc gọi thoại nhóm đã bắt đầu",
                    messageType: "group_call",
                });
                const populatedMessage = await Message.findById(callMessage._id)
                    .populate("senderId", "username displayName avatarURL");

                const convo = await Conversation.findById(conversationId);
                if (convo) {
                    upDateConversationAfterCreateMessage(convo, populatedMessage, user._id);
                    await convo.save();

                    // Broadcast newMessage to all participants in this conversation
                    convo.participants.forEach((p) => {
                        const uid = (p.userId?._id || p.userId)?.toString();
                        if (uid) {
                            io.to(uid).emit("newMessage", populatedMessage);
                        }
                    });
                }
            } catch (msgErr) {
                console.error("Error creating group call notification message:", msgErr);
            }
        }

        const newParticipant = {
            userId: user._id,
            socketId: socket.id,
            name: user.displayName || user.username || "User",
            avatar: user.avatarURL || "",
            isMuted: false,
            isCameraOn: false,
            isScreenSharing: false,
            joinedAt: new Date(),
        };

        // Existing participants currently in the call
        const existingParticipants = Array.from(call.participants.values());

        // Add user to call
        call.participants.set(socket.id, newParticipant);
        socket.join(`group-call-${conversationId}`);

        // Send existing participants list to newly joined user
        socket.emit("groupCallExistingUsers", {
            conversationId,
            participants: existingParticipants,
        });

        // Notify other participants in the room that a new user joined
        socket.to(`group-call-${conversationId}`).emit("groupCallUserJoined", {
            conversationId,
            user: newParticipant,
        });

        // Broadcast active status to all conversation members (updates live banner in chat)
        const payload = formatCallPayload(conversationId, call);
        await broadcastGroupCallStatus(conversationId, payload);
    });

    // 2. WebRTC Mesh Signaling (Offer / Answer / ICE)
    socket.on("groupCallSignal", ({ to, signal, fromSocketId, fromUser }) => {
        if (to) {
            io.to(to).emit("groupCallSignal", {
                signal,
                fromSocketId: socket.id,
                fromUser,
            });
        }
    });

    // 3. Toggle Media States (Mic Mute / Camera / Screen Share)
    socket.on("groupCallToggleMedia", async ({ conversationId, isMuted, isCameraOn, isScreenSharing }) => {
        const call = activeGroupCalls.get(conversationId);
        if (call && call.participants.has(socket.id)) {
            const participant = call.participants.get(socket.id);
            if (typeof isMuted === "boolean") participant.isMuted = isMuted;
            if (typeof isCameraOn === "boolean") participant.isCameraOn = isCameraOn;
            if (typeof isScreenSharing === "boolean") participant.isScreenSharing = isScreenSharing;

            io.to(`group-call-${conversationId}`).emit("groupCallParticipantMediaChanged", {
                socketId: socket.id,
                userId: participant.userId,
                isMuted: participant.isMuted,
                isCameraOn: participant.isCameraOn,
                isScreenSharing: participant.isScreenSharing,
            });

            const payload = formatCallPayload(conversationId, call);
            await broadcastGroupCallStatus(conversationId, payload);
        }
    });

    // 4. Leave Group Call
    socket.on("leaveGroupCall", async ({ conversationId }) => {
        await handleLeaveGroupCall(socket, conversationId);
    });

    // 5. Query Call Status for a Conversation
    socket.on("getGroupCallStatus", ({ conversationId }, callback) => {
        const call = activeGroupCalls.get(conversationId);
        const payload = formatCallPayload(conversationId, call);
        if (typeof callback === "function") {
            callback(payload);
        } else {
            socket.emit("groupCallStatusChanged", payload);
        }
    });

    // 6. Query All Active Group Calls
    socket.on("getAllActiveGroupCalls", (callback) => {
        const allCalls = {};
        for (const [convoId, call] of activeGroupCalls.entries()) {
            if (call.participants.size > 0) {
                allCalls[convoId] = formatCallPayload(convoId, call);
            }
        }
        if (typeof callback === "function") {
            callback(allCalls);
        } else {
            socket.emit("allActiveGroupCalls", allCalls);
        }
    });

    socket.on("disconnect", () => {
        console.log("user disconnected", socket.id);
        if (userId && userSocketMap[userId]) {
            userSocketMap[userId].delete(socket.id);
            if (userSocketMap[userId].size === 0) {
                delete userSocketMap[userId];
                delete userVisibilityMap[userId];
            }
        }
        broadcastOnlineUsers();

        // Cleanup any group call this socket was participating in
        for (const [convoId, call] of activeGroupCalls.entries()) {
            if (call.participants.has(socket.id)) {
                handleLeaveGroupCall(socket, convoId);
            }
        }
    });
});

export { app, io, server };
