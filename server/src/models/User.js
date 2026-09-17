import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            unique: true,
            trim: true,
            lowercase: true,
            sparse: true, // Allow multiple users to have no username initially
        },
        password: {
            type: String,
            // Password is only required for local accounts
            required: function() {
                return !this.googleId;
            },
        },
        googleId: {
            type: String,
            unique: true,
            sparse: true,
        },
        isProfileComplete: {
            type: Boolean,
            default: false,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        displayName: {
            type: String,
            required: true,
            trim: true,
        },
        avatarURL: {
            type: String, // Link CDN (ví dụ Cloudinary)
            default: "",
        },
        avatarId: {
            type: String, // Cloudinary public_id (nếu muốn xóa ảnh)
            default: "",
        },
        bio: {
            type: String,
            trim: true,
            maxlength: 500,
            default: "",
        },
        phone: {
            type: String,
            sparse: true,
            match: [/^0\d{9}$/, "Số điện thoại không hợp lệ"], //  số VN
        },
        gender: {
            type: String,
            enum: ["male", "female", "other"],
            default: "other",
        },
        birthday: {
            type: Date,
        },
        location: {
            city: { type: String, trim: true, maxlength: 100, default: "" },
            country: { type: String, trim: true, maxlength: 100, default: "" },
            latitude: { type: Number, min: -90, max: 90 },
            longitude: { type: Number, min: -180, max: 180 },
        },
        status: {
            type: String,
            enum: ["online", "offline", "busy"],
            default: "offline",
        },
        lastActiveAt: {
            type: Date,
            default: Date.now,
        },
        savedPosts: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            default: []
        }],
        blockedUsers: [{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: []
        }],
        antiPeepData: {
            isEnabled: { type: Boolean, default: false },
            faceDescriptor: { type: [Number], default: [] },
            pin: { type: String, default: "" }
        },
        settings: {
            soundEnabled: { type: Boolean, default: true },
            desktopNotifications: { type: Boolean, default: false }
        },
        privacy: {
            whoCanMessage: { type: String, enum: ["Everyone", "Friends", "Nobody"], default: "Everyone" },
            showBirthday: { type: Boolean, default: true },
            showOnlineStatus: { type: Boolean, default: true }
        }
    },
    {
        timestamps: true, // createdAt, updatedAt
    }
);

const User = mongoose.model("User", userSchema);
export default User;
