import express from "express";
import {
    sendDirectMessage,
    sendGroupMessage,
    reactToMessage,
    uploadChatFile,
    recallMessage,
    deleteMessageForMe,
    togglePinMessage,
    forwardMessage
} from "../controllers/messageController.js";
import {checkFriendship, checkGroupMembership} from "../middlewares/friendMiddleware.js";
import {chatUpload} from "../middlewares/uploadMiddleware.js";

const router = express.Router();

router.post("/direct", checkFriendship, sendDirectMessage)
router.post("/group", checkGroupMembership,sendGroupMessage)
router.post("/reaction", reactToMessage)
router.post("/upload", chatUpload.single("file"), uploadChatFile);

router.put("/:id/recall", recallMessage);
router.put("/:id/delete-for-me", deleteMessageForMe);
router.put("/:id/pin", togglePinMessage);
router.post("/:id/forward", forwardMessage);

export default router;