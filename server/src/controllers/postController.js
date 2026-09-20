import Post from "../models/Post.js";
import Friend from "../models/Friend.js";
import { spawn } from "child_process";
import path from "path";
import { uploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

const checkFakeNews = (text) => {
    return new Promise((resolve, reject) => {
        // Path to python script relative to server root
        const scriptPath = path.join(process.cwd(), 'src', 'algorithms', 'TF-IDF_RandomForest', 'predict_news.py');
        
        const pythonProcess = spawn('python', [scriptPath], {
             stdio: ['pipe', 'pipe', 'pipe']
        });

        let dataString = '';
        let errorString = '';

        // Write text to stdin
        pythonProcess.stdin.write(text);
        pythonProcess.stdin.end();

        pythonProcess.stdout.on('data', (data) => {
            dataString += data.toString();
        });

        pythonProcess.stderr.on('data', (data) => {
            errorString += data.toString();
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                console.error("Python script error:", errorString)
                // Fallback: If python fails (e.g. missing libs), we might allow the post or block. 
                // Let's log and allow for now to avoid blocking service, OR reject specific error.
                // But user requested feature, so let's try to parse error or default to false (Real) 
                // ONLY IF it's a system error. If it's a model error, we might want to know.
                // For now, resolve as Real to prevent blocking valid posts if system is buggy.
                // BUT better to log.
                console.log("Fake news check failed, assuming real (default fallback).");
                resolve({ isFake: false }); 
                return;
            }

            try {
                // Find JSON in output (in case of other prints)
                // We expect just JSON
                const result = JSON.parse(dataString);
                resolve(result);
            } catch (err) {
                console.error("Failed to parse Python output:", dataString);
                resolve({ isFake: false });
            }
        });
    });
};

