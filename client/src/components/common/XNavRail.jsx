import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { 
    MessageSquare, 
    Newspaper, 
    Video, 
    Bookmark, 
    Users, 
    User, 
    Settings, 
    LogOut,
    SquarePen,
    Feather,
    MoreHorizontal
} from 'lucide-react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/XNavRail.module.scss';
import { useAuthStore } from '../../stores/useAuthStore';
import { motion as Motion } from 'motion/react';
import defaultAvatar from '../../../public/favicon.png';
import { ASSET_BASE_URL } from '../../config/env';

const cx = classNames.bind(styles);

export default function XNavRail({ onCloseSetting, onOpenNewChat, onOpenPostModal }) {
    const { user, signOut } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const [showUserMenu, setShowUserMenu] = useState(false);

    const getAvatarSrc = (url) => {
        if (!url) return defaultAvatar;
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        return `${ASSET_BASE_URL}${url}`;
    };

    const handleLogout = async () => {
        if (confirm("Bạn có muốn đăng xuất không?")) {
            await signOut();
        }
    };

    const navItems = [
        { path: '/feed', icon: <Newspaper size={24} strokeWidth={2} />, label: 'Bảng tin' },
        { path: '/chat', icon: <MessageSquare size={24} strokeWidth={2} />, label: 'Tin nhắn' },
        { path: '/video', icon: <Video size={24} strokeWidth={2} />, label: 'Video' },
        { path: '/feed/friends', icon: <Users size={24} strokeWidth={2} />, label: 'Bạn bè' },
        { path: '/feed/saved', icon: <Bookmark size={24} strokeWidth={2} />, label: 'Đã lưu' },
        { path: `/feed/profile/${user?._id}`, icon: <User size={24} strokeWidth={2} />, label: 'Hồ sơ' },
    ];

    const handlePostClick = () => {
        if (onOpenPostModal) {
            onOpenPostModal();
        } else {
            navigate('/feed');
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                const textarea = document.querySelector('textarea[data-composer-input]');
                if (textarea) textarea.focus();
            }, 100);
        }
    };

    return (
        <aside className={cx('nav-rail')} aria-label="X Global Navigation">
            {/* Top: Logo Container (Always full text logo) */}
            <div className={cx('logo-container')}>
                <button 
                    type="button" 
                    className={cx('logo-btn', 'text-logo-btn')} 
                    onClick={() => navigate('/feed')}
                    title="Trang chủ Shrimple"
                    aria-label="Trang chủ"
                >
                    <div className={cx('text-logo-wrapper')}>
                        <img 
                            src="/logo_remove_bg.png" 
                            alt="Shrimple" 
                            className={cx('shrimple-text-logo')}
                        />
                    </div>
                </button>
            </div>

            {/* Middle: Navigation Links */}
            <nav className={cx('nav-links')}>
                {navItems.map((item) => {
                    const isActive = item.path === '/chat' 
                        ? location.pathname.startsWith('/chat') 
                        : (item.path === '/feed' ? location.pathname === '/feed' : location.pathname.startsWith(item.path));
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={cx('nav-item', { active: isActive })}
                            title={item.label}
                            aria-label={item.label}
                        >
                            <div className={cx('icon-wrapper')}>
                                {item.icon}
                            </div>
                            <span className={cx('nav-label')}>{item.label}</span>
                        </NavLink>
                    );
                })}

                {/* Settings Item */}
                <button
                    type="button"
                    className={cx('nav-item')}
                    onClick={onCloseSetting}
                    title="Cài đặt"
                    aria-label="Cài đặt"
                >
                    <div className={cx('icon-wrapper')}>
                        <Settings size={24} strokeWidth={2} />
                    </div>
                    <span className={cx('nav-label')}>Cài đặt</span>
                </button>

                {/* Post Action Button */}
                <Motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                    type="button"
                    className={cx('post-action-btn')}
                    onClick={handlePostClick}
                    title="Đăng bài viết mới"
                    aria-label="Đăng bài"
                >
                    <div className={cx('btn-shimmer')} aria-hidden="true" />
                    <span className={cx('post-btn-text')}>Đăng</span>
                    <Feather size={20} className={cx('post-btn-icon')} />
                </Motion.button>
            </nav>

            {/* Bottom: User Profile Card */}
            <div className={cx('bottom-container')}>
                <div className={cx('user-menu-wrapper')}>
                    <button
                        type="button"
                        className={cx('avatar-btn')}
                        onClick={() => setShowUserMenu(!showUserMenu)}
                        title={user?.displayName || "Tài khoản"}
                        aria-label="User menu"
                    >
                        <img 
                            src={getAvatarSrc(user?.avatarURL)} 
                            alt={user?.displayName || "User"} 
                            className={cx('avatar-img')}
                            onError={(e) => { e.target.src = defaultAvatar; }}
                        />
                        <div className={cx('user-pill-details')}>
                            <span className={cx('user-pill-name')}>{user?.displayName || 'User'}</span>
                            <span className={cx('user-pill-handle')}>@{user?.username || 'user'}</span>
                        </div>
                        <MoreHorizontal size={18} className={cx('user-pill-more')} />
                    </button>

                    {showUserMenu && (
                        <>
                            <div className={cx('menu-backdrop')} onClick={() => setShowUserMenu(false)} />
                            <div className={cx('user-popover')}>
                                <div className={cx('user-info-row')}>
                                    <img 
                                        src={getAvatarSrc(user?.avatarURL)} 
                                        alt="" 
                                        className={cx('popover-avatar')}
                                        onError={(e) => { e.target.src = defaultAvatar; }}
                                    />
                                    <div className={cx('popover-names')}>
                                        <p className={cx('display-name')}>{user?.displayName}</p>
                                        <p className={cx('username')}>@{user?.username}</p>
                                    </div>
                                </div>
                                <div className={cx('popover-divider')} />
                                <button
                                    type="button"
                                    className={cx('popover-item')}
                                    onClick={() => {
                                        setShowUserMenu(false);
                                        navigate(`/feed/profile/${user?._id}`);
                                    }}
                                >
                                    <User size={16} />
                                    <span>Hồ sơ của bạn</span>
                                </button>
                                <button
                                    type="button"
                                    className={cx('popover-item', 'logout-item')}
                                    onClick={() => {
                                        setShowUserMenu(false);
                                        handleLogout();
                                    }}
                                >
                                    <LogOut size={16} />
                                    <span>Đăng xuất @{user?.username}</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </aside>
    );
}
