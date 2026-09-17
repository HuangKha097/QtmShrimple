import express from "express";
import {
    createPost,
    getAllPosts,
    getUserPosts,
    getPostById,
    likePost,
    addComment,
    deletePost,
    getVideoFeed,
    reactToComment,
    replyComment,
    reactToReply,
} from "../controllers/postController.js";

import { upload } from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.get("/", getAllPosts);
router.get("/videos", getVideoFeed);
router.get("/user/:userId", getUserPosts);
router.get("/single/:id", getPostById);
router.post("/create", upload.single("media"), createPost);
router.put("/like/:id", likePost);
router.put("/comment/:id", addComment);
router.delete("/:id", deletePost);
router.put("/:postId/comment/:commentId/like", reactToComment);
router.post("/:postId/comment/:commentId/reply", replyComment);
router.put("/:postId/comment/:commentId/reply/:replyId/like", reactToReply);

export default router;