export const createPost = async (req, res) => {
    try {
        const { content, privacy } = req.body;
        const userId = req.user._id;

        // Check for duplicate post within last 60 seconds
        const thirtySecondsAgo = new Date(Date.now() - 60000);
        const duplicate = await Post.findOne({
            author: userId,
            content: content,
            createdAt: { $gte: thirtySecondsAgo }
        });

        if (duplicate) {
             console.log("Duplicate post blocked for user", userId);
             // If we already have this post, just return it instead of erroring, 
             // to handle client retries gracefully, or return 409
             return res.status(200).json(duplicate);
        }

        let imagesArray = [];
        let videoUrl = "";

        // Support both req.files (array from upload.any) and req.file (single)
        const uploadedFiles = req.files && req.files.length > 0 ? req.files : (req.file ? [req.file] : []);

        if (uploadedFiles.length > 0) {
            // Upload files concurrently
            const uploadPromises = uploadedFiles.map(async (file) => {
                const localPath = file.path;
                const cloudResponse = await uploadToCloudinary(localPath);
                return { file, cloudResponse };
            });

            const results = await Promise.all(uploadPromises);

            for (const { cloudResponse } of results) {
                if (cloudResponse) {
                    if (cloudResponse.resource_type === 'video') {
                        if (cloudResponse.duration > 60.5) {
                            await deleteFromCloudinary(cloudResponse.public_id, 'video');
                            return res.status(400).json({ message: "Video must be 60 seconds or less." });
                        }
                        videoUrl = cloudResponse.secure_url;
                    } else {
                        imagesArray.push(cloudResponse.secure_url);
                    }
                }
            }
        }

        // Support raw URLs in body (single or array)
        if (req.body.images) {
            try {
                const parsed = typeof req.body.images === 'string' ? JSON.parse(req.body.images) : req.body.images;
                if (Array.isArray(parsed)) {
                    imagesArray.push(...parsed.filter(Boolean));
                } else if (typeof parsed === 'string' && parsed) {
                    imagesArray.push(parsed);
                }
            } catch {
                if (typeof req.body.images === 'string' && req.body.images) {
                    imagesArray.push(req.body.images);
                }
            }
        } else if (req.body.image) {
            imagesArray.push(req.body.image);
        }

        if (req.body.video) {
            videoUrl = req.body.video;
        }
        
        if (!content && imagesArray.length === 0 && !videoUrl) {
            return res.status(400).json({ message: "Post content or media is required" });
        }

        // --- Fake News Detection ---
        if (content && content.length > 50) { // Only check if text is substantial (> 50 chars)
            try {
                const detectionResult = await checkFakeNews(content);
                if (detectionResult.error) {
                     console.error("Model error:", detectionResult.error);
                } else if (detectionResult.isFake) {
                    return res.status(400).json({ 
                        message: "Your post appears to contain fake news or misleading information and cannot be posted.",
                        isFake: true,
                        confidence: detectionResult.confidence
                    });
                }
            } catch (err) {
                console.error("Fake news detection exception:", err);
            }
        }
        // ---------------------------

        const validPrivacy = (privacy && ["public", "friends", "private"].includes(privacy)) ? privacy : "public";

        const newPost = new Post({
            author: req.user._id,
            content,
            image: imagesArray[0] || "",
            images: imagesArray,
            video: videoUrl,
            privacy: validPrivacy,
        });

        await newPost.save();
        
        // Populate author details to return immediately
        await newPost.populate("author", "username displayName avatarURL");

        res.status(201).json(newPost);
    } catch (error) {
        console.error("Error in createPost controller: ", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getAllPosts = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Get all friends
        const friendships = await Friend.find({
            $or: [{ userA: userId }, { userB: userId }]
        });

        const friendIds = friendships.map(f => 
            f.userA.toString() === userId.toString() ? f.userB : f.userA
        );

        const limit = parseInt(req.query.limit) || 10;
        const cursor = req.query.cursor; // Cursor is the ISO date string of the last post

        const query = {
            $or: [
                { author: userId },
                { author: { $in: friendIds }, privacy: { $in: ["public", "friends", null, undefined] } },
                { privacy: "public" }
            ]
        };
        
        if (cursor) {
            query.createdAt = { $lt: new Date(cursor) };
        }

        // Find posts matching privacy criteria
        const posts = await Post.find(query)
            .sort({ createdAt: -1 })
            .limit(limit + 1) // Fetch 1 extra to check if there are more
            .populate("author", "username displayName avatarURL")
            .populate("comments.postedBy", "username displayName avatarURL")
            .populate("comments.replies.postedBy", "username displayName avatarURL");

        let nextCursor = null;
        if (posts.length > limit) {
            const nextPost = posts.pop(); // Remove the extra post
            nextCursor = nextPost.createdAt.toISOString();
        }

        res.status(200).json({ posts, nextCursor });
    } catch (error) {
        console.error("Error in getAllPosts controller: ", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getVideoFeed = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5;
        const cursor = req.query.cursor;

        const query = { 
            video: { $exists: true, $ne: "" },
            privacy: { $in: ["public", null, undefined] }
        };

        if (cursor) {
            query.createdAt = { $lt: new Date(cursor) };
        }

        // Global Video Feed: Find public posts with videos
        const posts = await Post.find(query)
            .sort({ createdAt: -1 })
            .limit(limit + 1)
            .populate("author", "username displayName avatarURL")
            .populate("comments.postedBy", "username displayName avatarURL")
            .populate("comments.replies.postedBy", "username displayName avatarURL");

        let nextCursor = null;
        if (posts.length > limit) {
            const nextPost = posts.pop();
            nextCursor = nextPost.createdAt.toISOString();
        }

        res.status(200).json({ posts, nextCursor });
    } catch (error) {
        console.error("Error in getVideoFeed controller: ", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getUserPosts = async (req, res) => {
    try {
        const { userId: targetUserId } = req.params;
        const currentUserId = req.user?._id;

        let query = { author: targetUserId };

        if (currentUserId && currentUserId.toString() === targetUserId.toString()) {
            // Viewing own profile: can see all posts
        } else {
            let isFriend = false;
            if (currentUserId) {
                const friendship = await Friend.findOne({
                    $or: [
                        { userA: currentUserId, userB: targetUserId },
                        { userA: targetUserId, userB: currentUserId }
                    ]
                });
                if (friendship) isFriend = true;
            }

            if (isFriend) {
                query.privacy = { $in: ["public", "friends", null, undefined] };
            } else {
                query.privacy = { $in: ["public", null, undefined] };
            }
        }

        const posts = await Post.find(query)
            .sort({ createdAt: -1 })
            .populate("author", "username displayName avatarURL")
            .populate("comments.postedBy", "username displayName avatarURL")
            .populate("comments.replies.postedBy", "username displayName avatarURL");

        res.status(200).json(posts);
    } catch (error) {
        console.error("Error in getUserPosts controller: ", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const updatePostPrivacy = async (req, res) => {
    try {
        const { id } = req.params;
        const { privacy } = req.body;
        const userId = req.user._id;

        if (!["public", "friends", "private"].includes(privacy)) {
            return res.status(400).json({ message: "Quyền riêng tư không hợp lệ" });
        }

        const post = await Post.findById(id);
        if (!post) {
            return res.status(404).json({ message: "Không tìm thấy bài viết" });
        }

        if (post.author.toString() !== userId.toString()) {
            return res.status(403).json({ message: "Bạn không có quyền chỉnh sửa quyền riêng tư bài viết này" });
        }

        post.privacy = privacy;
        await post.save();

        const updatedPost = await Post.findById(id)
            .populate("author", "username displayName avatarURL")
            .populate("comments.postedBy", "username displayName avatarURL")
            .populate("comments.replies.postedBy", "username displayName avatarURL");

        res.status(200).json(updatedPost);
    } catch (error) {
        console.error("Error in updatePostPrivacy:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const repostPost = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const post = await Post.findById(id);
        if (!post) {
            return res.status(404).json({ message: "Không tìm thấy bài viết" });
        }

        if (!Array.isArray(post.reposts)) {
            post.reposts = [];
        }

        const isReposted = post.reposts.some((uid) => uid.toString() === userId.toString());

        if (isReposted) {
            // Un-repost
            post.reposts = post.reposts.filter((uid) => uid.toString() !== userId.toString());
        } else {
            // Repost
            post.reposts.push(userId);
        }

        await post.save();

        const updatedPost = await Post.findById(id)
            .populate("author", "username displayName avatarURL")
            .populate("comments.postedBy", "username displayName avatarURL")
            .populate("comments.replies.postedBy", "username displayName avatarURL");

        res.status(200).json(updatedPost);
    } catch (error) {
        console.error("Error in repostPost:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const likePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user._id;

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        const isLiked = post.likes.includes(userId);

        if (isLiked) {
            // Unlike
            post.likes = post.likes.filter((id) => id.toString() !== userId.toString());
        } else {
            // Like
            post.likes.push(userId);
        }

        await post.save();
        
        const updatedPost = await Post.findById(postId)
            .populate("author", "username displayName avatarURL")
            .populate("comments.postedBy", "username displayName avatarURL")
            .populate("comments.replies.postedBy", "username displayName avatarURL");

        res.status(200).json(updatedPost);
    } catch (error) {
        console.error("Error in likePost controller: ", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const addComment = async (req, res) => {
    try {
        const { text } = req.body;
        const postId = req.params.id;

        if (!text) {
            return res.status(400).json({ message: "Comment text is required" });
        }

        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        const comment = {
            text,
            postedBy: req.user._id,
        };

        post.comments.push(comment);
        await post.save();
        
        // Re-fetch to populate comment user details
        const updatedPost = await Post.findById(postId)
            .populate("author", "username displayName avatarURL")
            .populate("comments.postedBy", "username displayName avatarURL")
            .populate("comments.replies.postedBy", "username displayName avatarURL");

        res.status(200).json(updatedPost);
    } catch (error) {
        console.error("Error in addComment controller: ", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const deletePost = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        // Check if user is author
        if (post.author.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: "You are not authorized to delete this post" });
        }

        await Post.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
        console.error("Error in deletePost controller: ", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const getPostById = async (req, res) => {
    try {
        const post = await Post.findById(req.params.id)
            .populate("author", "username displayName avatarURL")
            .populate("comments.postedBy", "username displayName avatarURL")
            .populate("comments.replies.postedBy", "username displayName avatarURL");

        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        res.status(200).json(post);
    } catch (error) {
        console.error("Error in getPostById controller: ", error.message);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

export const reactToComment = async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const { reaction } = req.body;
        const userId = req.user._id;

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const comment = post.comments.id(commentId);
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        const existingReactionIndex = comment.reactions.findIndex(r => r.userId.toString() === userId.toString());

        if (existingReactionIndex > -1) {
            const existingReaction = comment.reactions[existingReactionIndex];
            if (existingReaction.reaction === reaction) {
                // Toggle off if same reaction
                comment.reactions.splice(existingReactionIndex, 1);
            } else {
                // Change reaction
                existingReaction.reaction = reaction;
            }
        } else {
            comment.reactions.push({ userId, reaction });
        }

        await post.save();

        const updatedPost = await Post.findById(postId)
            .populate("author", "username displayName avatarURL")
            .populate("comments.postedBy", "username displayName avatarURL")
            .populate("comments.replies.postedBy", "username displayName avatarURL");

        res.status(200).json(updatedPost);
    } catch (error) {
        console.error("Error in reactToComment:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const replyComment = async (req, res) => {
    try {
        const { postId, commentId } = req.params;
        const { text } = req.body;
        const userId = req.user._id;

        if (!text) return res.status(400).json({ message: "Reply text is required" });

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const comment = post.comments.id(commentId);
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        comment.replies.push({
            text,
            postedBy: userId,
            created: new Date()
        });

        await post.save();

         const updatedPost = await Post.findById(postId)
            .populate("author", "username displayName avatarURL")
            .populate("comments.postedBy", "username displayName avatarURL")
            .populate("comments.replies.postedBy", "username displayName avatarURL");

        res.status(200).json(updatedPost);
    } catch (error) {
        console.error("Error in replyComment:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const reactToReply = async (req, res) => {
    try {
        const { postId, commentId, replyId } = req.params;
        const { reaction } = req.body;
        const userId = req.user._id;

        const post = await Post.findById(postId);
        if (!post) return res.status(404).json({ message: "Post not found" });

        const comment = post.comments.id(commentId);
        if (!comment) return res.status(404).json({ message: "Comment not found" });

        const reply = comment.replies.id(replyId);
        if (!reply) return res.status(404).json({ message: "Reply not found" });

        const existingReactionIndex = reply.reactions.findIndex(r => r.userId.toString() === userId.toString());

        if (existingReactionIndex > -1) {
             const existingReaction = reply.reactions[existingReactionIndex];
             if (existingReaction.reaction === reaction) {
                 reply.reactions.splice(existingReactionIndex, 1);
             } else {
                 existingReaction.reaction = reaction;
             }
        } else {
            reply.reactions.push({ userId, reaction });
        }

        await post.save();

        const updatedPost = await Post.findById(postId)
            .populate("author", "username displayName avatarURL")
            .populate("comments.postedBy", "username displayName avatarURL")
            .populate("comments.replies.postedBy", "username displayName avatarURL");

        res.status(200).json(updatedPost);
    } catch (error) {
        console.error("Error in reactToReply:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
