import React, { useState, useEffect, useRef } from 'react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/PostsContainer.module.scss'; // Reusing styles for now
import { usePostStore } from '../../stores/usePostStore';
import { Heart, MessageCircle, Trash2, MoreHorizontal, Bookmark, EyeOff, Flag, Link as LinkIcon, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import default_avt from "../../../public/favicon.png";
import PostDetailModal from './PostDetailModal';
import PostCommentItem from './PostCommentItem';

const cx = classNames.bind(styles);

const PostItem = ({ post, currentUser, onLike, onComment, onDelete }) => {
    const { toggleSavePost } = usePostStore();
    const [commentText, setCommentText] = useState('');
    const [showComments, setShowComments] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const optionsRef = useRef(null);
    const navigate = useNavigate();

    // Close options menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (optionsRef.current && !optionsRef.current.contains(event.target)) {
                setShowOptions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const isLiked = post.likes.includes(currentUser?._id);

    // Check if saved
    const isSaved = currentUser?.savedPosts?.some(
        saved => (typeof saved === 'string' ? saved : saved?._id) === post._id
    );

    const handleComment = async (e) => {
        if (e.key === 'Enter' && commentText.trim()) {
            await onComment(post._id, commentText);
            setCommentText('');
        }
    };

    const handleDelete = () => {
        if (window.confirm("Are you sure you want to delete this post?")) {
            onDelete(post._id);
        }
        setShowOptions(false);
    }

    const handleCopyLink = () => {
        navigator.clipboard.writeText(`${window.location.origin}/post/${post._id}`);
        toast.success("Link copied to clipboard");
        setShowOptions(false);
    };

    const handleHidePost = () => {
        toast.info("Post hidden. We'll show fewer posts like this.");
        setShowOptions(false);
    };

    const handleReportPost = () => {
        toast.info("Thank you for reporting this post.");
        setShowOptions(false);
    };

    const handleSavePost = async () => {
        await toggleSavePost(post._id);
        setShowOptions(false);
    };

    const handleUserClick = (userId) => {
        if (userId) {
            navigate(`/feed/profile/${userId}`);
        }
    };

    return (
        <div className={cx('post-item')}>
            <div className={cx('post-header')}>
                <img
                    src={post.author?.avatarURL ? (post.author.avatarURL.startsWith('http') ? post.author.avatarURL : `http://localhost:5001${post.author.avatarURL}`) : default_avt}
                    alt="avatar"
                    onClick={() => handleUserClick(post.author?._id)}
                    style={{ cursor: 'pointer' }}
                    onError={(e) => { e.target.src = default_avt }}
                />
                <div className={cx('user-info')} onClick={() => handleUserClick(post.author?._id)} style={{ cursor: 'pointer' }}>
                    <h4>{post.author?.displayName || post.author?.username}</h4>
                    <span>{new Date(post.createdAt).toLocaleString()}</span>
                </div>

                <div className={cx('more-options-wrapper')} ref={optionsRef}>
                    <button className={cx('more-btn')} onClick={() => setShowOptions(!showOptions)}>
                        <MoreHorizontal size={20} />
                    </button>

                    {showOptions && (
                        <div className={cx('options-menu')}>
                            <button className={cx('menu-option')} onClick={handleSavePost}>
                                <Bookmark size={16} fill={isSaved ? "currentColor" : "none"} />
                                <span>{isSaved ? "Unsave Post" : "Save Post"}</span>
                            </button>

                            <button className={cx('menu-option')} onClick={handleCopyLink}>
                                <LinkIcon size={16} />
                                <span>Copy Link</span>
                            </button>

                            <button className={cx('menu-option')} onClick={handleHidePost}>
                                <EyeOff size={16} />
                                <span>Not interested</span>
                            </button>

                            <button className={cx('menu-option')} onClick={handleReportPost}>
                                <Flag size={16} />
                                <span>Report Post</span>
                            </button>

                            {post.author?._id === currentUser?._id && (
                                <>
                                    <div className={cx('menu-separator')}></div>
                                    <button className={cx('menu-option')} onClick={() => { toast.info('Edit feature coming soon'); setShowOptions(false); }}>
                                        <Edit size={16} />
                                        <span>Edit Post</span>
                                    </button>
                                    <button className={cx('menu-option', 'delete-option')} onClick={handleDelete}>
                                        <Trash2 size={16} />
                                        <span>Move to trash</span>
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className={cx('post-content')}>
                {post.content}
            </div>

            {post.image && (
                <img
                    src={post.image.startsWith('http') ? post.image : `http://localhost:5001${post.image}`}
                    alt="post content"
                    className={cx('post-image')}
                    onClick={() => setIsDetailOpen(true)}
                    style={{ cursor: 'pointer' }}
                />
            )}

            {post.video && (
                <video
                    controls
                    src={post.video.startsWith('http') ? post.video : `http://localhost:5001${post.video}`}
                    className={cx('post-image')}
                />
            )}

            <div className={cx('post-actions')}>
                <button className={cx({ liked: isLiked })} onClick={() => onLike(post._id)}>
                    <Heart size={20} fill={isLiked ? 'currentColor' : 'none'} />
                    <span>{post.likes.length} Likes</span>
                </button>
                <button onClick={() => setShowComments(!showComments)}>
                    <MessageCircle size={20} />
                    <span>{post.comments.length} Comments</span>
                </button>
            </div>

            {showComments && (
                <div className={cx('comments-section')}>
                    <div className={cx('comment-input')}>
                        <input
                            type="text"
                            placeholder="Write a comment..."
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            onKeyDown={handleComment}
                        />
                    </div>
                    <div className={cx('comment-list')}>
                        {post.comments.map((comment, index) => (
                            <PostCommentItem key={index} comment={comment} postId={post._id} />
                        ))}
                    </div>
                </div>
            )}

            <PostDetailModal open={isDetailOpen} post={post} onClose={() => setIsDetailOpen(false)} />
        </div>
    );
};

export default PostItem;
