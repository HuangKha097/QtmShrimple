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
    },
});

export const getReceiverSocketId = (receiverId) => {
    return userSocketMap[receiverId];
};

const userSocketMap = {}; // {userId: socketId}

io.on("connection", (socket) => {
    console.log("A user connected", socket.id);

    const userId = socket.handshake.query.userId;
    if (userId && userId !== "undefined") userSocketMap[userId] = socket.id;

    // io.emit() is used to send events to all the connected clients
    io.emit("getOnlineUsers", Object.keys(userSocketMap));

    // --- CALLING EVENTS (Signaling) ---
    
    // 1. Initiate Call
    socket.on("callUser", ({ userToCall, signalData, from, name, isVideo }) => {
        const socketId = getReceiverSocketId(userToCall);
        if (socketId) {
            io.to(socketId).emit("callUser", { signal: signalData, from, name, isVideo });
        } else {
             // Optionally notify caller that user is offline
             io.to(socket.id).emit("callUserOffline", { userId: userToCall });
        }
    });

    // 2. Answer Call
    socket.on("answerCall", (data) => {
        const socketId = getReceiverSocketId(data.to);
        if (socketId) {
            io.to(socketId).emit("callAccepted", data.signal);
        }
    });

    // 3. ICE Candidates (Network path discovery)
    socket.on("ice-candidate", ({ candidate, to }) => {
        const socketId = getReceiverSocketId(to);
        if (socketId) {
            io.to(socketId).emit("ice-candidate", candidate);
        }
    });

    // 4. End Call / Reject Call
    socket.on("endCall", ({ to }) => {
        const socketId = getReceiverSocketId(to);
        if (socketId) {
            io.to(socketId).emit("endCall");
        }
    });

    socket.on("disconnect", () => {
        console.log("user disconnected", socket.id);
        delete userSocketMap[userId];
        io.emit("getOnlineUsers", Object.keys(userSocketMap));
    });
});

export { app, io, server };
