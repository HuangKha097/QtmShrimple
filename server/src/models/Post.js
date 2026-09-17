import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
    {
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        content: {
            type: String,
            trim: true,
            maxlength: 2000,
        },
        image: {
            type: String, // Single image for now or use array if needed. User pattern implies simple strings often.
            default: "",
        },
        video: {
            type: String,
            default: "",
        },
        likes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
        comments: [
            {
                text: String,
                created: { type: Date, default: Date.now },
                postedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                },
                reactions: [
                    {
                        userId: {
                            type: mongoose.Schema.Types.ObjectId,
                            ref: "User",
                        },
                        reaction: String,
                    },
                ],
                replies: [
                    {
                        text: String,
                        created: { type: Date, default: Date.now },
                        postedBy: {
                            type: mongoose.Schema.Types.ObjectId,
                            ref: "User",
                        },
                        reactions: [
                            {
                                userId: {
                                    type: mongoose.Schema.Types.ObjectId,
                                    ref: "User",
                                },
                                reaction: String,
                            },
                        ],
                    },
                ],
            },
        ],
    },
    { timestamps: true }
);

const Post = mongoose.model("Post", postSchema);
export default Post;
