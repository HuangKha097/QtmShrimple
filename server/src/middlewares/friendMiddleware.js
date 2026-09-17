import Friend from "../models/Friend.js";
import Conversation from "../models/Conversation.js";

const pair = (a, b) => (a < b ? [a, b] : [b, a])

export const checkFriendship = async (req, res, next) => {
    try {

        const me = req.user._id.toString();
        const recipientId = req.body?.recipientId ?? null;
        // if friend can create group
        const memberIds = req.body?.memberIds ?? [];

        if (!recipientId && memberIds.length === 0) {
            return res.status(400).json({message: "No recipient ID or memberIds"});
        }

        if (recipientId) {
            const [userA, userB] = pair(me, recipientId);

            const isFriend = await Friend.findOne({userA, userB});
            if (!isFriend) {
                return res.status(403).json({message: "You are not friend"});
            }
            return next();
        }
        // todo chat group
        const friendCheck = memberIds.map(async (memberId) => {
            const [userA, userB] = pair(me, memberId);
            const friend = await Friend.findOne({userA, userB});
            return friend ? null : memberId;
        })

        const results = await Promise.all(friendCheck);
        const notFriends = results.filter(Boolean);

        if (notFriends.length > 0) {
            return res.status(403).json({message: "Only friends can join the conversation", notFriends});
        }
        next()

    } catch (err) {
        console.error("Failed during checkFriendship", err);
        return res.status(403).json({message: "System error"});
    }
}

export const checkGroupMembership = async (req, res, next) => {
    try {
        const {conversationId} = req.body;
        const userId = req.user._id;

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
          return res.status(404).json({message: "not found conversation"});
        }
        const isMember = conversation.participants.some((p)=> p.userId.toString() === userId.toString());

        if (!isMember) {
            return res.status(403).json({message: "You are not member"});
        }

        req.conversation = conversation;
        next();
    } catch (error){
        console.error("Error getting conversation", error);
        return res.status(500).json({message: "System error"});
    }
}