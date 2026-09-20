import React, { useEffect, useState, useRef, useMemo } from 'react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/PostsContainer.module.scss';
import { usePostStore } from '../../stores/usePostStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useChatStore } from '../../stores/useChatStore';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
    Image, 
    Video, 
    Menu, 
    Search, 
    Globe, 
    Users,
    Lock,
    ChevronDown,
    Check,
    X,
    Smile,
    Loader2,
    Bell
} from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'motion/react';
import PostItem from './PostItem';
import WhoToFollowWidget from './WhoToFollowWidget';
import TrendsWidget from './TrendsWidget';
import LoadingSpin from '../common/loading/LoadingSpin';
import default_avt from '../../../public/favicon.png';
import { friendService } from '../../services/friendService';

const cx = classNames.bind(styles);

const PostsContainer = () => {
    const { posts, fetchPosts, createPost, likePost, addComment, deletePost, isLoading, hasMorePosts } = usePostStore();
    const { user } = useAuthStore();
    const { friends } = useChatStore();
    const outletContext = useOutletContext() || {};
    const { toggleSidebar, onOpenNewChat } = outletContext;
    const navigate = useNavigate();

    // Active Tab: 'forYou' vs 'following'
    const [activeTab, setActiveTab] = useState('forYou');

    // Create Post State
    const [newPostContent, setNewPostContent] = useState('');
    const [newPostImages, setNewPostImages] = useState([]);
    const [newPostVideo, setNewPostVideo] = useState(null);
    const [newPostPrivacy, setNewPostPrivacy] = useState('public');
    const [isCreating, setIsCreating] = useState(false);

    // Search query for right sidebar
    const [searchQuery, setSearchQuery] = useState('');

    // Notifications Popover State
    const [showNotifPopover, setShowNotifPopover] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadNotifCount, setUnreadNotifCount] = useState(0);
    const notifRef = useRef(null);

    const fetchNotifications = React.useCallback(async () => {
        try {
            const data = await friendService.getFriendRequests();
            const received = data?.received || [];
            setNotifications(received);
            setUnreadNotifCount(received.length);
        } catch (err) {
            console.error("Failed to load notifications", err);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Close notification popover on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setShowNotifPopover(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAcceptFriend = async (requestId) => {
        try {
            await friendService.acceptRequest(requestId);
            fetchNotifications();
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeclineFriend = async (requestId) => {
        try {
            await friendService.declineRequest(requestId);
            fetchNotifications();
        } catch (err) {
            console.error(err);
        }
    };

    const observer = useRef(null);
    const lastPostElementRef = React.useCallback(node => {
        if (isLoading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMorePosts) {
                fetchPosts(false);
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoading, hasMorePosts, fetchPosts]);

    useEffect(() => {
        fetchPosts(true);
    }, [fetchPosts]);

    const handleCreatePost = async () => {
        if ((!newPostContent.trim() && newPostImages.length === 0 && !newPostVideo) || isCreating) return;

        setIsCreating(true);
        try {
            await createPost({ 
                content: newPostContent.trim(), 
                images: newPostImages,
                video: newPostVideo,
                privacy: newPostPrivacy 
            });
            setNewPostContent('');
            setNewPostImages([]);
            setNewPostVideo(null);
            setNewPostPrivacy('public');
        } catch (error) {
            console.error("Error creating post:", error);
        } finally {
            setIsCreating(false);
        }
    };

    // Filter posts for 'following' tab
    const filteredPosts = useMemo(() => {
        if (activeTab === 'forYou') return posts;
        const friendIds = new Set((friends || []).map(f => f && f._id));
        return posts.filter(p => {
            const authorId = p.author?._id;
            return authorId === user?._id || friendIds.has(authorId);
        });
    }, [posts, activeTab, friends, user]);

    return (
        <div className={cx('feed-page-layout')}>
            {/* Center Main Column: X Timeline */}
            <main className={cx('main-timeline-col')}>
                {/* 1. Sticky X Header with Tabs */}
                <header className={cx('x-feed-header')}>
                    {/* Top Bar for Mobile */}
                    <div className={cx('mobile-top-bar')}>
                        <button
                            type="button"
                            className={cx('mobile-avatar-btn')}
                            onClick={toggleSidebar}
                            aria-label="Mở menu"
                        >
                            <img 
                                src={user?.avatarURL || default_avt} 
                                alt="avatar" 
                                className={cx('mobile-avatar-img')}
                                onError={(e) => { e.currentTarget.src = default_avt; }}
                            />
                        </button>

                        <div className={cx('mobile-brand')}>
                            <img src="/logo_remove_bg.png" alt="Shrimple" className={cx('mobile-shrimple-logo')} />
                        </div>

                        <div className={cx('mobile-placeholder-spacer')} />
                    </div>

                    {/* Dual Tabs: For You / Following */}
                    <div className={cx('tabs-row')}>
                        <button
                            type="button"
                            className={cx('tab-item', { active: activeTab === 'forYou' })}
                            onClick={() => setActiveTab('forYou')}
                        >
                            <span className={cx('tab-label')}>Dành cho bạn</span>
                            {activeTab === 'forYou' && (
                                <Motion.div 
                                    className={cx('active-tab-bar')} 
                                    layoutId="feedActiveTabIndicator" 
                                />
                            )}
                        </button>

                        <button
                            type="button"
                            className={cx('tab-item', { active: activeTab === 'following' })}
                            onClick={() => setActiveTab('following')}
                        >
                            <span className={cx('tab-label')}>Đang theo dõi</span>
                            {activeTab === 'following' && (
                                <Motion.div 
                                    className={cx('active-tab-bar')} 
                                    layoutId="feedActiveTabIndicator" 
                                />
                            )}
                        </button>
                    </div>
                </header>

                {/* 2. X Tweet Composer */}
                <XPostComposer
                    user={user}
                    content={newPostContent}
                    setContent={setNewPostContent}
                    images={newPostImages}
                    setImages={setNewPostImages}
                    video={newPostVideo}
                    setVideo={setNewPostVideo}
                    privacy={newPostPrivacy}
                    setPrivacy={setNewPostPrivacy}
                    onSubmit={handleCreatePost}
                    isCreating={isCreating}
                />

                {/* 3. Posts Stream */}
                <div className={cx('posts-stream')}>
                    {filteredPosts.map((post, index) => {
                        const isLast = filteredPosts.length === index + 1;
                        return (
                            <div 
                                key={post._id || index}
                                ref={isLast ? lastPostElementRef : null}
                            >
                                <PostItem
                                    post={post}
                                    currentUser={user}
                                    onLike={likePost}
                                    onComment={addComment}
                                    onDelete={deletePost}
                                />
                            </div>
                        );
                    })}

                    {/* Loading State */}
                    {isLoading && (
                        <div className={cx('feed-loading-box')}>
                            <LoadingSpin size={30} />
                        </div>
                    )}

                    {/* Empty State */}
                    {!isLoading && filteredPosts.length === 0 && (
                        <div className={cx('empty-timeline-box')}>
                            <h3 className={cx('empty-timeline-title')}>
                                {activeTab === 'following' 
                                    ? "Chưa có bài viết từ người đang theo dõi" 
                                    : "Bảng tin chưa có bài viết"}
                            </h3>
                            <p className={cx('empty-timeline-desc')}>
                                {activeTab === 'following'
                                    ? "Hãy kết nối thêm bạn bè hoặc chuyển sang tab 'Dành cho bạn' để khám phá những điều mới mẻ!"
                                    : "Hãy là người đầu tiên chia sẻ suy nghĩ của bạn với cộng đồng Shrimple!"}
                            </p>
                        </div>
                    )}

                    {/* End of Feed Message */}
                    {!hasMorePosts && filteredPosts.length > 0 && (
                        <div className={cx('end-of-feed-box')}>
                            <span>Bạn đã xem hết các bài viết mới nhất!</span>
                        </div>
                    )}
                </div>
            </main>

            {/* Right Column: Widgets Sidebar (Desktop >= 1024px) */}
            <aside className={cx('feed-widgets-col')}>
                <div className={cx('widgets-sticky-wrapper')}>
                    {/* Top Row: Notifications Button (nằm bên trái) + Search Bar */}
                    <div className={cx('widgets-top-row')}>
                        <div className={cx('notif-wrapper')} ref={notifRef}>
                            <button
                                type="button"
                                className={cx('widgets-notif-btn', { active: showNotifPopover })}
                                onClick={() => setShowNotifPopover(!showNotifPopover)}
                                title="Thông báo"
                                aria-label="Thông báo"
                            >
                                <Bell size={19} />
                                {unreadNotifCount > 0 && (
                                    <span className={cx('notif-badge')}>
                                        {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                                    </span>
                                )}
                            </button>

                            {/* Notifications Popover */}
                            <AnimatePresence>
                                {showNotifPopover && (
                                    <Motion.div 
                                        className={cx('widgets-notif-popover')}
                                        initial={{ opacity: 0, y: -8, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: -8, scale: 0.95 }}
                                        transition={{ duration: 0.15 }}
                                    >
                                        <div className={cx('notif-popover-header')}>
                                            <div className={cx('notif-popover-title')}>Thông báo</div>
                                            {notifications.length > 0 && (
                                                <button
                                                    type="button"
                                                    className={cx('notif-mark-read-btn')}
                                                    onClick={() => setUnreadNotifCount(0)}
                                                >
                                                    Đã đọc tất cả
                                                </button>
                                            )}
                                        </div>

                                        <div className={cx('notif-popover-body')}>
                                            {notifications.length === 0 ? (
                                                <div className={cx('notif-empty-state')}>
                                                    <Bell size={28} className={cx('notif-empty-icon')} />
                                                    <p>Chưa có thông báo mới nào</p>
                                                    <small>Khi có tương tác hoặc lời mời kết bạn, bạn sẽ thấy ở đây.</small>
                                                </div>
                                            ) : (
                                                <div className={cx('notif-list')}>
                                                    {notifications.map((req) => {
                                                        const sender = req.sender || req.from || {};
                                                        const senderAvatar = sender.avatarURL || default_avt;
                                                        const senderName = sender.displayName || sender.username || 'Người dùng';
                                                        return (
                                                            <div key={req._id} className={cx('notif-item')}>
                                                                <img
                                                                    src={senderAvatar}
                                                                    alt={senderName}
                                                                    className={cx('notif-sender-avatar')}
                                                                    onError={(e) => { e.currentTarget.src = default_avt; }}
                                                                />
                                                                <div className={cx('notif-content')}>
                                                                    <div className={cx('notif-text')}>
                                                                        <strong>{senderName}</strong> đã gửi cho bạn một lời mời kết bạn.
                                                                    </div>
                                                                    <div className={cx('notif-actions')}>
                                                                        <button
                                                                            type="button"
                                                                            className={cx('notif-accept-btn')}
                                                                            onClick={() => handleAcceptFriend(req._id)}
                                                                        >
                                                                            Chấp nhận
                                                                        </button>
                                                                        <button
                                                                            type="button"
                                                                            className={cx('notif-decline-btn')}
                                                                            onClick={() => handleDeclineFriend(req._id)}
                                                                        >
                                                                            Từ chối
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </Motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Search Bar Capsule */}
                        <div className={cx('widgets-search-box')}>
                            <Search size={18} className={cx('search-icon')} />
                            <input
                                type="text"
                                placeholder="Tìm kiếm trên Shrimple..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={cx('search-input')}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    className={cx('search-clear-btn')}
                                    onClick={() => setSearchQuery('')}
                                >
                                    <X size={15} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Who To Follow Widget */}
                    <WhoToFollowWidget onOpenAddFriend={onOpenNewChat} />

                    {/* Trends Widget */}
                    <TrendsWidget />
                </div>
            </aside>
        </div>
    );
};

/* --- X Post Composer Component --- */
const XPostComposer = ({ 
    user, 
    content, 
    setContent, 
    images = [], 
    setImages, 
    video = null, 
    setVideo, 
    privacy = 'public', 
    setPrivacy, 
    onSubmit, 
    isCreating 
}) => {
    const imageInputRef = useRef(null);
    const videoInputRef = useRef(null);
    const textareaRef = useRef(null);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [videoPreview, setVideoPreview] = useState(null);
    const [showPrivacyMenu, setShowPrivacyMenu] = useState(false);
    const privacyMenuRef = useRef(null);

    // Close privacy menu on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (privacyMenuRef.current && !privacyMenuRef.current.contains(e.target)) {
                setShowPrivacyMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Manage image previews
    useEffect(() => {
        if (!images || images.length === 0) {
            setImagePreviews([]);
            return;
        }
        const urls = images.map(file => URL.createObjectURL(file));
        setImagePreviews(urls);
        return () => urls.forEach(url => URL.revokeObjectURL(url));
    }, [images]);

    // Manage video preview
    useEffect(() => {
        if (!video) {
            setVideoPreview(null);
            return;
        }
        const url = URL.createObjectURL(video);
        setVideoPreview(url);
        return () => URL.revokeObjectURL(url);
    }, [video]);

    const privacyConfig = {
        public: { label: "Công khai", desc: "Mọi người đều có thể xem bài viết này", icon: Globe },
        friends: { label: "Bạn bè", desc: "Chỉ bạn bè mới có thể xem bài viết này", icon: Users },
        private: { label: "Chỉ mình tôi", desc: "Chỉ bạn mới có thể xem bài viết này", icon: Lock },
    };

    const CurrentIcon = privacyConfig[privacy]?.icon || Globe;

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        // Can only upload images when no video is attached
        if (video) setVideo(null);

        setImages(prev => {
            const combined = [...prev, ...files];
            if (combined.length > 4) {
                toast.info("Tối đa 4 hình ảnh cho mỗi bài viết");
            }
            return combined.slice(0, 4);
        });

        if (imageInputRef.current) imageInputRef.current.value = "";
    };

    const handleVideoChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Clear images if video chosen
        if (images.length > 0) setImages([]);
        setVideo(file);

        if (videoInputRef.current) videoInputRef.current.value = "";
    };

    const handleRemoveImage = (indexToRemove) => {
        setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
    };

    const handleRemoveVideo = () => {
        setVideo(null);
    };

    // Auto-adjust textarea height
    const handleTextChange = (e) => {
        setContent(e.target.value);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.max(60, textareaRef.current.scrollHeight)}px`;
        }
    };

    const canPost = (content.trim().length > 0 || images.length > 0 || video) && !isCreating;

    return (
        <div className={cx('x-composer-box')}>
            <div className={cx('composer-left')}>
                <img
                    src={user?.avatarURL || default_avt}
                    alt="avatar"
                    className={cx('composer-avatar')}
                    onError={(e) => { e.currentTarget.src = default_avt; }}
                />
            </div>

            <div className={cx('composer-right')}>
                {/* Textarea */}
                <textarea
                    ref={textareaRef}
                    data-composer-input="true"
                    placeholder="Chuyện gì đang xảy ra?!"
                    value={content}
                    onChange={handleTextChange}
                    rows={2}
                    className={cx('composer-textarea')}
                    disabled={isCreating}
                />

                {/* Multiple Images Preview Grid */}
                {imagePreviews.length > 0 && (
                    <div className={cx('composer-images-grid', `grid-${Math.min(imagePreviews.length, 4)}`)}>
                        {imagePreviews.map((url, idx) => (
                            <div key={idx} className={cx('composer-img-cell')}>
                                <img src={url} alt={`Upload ${idx + 1}`} className={cx('composer-cell-img')} />
                                <button
                                    type="button"
                                    className={cx('cell-remove-btn')}
                                    onClick={() => handleRemoveImage(idx)}
                                    title="Xóa hình ảnh này"
                                >
                                    <X size={15} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Video Preview Box */}
                {videoPreview && (
                    <div className={cx('composer-preview-container')}>
                        <video src={videoPreview} controls className={cx('composer-preview-video')} />
                        <button
                            type="button"
                            className={cx('preview-remove-btn')}
                            onClick={handleRemoveVideo}
                            title="Xóa video"
                        >
                            <X size={16} />
                        </button>
                    </div>
                )}

                {/* Audience / Privacy Pill & Popover */}
                <div className={cx('composer-audience-wrapper')} ref={privacyMenuRef}>
                    <button
                        type="button"
                        className={cx('composer-audience-pill')}
                        onClick={() => setShowPrivacyMenu(!showPrivacyMenu)}
                        title="Chọn quyền riêng tư bài viết"
                    >
                        <CurrentIcon size={14} className={cx('globe-icon')} />
                        <span>{privacyConfig[privacy]?.label || "Công khai"}</span>
                        <ChevronDown size={13} className={cx('chevron-icon')} />
                    </button>

                    <AnimatePresence>
                        {showPrivacyMenu && (
                            <Motion.div
                                className={cx('composer-privacy-menu')}
                                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -6, scale: 0.96 }}
                                transition={{ duration: 0.15 }}
                            >
                                <div className={cx('privacy-menu-title')}>Ai có thể xem bài viết này?</div>
                                {Object.entries(privacyConfig).map(([key, item]) => {
                                    const ItemIcon = item.icon;
                                    const isSelected = privacy === key;
                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            className={cx('privacy-item', { active: isSelected })}
                                            onClick={() => {
                                                if (setPrivacy) setPrivacy(key);
                                                setShowPrivacyMenu(false);
                                            }}
                                        >
                                            <div className={cx('privacy-icon-box')}>
                                                <ItemIcon size={16} />
                                            </div>
                                            <div className={cx('privacy-info')}>
                                                <div className={cx('privacy-label')}>{item.label}</div>
                                                <div className={cx('privacy-desc')}>{item.desc}</div>
                                            </div>
                                            {isSelected && <Check size={16} className={cx('privacy-check-icon')} />}
                                        </button>
                                    );
                                })}
                            </Motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className={cx('composer-divider')} />

                {/* Bottom Action Bar */}
                <div className={cx('composer-toolbar')}>
                    <div className={cx('toolbar-icons')}>
                        <button
                            type="button"
                            className={cx('toolbar-btn', { active: images.length > 0 })}
                            onClick={() => imageInputRef.current?.click()}
                            title="Thêm ảnh (tối đa 4 ảnh)"
                            disabled={isCreating || !!video || images.length >= 4}
                        >
                            <Image size={19} />
                        </button>

                        <button
                            type="button"
                            className={cx('toolbar-btn', { active: !!video })}
                            onClick={() => videoInputRef.current?.click()}
                            title="Thêm video"
                            disabled={isCreating || images.length > 0 || !!video}
                        >
                            <Video size={19} />
                        </button>

                        <input
                            type="file"
                            ref={imageInputRef}
                            onChange={handleImageChange}
                            accept="image/*"
                            multiple
                            style={{ display: 'none' }}
                        />

                        <input
                            type="file"
                            ref={videoInputRef}
                            onChange={handleVideoChange}
                            accept="video/*"
                            style={{ display: 'none' }}
                        />
                    </div>

                    <div className={cx('composer-submit-col')}>
                        <Motion.button
                            whileHover={canPost ? { scale: 1.03 } : undefined}
                            whileTap={canPost ? { scale: 0.97 } : undefined}
                            type="button"
                            className={cx('x-post-submit-btn', { disabled: !canPost })}
                            onClick={onSubmit}
                            disabled={!canPost}
                        >
                            {isCreating ? (
                                <Loader2 size={16} className={cx('btn-spinner')} />
                            ) : (
                                <span>Đăng</span>
                            )}
                        </Motion.button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PostsContainer;
