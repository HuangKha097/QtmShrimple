import express from "express";
import {
    getNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
} from "../controllers/notificationController.js";
import { protectedRoute } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", protectedRoute, getNotifications);
router.put("/read-all", protectedRoute, markAllAsRead);
router.put("/:id/read", protectedRoute, markAsRead);
router.delete("/all", protectedRoute, deleteAllNotifications);
router.delete("/", protectedRoute, deleteAllNotifications);
router.delete("/:id", protectedRoute, deleteNotification);

export default router;
