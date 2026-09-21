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

// Map { [userId: string]: Set<socketId> }
const userSocketMap = {}; 
// Map { [userId: string]: boolean }
const userVisibilityMap = {};

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

    // --- CALLING EVENTS (Signaling) ---
    
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
    });
});

export { app, io, server };
