import User from "../models/User.js";
import Friend from "../models/Friend.js";
import FriendRequest from "../models/FriendRequest.js";

export const sendFriendRequest = async (req, res) => {
    try {
        const {to, message} = req.body;

        const from = req.user._id;

        if (from.toString() === to) {
            return res.status(400).json({message: "Can not send friend request to yourself"});
        }

        const userExists = await User.exists({_id: to});

        if (!userExists) {
            return res.status(400).json({message: "User does not exist"});
        }

        let userA = from.toString()
        let userB = to

        if (userA > userB) {
            [userA, userB] = [userB, userA];
        }

        const [alreadyFriends, existingRequest] = await Promise.all([Friend.findOne({
            userA, userB
        }), FriendRequest.findOne({
            $or: [{from, to}, {from: to, to: from}]
        }),])
        if (alreadyFriends) {
            return res.status(400).json({message: "You already friends with this user"});
        }
        if (existingRequest) {
            return res.status(400).json({message: "You already send request"});
        }

        const request = await FriendRequest.create({
            from, to, message,
        })

        return res.status(201).json({message: "Send request successfully", request});
    } catch (err) {
        console.log("Error adding Friend ", err);
        return res.status(500).json({message: "System error"});
    }
}
export const acceptFriendRequest = async (req, res) => {
    try {
        const {requestId} = req.params;
        const userId = req.user._id;

        const request = await FriendRequest.findById(requestId);
        if (!request) {
            return res.status(404).json({message: "Error can not find friend request"});
        }
        if (request.to.toString() !== userId.toString()) {
            return res.status(403).json({message: "Can not accept this request"});
        }

        const friend = await Friend.create({
            userA: request.from, userB: request.to,
        })
        await FriendRequest.findByIdAndDelete(requestId)
        // khi co lean thi data tra ve la js thay vi mongoDocument => query se nhanh va nhe hon
        const from = await User.findById(request.from).select('_id displayName avatarURL').lean();

        return res.status(200).json({
            message: "Accept request successfully", newFriend: {
                _id: from?._id, displayName: from?.displayName, avatarURL: from?.avatarURL,
            }
        });
    } catch (err) {
        console.log("Error, can not accept request ", err);
        return res.status(500).json({message: "System error"});
    }
}
export const declineFriendRequest = async (req, res) => {
    try {
        const {requestId} = req.params;
        const userId = req.user._id;

        const request = await FriendRequest.findById(requestId);

        if (!request) {
            return res.status(404).json({message: "Error can not find friend request"});
        }

        if (request.to.toString() !== userId.toString()) {
            return res.status(403).json({message: "Can not decline request"});
        }

        await FriendRequest.findByIdAndDelete(requestId);

        return res.status(204);


    } catch (err) {
        console.log("Error, can not decline the request", err);
        return res.status(500).json({message: "System error"});
    }
}
export const unFriend = async (req, res) => {
    try {
    const {friendId} = req.params;
    const userId = req.user._id;

    if (!friendId){
        return res.status(404).json({message: "Error can not unfriend"});
    }

    const friendship = await Friend.findOne({
        $or:[
            {userA:userId, userB:friendId},
            {userA:friendId, userB: userId}
        ]
    });
    if (!friendship) {
        return res.status(404).json({message: "Error can not unfriend"});
    }

    await Friend.findByIdAndDelete(friendship._id);
    return res.status(200).json({message: "Unfriend successfully", friendship});
    } catch (err) {
        console.log("Error, can not unfriend ", err);
        return res.status(500).json({message: "System error"});
    }
}
export const blockFriend = (req, res) => {
    try {

    } catch (err) {
        console.log("Error, can not block this user ", err);
        return res.status(500).json({message: "System error"});
    }
}
export const getAllFriends = async (req, res) => {
    try {
        const userId = req.user._id;

        const friendships = await Friend.find({
            $or: [{
                userA: userId
            }, {
                userB: userId
            }]
        })
            .populate('userA', "_id displayName avatarURL ")
            .populate('userB', "_id displayName avatarURL ")
            .lean()
        if (!friendships.length > 0) {
            return res.status(200).json({friends: []})
        }
        const friends = friendships.map((f) =>
            f.userA._id.toString() === userId.toString() ? f.userB : f.userA
        )
        return res.status(200).json({friends: friends})
    } catch (err) {
        console.log("Error, can not get all friends ", err);
        return res.status(500).json({message: "System error"});
    }
}
export const getFriendRequests = async (req, res) => {
    try {
    const userId = req.user._id;

    const populateFields = "_id username displayName avatarURL ";

    const [sent, received] = await Promise.all([
        FriendRequest.find({from: userId}).populate('to', populateFields),
        FriendRequest.find({to: userId}).populate('from', populateFields)
    ])
        res.status(200).json({sent, received});
    } catch (err) {
        console.log("Error, can not requests friends ", err);
        return res.status(500).json({message: "System error"});
    }
}

export const getSuggestedFriends = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Get all friends
        const friendships = await Friend.find({
            $or: [{ userA: userId }, { userB: userId }]
        });
        
        const friendIds = friendships.map(f => 
            f.userA.toString() === userId.toString() ? f.userB.toString() : f.userA.toString()
        );

        // 2. Get all pending requests
        const requests = await FriendRequest.find({
            $or: [{ from: userId }, { to: userId }]
        });
        
        const requestIds = requests.map(r => 
            r.from.toString() === userId.toString() ? r.to.toString() : r.from.toString()
        );

        // 3. Exclude self, friends, and pending requests
        const excludeIds = [userId, ...friendIds, ...requestIds];

        const suggestions = await User.find({
            _id: { $nin: excludeIds }
        })
        .limit(20)
        .select('_id displayName avatarURL username') // Select only needed fields
        .lean();

        res.status(200).json(suggestions);
    } catch (err) {
        console.log("Error getting suggested friends", err);
        return res.status(500).json({message: "System error"});
    }
}
