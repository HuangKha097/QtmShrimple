import MotionPresence from '../common/MotionPresence';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/PostsContainer.module.scss';
import { usePostStore } from '../../stores/usePostStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { X, Send, Heart, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import PostCommentItem from './PostCommentItem';
import default_avt from "../../../public/favicon.png";

const cx = classNames.bind(styles);

const PostDetailModal = ({ post, onClose, open = true, initialIndex = 0 }) => {
    const { addComment, likePost } = usePostStore(); // likePost is still for the main post
    const { user: currentUser } = useAuthStore();
    const [commentText, setCommentText] = useState("");
    const [activeIdx, setActiveIdx] = useState(initialIndex || 0);
    const commentsEndRef = useRef(null);

    const postImages = React.useMemo(() => {
        if (!post) return [];
        if (Array.isArray(post.images) && post.images.length > 0) {
            return post.images.filter(Boolean);
        }
        if (post.image) {
            return [post.image];
        }
        return [];
    }, [post]);

    useEffect(() => {
        setActiveIdx(initialIndex || 0);
    }, [initialIndex, open]);

    const handlePrev = (e) => {
        e.stopPropagation();
        setActiveIdx((prev) => (prev > 0 ? prev - 1 : postImages.length - 1));
    };

    const handleNext = (e) => {
        e.stopPropagation();
        setActiveIdx((prev) => (prev < postImages.length - 1 ? prev + 1 : 0));
    };

    const isLiked = Array.isArray(post?.likes) && post.likes.includes(currentUser?._id);

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

    if (!post) return null;

    const currentImage = postImages[activeIdx] || post.image;

    return (
        <MotionPresence open={open} className={cx('post-detail-overlay')} onClick={onClose}>
            <div className={cx('post-detail-modal')} onClick={e => e.stopPropagation()}>
                <button className={cx('close-btn')} onClick={onClose}><X size={24} color="white" /></button>

                <div className={cx('modal-left')}>
                    {currentImage && (
                        <div className={cx('modal-image-carousel')}>
                            <img
                                src={currentImage.startsWith('http') ? currentImage : `http://localhost:5001${currentImage}`}
                                alt="Post detail"
                                className={cx('modal-main-img')}
                            />

                            {postImages.length > 1 && (
                                <>
                                    <button 
                                        type="button" 
                                        className={cx('carousel-nav-btn', 'prev-btn')} 
                                        onClick={handlePrev}
                                        title="Ảnh trước"
                                    >
                                        <ChevronLeft size={24} />
                                    </button>
                                    <button 
                                        type="button" 
                                        className={cx('carousel-nav-btn', 'next-btn')} 
                                        onClick={handleNext}
                                        title="Ảnh kế tiếp"
                                    >
                                        <ChevronRight size={24} />
                                    </button>
                                    <div className={cx('carousel-counter')}>
                                        {activeIdx + 1} / {postImages.length}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    {!currentImage && post.video && (
                        <video controls src={post.video.startsWith('http') ? post.video : `http://localhost:5001${post.video}`} />
                    )}
                    {!currentImage && !post.video && (
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
