import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';
import { io } from '../socket/socket.js';

export const createConversation = async (req, res) => {
    try {
        const {isGroup, name, memberIds} = req.body;
        const userId = req.user._id;

        if (
            (isGroup && !name) ||
            !memberIds ||
            !Array.isArray(memberIds) ||
            memberIds.length === 0) {
            return res.status(400).json({message: "GroupName and membersList are required"});
        }

        // Clean memberIds: exclude creator's id and deduplicate
        const cleanMemberIds = Array.from(
            new Set((memberIds || []).map(id => (id?._id || id).toString()).filter(id => id && id !== userId.toString()))
        );

        let conversation;
        if (!isGroup) {
            const participantId = cleanMemberIds[0] || memberIds[0];

            conversation = await Conversation.findOne({
                isGroup: false,
                "participants.userId": {$all: [userId, participantId]},
            });

            if (!conversation) {
                conversation = new Conversation({
                    isGroup: false,
                    participants: [{userId}, {userId: participantId}],
                    lastMessageAt: new Date()
                });
                await conversation.save();
            }
        }
        if (isGroup) {
            conversation = new Conversation({
                isGroup: true,
                participants: [
                    {userId},
                    ...cleanMemberIds.map(id => ({userId: id})),
                ],
                group: {
                    name,
                    createdBy: userId,
                },
                lastMessageAt: new Date()
            });
            await conversation.save();
        }
        if (!conversation) {
            return res.status(400).json({message: "Conversation type is invalid"});
        }

        await conversation.populate([
            {path: "participants.userId", select: "displayName avatarURL"},
            {
                path: 'seenBy', select: 'displayName avatarURL'
            },
            {
                path: "lastMessage.senderId", select: "displayName avatarURL"
            }
        ]);

        const participants = (conversation.participants || []).map((p) => ({
            _id: p.userId?._id || p.userId,
            displayName: p.userId?.displayName,
            avatarURL: p.userId?.avatarURL ?? null,
            joinedAt: p.joinedAt,
        }));

        const formatted = {
            ...conversation.toObject(),
            unreadCounts: conversation.unreadCounts || {},
            participants,
        };

        // Realtime socket emit to all participants
        try {
            const allParticipantIds = [userId.toString(), ...cleanMemberIds];
            allParticipantIds.forEach(uid => {
                io.to(uid).emit("newConversation", formatted);
            });
        } catch (socketErr) {
            console.error("Error emitting newConversation:", socketErr);
        }

        return res.status(201).json({conversation: formatted});
    } catch (error) {
        console.error("Error creating conversation", error);
        return res.status(500).json({message: "System error"});
    }
}

export const getConversation = async (req, res) => {
    try {
        const userId = req.user._id;
        const conversations = await Conversation.find({
            'participants.userId': userId,
        })
            .sort({lastMessageAt: -1, updatedAt: -1})
            .populate({
                path: "participants.userId",
                select: "displayName avatarURL"
        }).populate({
                path: "lastMessage.senderId",
                select: "displayName avatarURL"
            }).populate({
                path: "seenBy",
                select: "displayName avatarURL"
            })

        const formatted = conversations.map((convo) =>{
            const participants = (convo.participants || []).map((p)=>({
                _id:p.userId?._id,
                displayName:p.userId?.displayName,
                avatarURL:p.userId?.avatarURL ?? null,
                joinedAt: p.joinedAt,
            }));
            return {
                ...convo.toObject(),
                unreadCounts: convo.unreadCounts || {},
                participants,
            }
        });
        return res.status(200).json({conversations: formatted});
    }catch(err) {
        console.error("Error getting conversation", err);
        return res.status(500).json({message: "System error"});
    }
}


export const getMessage = async (req, res) => {
    try {
        const {conversationId} = req.params;
        const {limit = 50, cursor} = req.query;
        const userId = req.user._id;

        const query = {
            conversationId,
            deletedForUsers: { $ne: userId }
        };

        if(cursor){
            query.createdAt = {$lt: new Date(cursor)};
        }

        let messages = await  Message.find(query)
            .sort({createdAt: -1 })
            .limit(Number(limit)+1);

        let nextCursor = null;
        if(messages.length > Number(limit)){
            const nextMessage = messages[messages.length - 1];
            nextCursor = nextMessage.createdAt.toISOString();
            messages.pop();
        }
        messages = messages.reverse();
        return res.status(200).json({messages, nextCursor});
    }catch (error) {
        console.error("Error getting message", error);
        return res.status(500).json({message: "System error"});
    }
}

export const getSharedMedia = async (req, res) => {
    try {
        const { conversationId } = req.params;
        
        // Find messages with images or files
        const messages = await Message.find({
            conversationId,
            $or: [
                { imgUrl: { $exists: true, $ne: null } },
                { fileUrl: { $exists: true, $ne: null } }
            ]
        })
        .sort({ createdAt: -1 })
        .limit(100); // Limit to last 100 media items for now

        const media = {
            images: [],
            files: []
        };

        messages.forEach(msg => {
            if (msg.imgUrl) {
                media.images.push({
                    _id: msg._id,
                    url: msg.imgUrl,
                    createdAt: msg.createdAt,
                    senderId: msg.senderId
                });
            }
            if (msg.fileUrl) {
                media.files.push({
                    _id: msg._id,
                    url: msg.fileUrl,
                    fileName: msg.content || "Unknown file", // Usually content stores filename or we might need separate field
                    createdAt: msg.createdAt,
                    senderId: msg.senderId
                });
            }
        });

        return res.status(200).json(media);
    } catch (error) {
        console.error("Error getting shared media", error);
        return res.status(500).json({ message: "System error" });
    }
}

export const markConversationAsRead = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" });
        }

        // Reset unread count for this user
        // Note: Map keys in Mongoose are strings.
        if (conversation.unreadCounts) {
            conversation.unreadCounts.set(userId.toString(), 0);
        } else {
            conversation.unreadCounts = new Map();
            conversation.unreadCounts.set(userId.toString(), 0);
        }

        await conversation.save();

        return res.status(200).json({ message: "Marked as read", unreadCounts: conversation.unreadCounts });
    } catch (error) {
        console.error("Error marking conversation as read", error);
        return res.status(500).json({ message: "System error" });
    }
}

export const getPinnedMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user._id;

        const pinnedMessages = await Message.find({
            conversationId,
            isPinned: true,
            deletedForUsers: { $ne: userId }
        })
        .sort({ pinnedAt: -1 })
        .populate('pinnedBy', 'username displayName avatarURL');

        return res.status(200).json({ pinnedMessages });
    } catch (error) {
        console.error("Error in getPinnedMessages:", error);
        return res.status(500).json({ message: "System error" });
    }
};