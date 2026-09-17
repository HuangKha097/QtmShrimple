
import React, { useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/PostsContainer.module.scss';
import { usePostStore } from '../../stores/usePostStore';
import { useAuthStore } from '../../stores/useAuthStore';
import default_avt from "../../../public/favicon.png";

const cx = classNames.bind(styles);
const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

const PostCommentItem = ({ comment, postId }) => {
    const { reactToComment, replyComment, reactToReply } = usePostStore();
    const { user: currentUser } = useAuthStore();

    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [showReplies, setShowReplies] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Helper to get user reaction if any
    const userReaction = comment.reactions?.find(r => r.userId === currentUser?._id);

    // Group reactions for display
    const reactionCounts = comment.reactions?.reduce((acc, curr) => {
        acc[curr.reaction] = (acc[curr.reaction] || 0) + 1;
        return acc;
    }, {});

    const handleReact = (emoji) => {
        reactToComment(postId, comment._id, emoji);
        setShowEmojiPicker(false);
    };

    const handleReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;
        await replyComment(postId, comment._id, replyText);
        setReplyText("");
        setIsReplying(false);
        setShowReplies(true);
    };

    return (
        <div className={cx('comment-item-wrapper')}>
            <div className={cx('comment')}>
                <img
                    src={comment.postedBy?.avatarURL ? (comment.postedBy.avatarURL.startsWith('http') ? comment.postedBy.avatarURL : `http://localhost:5001${comment.postedBy.avatarURL}`) : default_avt}
                    alt="avt"
                    className={cx('comment-avatar')}
                    onError={(e) => { e.target.src = default_avt }}
                />
                <div className={cx('comment-content-wrapper')}>
                    <div className={cx('comment-bubble')}>
                        <strong>{comment.postedBy?.displayName || 'User'}</strong>
                        <span style={{ marginLeft: '5px' }}>{comment.text}</span>
                    </div>

                    <div className={cx('comment-actions')}>
                        <span className={cx('comment-time')}>{new Date(comment.created).toLocaleDateString()}</span>

                        <div className={cx('reaction-wrapper')} onMouseLeave={() => setShowEmojiPicker(false)}>
                            <button
                                className={cx('action-text', { active: !!userReaction })}
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                onMouseEnter={() => setShowEmojiPicker(true)}
                            >
                                {userReaction ? userReaction.reaction : "Like"}
                            </button>

                            {showEmojiPicker && (
                                <div className={cx('mini-emoji-picker')} onMouseLeave={() => setShowEmojiPicker(false)}>
                                    {EMOJIS.map(emoji => (
                                        <span key={emoji} onClick={() => handleReact(emoji)}>{emoji}</span>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button className={cx('action-text')} onClick={() => setIsReplying(!isReplying)}>Reply</button>

                        {/* Display Reactions Count */}
                        {reactionCounts && Object.keys(reactionCounts).length > 0 && (
                            <div className={cx('reactions-count')}>
                                {Object.entries(reactionCounts).map(([emoji, count]) => (
                                    <span key={emoji}>{emoji}{count > 1 ? count : ''}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Nested Replies */}
            {comment.replies && comment.replies.length > 0 && (
                <div className={cx('replies-container')}>
                    {!showReplies ? (
                        <button className={cx('view-replies-btn')} onClick={() => setShowReplies(true)}>
                            View {comment.replies.length} replies
                        </button>
                    ) : (
                        <div className={cx('replies-list')}>
                            {comment.replies.map((reply, idx) => (
                                <PostReplyItem
                                    key={idx}
                                    reply={reply}
                                    postId={postId}
                                    commentId={comment._id}
                                    currentUser={currentUser}
                                    reactToReply={reactToReply}
                                />
                            ))}
                            <button className={cx('hide-replies-btn')} onClick={() => setShowReplies(false)}>Hide replies</button>
                        </div>
                    )}
                </div>
            )}

            {isReplying && (
                <form onSubmit={handleReply} className={cx('reply-input-form')}>
                    <input
                        type="text"
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        placeholder="Write a reply..."
                        autoFocus
                    />
                </form>
            )}
        </div>
    );
};

const PostReplyItem = ({ reply, postId, commentId, currentUser, reactToReply }) => {
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const userReaction = reply.reactions?.find(r => r.userId === currentUser?._id);

    const handleReact = (emoji) => {
        reactToReply(postId, commentId, reply._id, emoji);
        setShowEmojiPicker(false);
    };

    return (
        <div className={cx('comment', 'reply')}>
            <img
                src={reply.postedBy?.avatarURL ? (reply.postedBy.avatarURL.startsWith('http') ? reply.postedBy.avatarURL : `http://localhost:5001${reply.postedBy.avatarURL}`) : default_avt}
                alt="avt"
                className={cx('comment-avatar', 'small')}
                onError={(e) => { e.target.src = default_avt }}
            />
            <div className={cx('comment-content-wrapper')}>
                <div className={cx('comment-bubble')}>
                    <strong>{reply.postedBy?.displayName || 'User'}</strong>
                    <span style={{ marginLeft: '5px' }}>{reply.text}</span>
                </div>
                <div className={cx('comment-actions')}>
                    <span className={cx('comment-time')}>{new Date(reply.created).toLocaleDateString()}</span>

                    <div className={cx('reaction-wrapper')} onMouseLeave={() => setShowEmojiPicker(false)}>
                        <button
                            className={cx('action-text', { active: !!userReaction })}
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            onMouseEnter={() => setShowEmojiPicker(true)}
                        >
                            {userReaction ? userReaction.reaction : "Like"}
                        </button>
                        {showEmojiPicker && (
                            <div className={cx('mini-emoji-picker')}>
                                {EMOJIS.map(emoji => (
                                    <span key={emoji} onClick={() => handleReact(emoji)}>{emoji}</span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PostCommentItem;
