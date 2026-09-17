import MotionPresence from '../common/MotionPresence';

import React, { useState, useRef } from 'react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/PostsContainer.module.scss';
import { usePostStore } from '../../stores/usePostStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { X, Send, Heart, MessageCircle } from 'lucide-react';
import PostCommentItem from './PostCommentItem';
import default_avt from "../../../public/favicon.png";

const cx = classNames.bind(styles);

const PostDetailModal = ({ post, onClose, open = true }) => {
    const { addComment, likePost } = usePostStore(); // likePost is still for the main post
    const { user: currentUser } = useAuthStore();
    const [commentText, setCommentText] = useState("");
    const commentsEndRef = useRef(null);

    const isLiked = post.likes.includes(currentUser?._id);

    const handleSendComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) return;
        await addComment(post._id, commentText);
        setCommentText("");
        // Scroll to bottom
        setTimeout(() => {
            commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    return (
        <MotionPresence open={open} className={cx('post-detail-overlay')} onClick={onClose}>
            <div className={cx('post-detail-modal')} onClick={e => e.stopPropagation()}>
                <button className={cx('close-btn')} onClick={onClose}><X size={24} color="white" /></button>

                <div className={cx('modal-left')}>
                    {post.image && (
                        <img
                            src={post.image.startsWith('http') ? post.image : `http://localhost:5001${post.image}`}
                            alt="Post detail"
                        />
                    )}
                    {post.video && (
                        <video controls src={post.video.startsWith('http') ? post.video : `http://localhost:5001${post.video}`} />
                    )}
                    {!post.image && !post.video && (
                        <div className={cx('text-only-display')}>
                            <p>{post.content}</p>
                        </div>
                    )}
                </div>

                <div className={cx('modal-right')}>
                    <div className={cx('modal-header')}>
                        <img
                            src={post.author?.avatarURL ? (post.author.avatarURL.startsWith('http') ? post.author.avatarURL : `http://localhost:5001${post.author.avatarURL}`) : default_avt}
                            alt="author"
                            className={cx('author-avatar')}
                            onError={(e) => { e.target.src = default_avt }}
                        />
                        <div className={cx('author-info')}>
                            <h4>{post.author?.displayName || 'User'}</h4>
                            <span>{post.content}</span>
                        </div>
                    </div>

                    <div className={cx('modal-comments-list')}>
                        {post.comments && post.comments.map((comment, idx) => (
                            <PostCommentItem key={idx} comment={comment} postId={post._id} />
                        ))}
                        <div ref={commentsEndRef} />
                    </div>

                    <div className={cx('modal-footer')}>
                        <div className={cx('post-stats')}>
                            <button className={cx('stat-btn', { liked: isLiked })} onClick={() => likePost(post._id)}>
                                <Heart size={24} />
                            </button>
                            <span className={cx('likes-count')}>{post.likes.length} likes</span>
                        </div>
                        <span className={cx('post-date')}>{new Date(post.createdAt).toLocaleString()}</span>

                        <form className={cx('modal-comment-input')} onSubmit={handleSendComment}>
                            <input
                                type="text"
                                placeholder="Add a comment..."
                                value={commentText}
                                onChange={e => setCommentText(e.target.value)}
                            />
                            <button type="submit" disabled={!commentText.trim()}><Send size={18} /></button>
                        </form>
                    </div>
                </div>
            </div>
        </MotionPresence>
    );
};

export default PostDetailModal;
