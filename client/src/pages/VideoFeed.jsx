import MotionPresence from '../components/common/MotionPresence';
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { usePostStore } from '../stores/usePostStore';
import styles from '../assets/css/VideoFeed.module.scss';
import classNames from 'classnames/bind';
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Send, X, Menu, ChevronLeft, MoreHorizontal, Trash2, Flag, Upload } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import VideoUploadModal from '../components/posts/VideoUploadModal';
import { toast } from 'sonner';

const cx = classNames.bind(styles);

const VideoItem = ({ post, isActive, toggleLike, toggleMute, isMuted, volume, onVolumeChange, onDelete }) => {
    const videoRef = useRef(null);
    const { user } = useAuthStore();
    const navigate = useNavigate();

    const [showComments, setShowComments] = useState(false);
    const [showOptions, setShowOptions] = useState(false); // For local options state

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isActive) {
            video.volume = isMuted ? 0 : volume;

            // Should play
            const playVideo = async () => {
                try {
                    await video.play();
                } catch (err) {
                    console.log("Autoplay prevented:", err);
                }
            };

            playVideo();

        } else {
            video.pause();
            video.currentTime = 0; // Reset time
        }

        if (video) video.volume = isMuted ? 0 : volume;

    }, [isActive, isMuted, volume]);

    const handleVolumeChange = (e) => {
        e.stopPropagation();
        const newVol = parseFloat(e.target.value);
        onVolumeChange(newVol);
    };

    const handleShare = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(`${window.location.origin}/post/${post._id}`);
        toast.success("Link copied to clipboard");
    };

    const isLiked = post.likes && post.likes.includes(user?._id);

    const handleVolumeWheel = (e) => {
        e.stopPropagation();
        const step = 0.05;
        const currentVol = isMuted ? 0 : volume;
        const delta = e.deltaY > 0 ? -step : step;
        const newVol = Math.min(Math.max(currentVol + delta, 0), 0.5);
        onVolumeChange(newVol);
    };

    const isOwner = user?._id === post.author?._id;

    const handleDelete = async (e) => {
        e.stopPropagation();
        if (confirm("Are you sure you want to delete this video?")) {
            await onDelete(post._id);
            // Optionally close drawer? Parent handles state update
            setShowOptions(false);
        }
    }

    return (
        <>
            <video
                ref={videoRef}
                className={cx('video-player')}
                loop
                muted={isMuted}
                playsInline
                onClick={toggleMute}
                preload="auto"
            >
                <source src={post.video.startsWith('http') ? post.video : `http://localhost:5001${post.video}`} type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            {/* Overlay */}
            <div className={cx('video-overlay')}>
                <div
                    className={cx('author-info')}
                    onClick={() => navigate(`/feed/profile/${post.author?._id}`)}
                >
                    <img src={post.author?.avatarURL ? (post.author.avatarURL.startsWith('http') ? post.author.avatarURL : `http://localhost:5001${post.author.avatarURL}`) : "/favicon.png"} alt="user" onError={(e) => { e.target.src = "/favicon.png" }} />
                    <span>{post.author?.displayName || post.author?.username}</span>
                </div>
                <p className={cx('content-text')}>{post.content}</p>
            </div>

            {/* Actions */}
            <div className={cx('actions-bar')}>
                <button aria-label={isLiked ? "Unlike video" : "Like video"} aria-pressed={Boolean(isLiked)} className={cx('action-btn')} onClick={(e) => { e.stopPropagation(); toggleLike(post._id); }}>
                    <Heart fill={isLiked ? "#fe2c55" : "rgba(255,255,255,0.2)"} color={isLiked ? "#fe2c55" : "white"} className={cx({ 'liked-anim': isLiked })} />
                    <span>{post.likes?.length || 0}</span>
                </button>
                <button aria-label="Open comments" className={cx('action-btn')} onClick={(e) => { e.stopPropagation(); setShowComments(true); }}>
                    <MessageCircle color="white" fill="rgba(255,255,255,0.2)" />
                    <span>{post.comments?.length || 0}</span>
                </button>
                <button className={cx('action-btn')} onClick={handleShare}>
                    <Share2 color="white" fill="rgba(255,255,255,0.2)" />
                    <span>Share</span>
                </button>

                <div className={cx('more-options-wrapper')} onClick={e => e.stopPropagation()}>
                    <button aria-label="Video options" aria-expanded={showOptions} className={cx('action-btn')} onClick={() => setShowOptions(!showOptions)}>
                        <MoreHorizontal color="white" />
                    </button>
                    {showOptions && (
                        <div className={cx('options-popup')}>
                            {isOwner ? (
                                <button className={cx('option-item', 'delete')} onClick={handleDelete}>
                                    <Trash2 size={18} />
                                    <span>Delete</span>
                                </button>
                            ) : (
                                <button className={cx('option-item')} onClick={() => { alert('Reported!'); setShowOptions(false); }}>
                                    <Flag size={18} />
                                    <span>Report</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div
                    className={cx('volume-control-wrapper')}
                    onClick={(e) => e.stopPropagation()}
                    onWheel={handleVolumeWheel}
                >
                    <div className={cx('volume-slider-container')}>
                        <input
                            type="range"
                            min="0"
                            max="0.5"
                            step="0.05"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            aria-label="Video volume"
                            className={cx('vertical-slider')}
                        />
                    </div>
                    <button aria-label={isMuted ? "Unmute video" : "Mute video"} className={cx('action-btn')} onClick={(e) => { e.stopPropagation(); toggleMute(); }}>
                        {isMuted || volume === 0 ? <VolumeX color="white" /> : <Volume2 color="white" />}
                    </button>
                </div>
            </div>

            {/* Comments Modal / Drawer for this specific video */}
            <CommentsDrawer open={showComments} post={post} onClose={() => setShowComments(false)} />
        </>
    );
};

const VideoFeed = () => {
    const { videoPosts, fetchVideoFeed, likePost, deletePost, hasMoreVideos } = usePostStore();
    // Default to no-op function if context is missing (e.g. standalone test)
    const { toggleSidebar, isSidebarOpen = true } = useOutletContext() || { toggleSidebar: () => { }, isSidebarOpen: true };
    const [activePostId, setActivePostId] = useState(() => {
        return sessionStorage.getItem('last_active_video_id') || null;
    });

    const [isScrollRestored, setIsScrollRestored] = useState(() => {
        // If no saved ID, we are "restored" (ready) immediately
        return !sessionStorage.getItem('last_active_video_id');
    });

    // Initialize from LocalStorage or Default
    const [isMuted, setIsMuted] = useState(() => {
        const saved = localStorage.getItem('video_muted');
        return saved ? JSON.parse(saved) : false;
    });

    const [volume, setVolume] = useState(() => {
        const saved = localStorage.getItem('video_volume');
        return saved ? parseFloat(saved) : 0.5;
    });

    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const restoreTargetId = useRef(activePostId);
    const observer = useRef(null);
    const containerRef = useRef(null);
    const isLoadingRef = useRef(false);

    // Save to LocalStorage whenever they change
    useEffect(() => {
        localStorage.setItem('video_muted', JSON.stringify(isMuted));
    }, [isMuted]);

    useEffect(() => {
        localStorage.setItem('video_volume', volume.toString());
    }, [volume]);

    const toggleMute = () => {
        setIsMuted(prev => !prev);
    };

    const handleVolumeChangeGlobal = (newVol) => {
        setVolume(newVol);
        if (newVol > 0 && isMuted) setIsMuted(false);
        if (newVol === 0 && !isMuted) setIsMuted(true);
    };

    // 1. Fetch only if empty
    useEffect(() => {
        if (videoPosts.length === 0) {
            fetchVideoFeed(true); // Initial load
        }
    }, [fetchVideoFeed, videoPosts.length]);

    // Restore once after data arrives; subsequent pagination must not jump the feed.
    useEffect(() => {
        if (!videoPosts.length || !restoreTargetId.current) return;
        const timeout = setTimeout(() => {
            const element = Array.from(containerRef.current?.querySelectorAll('[data-id]') || [])
                .find(item => item.dataset.id === restoreTargetId.current);
            element?.scrollIntoView({ block: 'center', behavior: 'auto' });
            restoreTargetId.current = null;
            setIsScrollRestored(true);
        }, 100);
        return () => clearTimeout(timeout);
    }, [videoPosts.length]);

    // Intersection Observer logic
    useEffect(() => {
        const options = {
            root: containerRef.current,
            rootMargin: '0px',
            threshold: 0.6
        };

        const handleIntersect = (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const id = entry.target.getAttribute('data-id');
                    setActivePostId(id);
                    sessionStorage.setItem('last_active_video_id', id);
                }
            });
        };

        observer.current = new IntersectionObserver(handleIntersect, options);

        // Immediate observation
        const elements = containerRef.current?.querySelectorAll('[data-id]') || [];
        elements.forEach(el => observer.current.observe(el));

        return () => {
            observer.current?.disconnect();
        }
    }, [videoPosts]); // Re-run observer when posts change

    const handleScroll = async (e) => {
        const bottom = Math.abs(e.target.scrollHeight - e.target.scrollTop - e.target.clientHeight) < 300;
        if (bottom && hasMoreVideos && !isLoadingRef.current) {
            isLoadingRef.current = true;
            await fetchVideoFeed(false);
            isLoadingRef.current = false;
        }
    };

    if (!videoPosts || videoPosts.length === 0) {
        return (
            <div className={cx('local-video-feed-container', 'empty-feed')} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: '1rem' }}>
                <button className={cx('sidebar-toggle-btn')} onClick={toggleSidebar} aria-label="Open navigation">
                    <Menu className={cx('icon-mobile')} size={24} />
                    <ChevronLeft className={cx('icon-desktop')} size={24} />
                </button>
                <p>No videos available. Upload a video to get started!</p>
                <button className={cx('floating-upload-btn', 'static-btn')} onClick={() => setIsUploadOpen(true)}>
                    Upload Video
                </button>
                <VideoUploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
            </div>
        );
    }

    return (
        <div className={cx('feed-wrapper')}>
            <button className={cx('sidebar-toggle-btn', { 'sidebar-closed': !isSidebarOpen })} onClick={toggleSidebar} aria-label="Open navigation">
                <Menu className={cx('icon-mobile')} size={24} />
                <ChevronLeft className={cx('icon-desktop')} size={24} />
            </button>
            <div
                className={cx('local-video-feed-container')}
                ref={containerRef}
                onScroll={handleScroll}
                style={{ opacity: isScrollRestored ? 1 : 0, transition: 'opacity 0.2s' }}
            >
                {videoPosts.map(post => (
                    <div key={post._id} data-id={post._id} className={cx('video-item', 'video-item-target')}>
                        <VideoItem
                            post={post}
                            isActive={isScrollRestored && activePostId === post._id}
                            toggleLike={likePost}
                            toggleMute={toggleMute}
                            isMuted={isMuted}
                            volume={volume}
                            onVolumeChange={handleVolumeChangeGlobal}
                            onDelete={deletePost}
                        />
                    </div>
                ))}

                {/* End of Feed Message */}
                <div className={cx('video-item', 'end-of-feed')}>
                    <p>You have watched all videos</p>
                    <p style={{ fontSize: '1.6rem', color: 'var(--text-muted)' }}>Post a video to watch more!</p>
                    <button className={cx('floating-upload-btn', 'static-btn')} onClick={() => setIsUploadOpen(true)}>
                        Upload Video
                    </button>
                </div>
            </div>

            <button className={cx('floating-upload-btn')} onClick={() => setIsUploadOpen(true)}>
                <Upload size={18} /><span>Upload video</span>
            </button>

            <VideoUploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
        </div>
    );
};


const VideoCommentItem = ({ comment, postId, currentUserId }) => {
    const { reactToComment, replyComment, reactToReply } = usePostStore();
    const [isReplying, setIsReplying] = useState(false);
    const [replyText, setReplyText] = useState("");
    const [showReplies, setShowReplies] = useState(false);

    const isLiked = comment.reactions?.some(r => r.userId === currentUserId && r.reaction === 'like');
    const likeCount = comment.reactions?.filter(r => r.reaction === 'like').length || 0;

    const handleLike = () => {
        reactToComment(postId, comment._id, "like");
    };

    const handleReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;
        await replyComment(postId, comment._id, replyText);
        setReplyText("");
        setIsReplying(false);
        setShowReplies(true); // Auto show replies
    };

    return (
        <div className={cx('comment-item-wrapper')}>
            <div className={cx('comment-item')}>
                <img src={comment.postedBy?.avatarURL ? (comment.postedBy.avatarURL.startsWith('http') ? comment.postedBy.avatarURL : `http://localhost:5001${comment.postedBy.avatarURL}`) : "/favicon.png"} alt="user" onError={(e) => { e.target.src = "/favicon.png" }} />
                <div className={cx('comment-content')}>
                    <span className={cx('comment-user')}>{comment.postedBy?.displayName || 'User'}</span>
                    <p>{comment.text}</p>
                    <div className={cx('comment-actions')}>
                        <span className={cx('comment-date')}>{new Date(comment.created).toLocaleDateString()}</span>
                        <button className={cx('text-btn', { liked: isLiked })} onClick={handleLike}>
                            {isLiked ? "Unlike" : "Like"} ({likeCount})
                        </button>
                        <button className={cx('text-btn')} onClick={() => setIsReplying(!isReplying)}>Reply</button>
                    </div>
                </div>
            </div>

            {/* Replies List */}
            {comment.replies && comment.replies.length > 0 && (
                <div className={cx('replies-section')}>
                    {!showReplies ? (
                        <button className={cx('view-replies-btn')} onClick={() => setShowReplies(true)}>
                            View {comment.replies.length} replies
                        </button>
                    ) : (
                        <div className={cx('replies-list')}>
                            {comment.replies.map((reply, ridx) => {
                                const isReplyLiked = reply.reactions?.some(r => r.userId === currentUserId && r.reaction === 'like');
                                const replyLikeCount = reply.reactions?.filter(r => r.reaction === 'like').length || 0;

                                return (
                                    <div key={ridx} className={cx('comment-item', 'reply-item')}>
                                        <img src={reply.postedBy?.avatarURL ? (reply.postedBy.avatarURL.startsWith('http') ? reply.postedBy.avatarURL : `http://localhost:5001${reply.postedBy.avatarURL}`) : "/favicon.png"} alt="user" onError={(e) => { e.target.src = "/favicon.png" }} className={cx('small-avatar')} />
                                        <div className={cx('comment-content')}>
                                            <span className={cx('comment-user')}>{reply.postedBy?.displayName || 'User'}</span>
                                            <p>{reply.text}</p>
                                            <div className={cx('comment-actions')}>
                                                <span className={cx('comment-date')}>{new Date(reply.created).toLocaleDateString()}</span>
                                                <button className={cx('text-btn', { liked: isReplyLiked })} onClick={() => reactToReply(postId, comment._id, reply._id, "like")}>
                                                    {isReplyLiked ? "Unlike" : "Like"} ({replyLikeCount})
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                            <button className={cx('hide-replies-btn')} onClick={() => setShowReplies(false)}>Hide replies</button>
                        </div>
                    )}
                </div>
            )}

            {/* Reply Input */}
            {isReplying && (
                <form onSubmit={handleReply} className={cx('reply-form')}>
                    <input
                        type="text"
                        placeholder={`Reply to ${comment.postedBy?.displayName || 'user'}...`}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        autoFocus
                    />
                    <button type="submit" disabled={!replyText.trim()}>Send</button>
                </form>
            )}
        </div>
    );
}

const CommentsDrawer = ({ post, onClose, open }) => {
    const { addComment } = usePostStore();
    const { user } = useAuthStore();
    const [text, setText] = useState("");
    const commentsRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!text.trim()) return;

        await addComment(post._id, text);
        setText("");
        // Scroll to bottom
        setTimeout(() => {
            if (commentsRef.current) {
                commentsRef.current.scrollTop = commentsRef.current.scrollHeight;
            }
        }, 100);
    };

    return (
        <MotionPresence open={open} className={cx('comments-drawer-overlay')} onClick={onClose}>
            <div className={cx('comments-drawer')} onClick={e => e.stopPropagation()}>
                <div className={cx('drawer-header')}>
                    <h3>{post.comments?.length || 0} comments</h3>
                    <button onClick={onClose} aria-label="Close comments"><X size={20} /></button>
                </div>

                <div className={cx('drawer-body')} ref={commentsRef}>
                    {post.comments && post.comments.length > 0 ? (
                        post.comments.map((comment, idx) => (
                            <VideoCommentItem
                                key={idx}
                                comment={comment}
                                postId={post._id}
                                currentUserId={user?._id}
                            />
                        ))
                    ) : (
                        <div className={cx('no-comments')}>No comments yet. Be the first!</div>
                    )}
                </div>

                <form className={cx('drawer-footer')} onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="Add a comment..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                    />
                    <button type="submit" aria-label="Send comment" disabled={!text.trim()}>
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </MotionPresence>
    );
}

export default VideoFeed;
