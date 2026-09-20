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
    Sun,
    Moon,
    SquarePen
} from 'lucide-react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/XNavRail.module.scss';
import { useAuthStore } from '../../stores/useAuthStore';
import { useThemeStore } from '../../stores/useThemeStore';
import defaultAvatar from '../../../public/favicon.png';
import { ASSET_BASE_URL } from '../../config/env';

const cx = classNames.bind(styles);

function ShrimpleLogo({ size = 28 }) {
    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 32 32" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M22.5 8C20.5 6 17 5 13.5 6C9.5 7.2 7 11.2 8.5 15.2C10 19.2 22 17.5 23.5 21.5C24.5 24.5 22 27.5 18 28C13.8 28.5 10 26.5 8 24.5"
                stroke="url(#shrimple-gradient)"
                strokeWidth="3.4"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <circle cx="23" cy="7.5" r="2.2" fill="#f97316" />
            <defs>
                <linearGradient id="shrimple-gradient" x1="8" y1="5" x2="24" y2="28" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#f97316" />
                    <stop offset="1" stopColor="#ea580c" />
                </linearGradient>
            </defs>
        </svg>
    );
}

export default function XNavRail({ onCloseSetting, onOpenNewChat }) {
    const { user, signOut } = useAuthStore();
    const { isLight, toggleTheme } = useThemeStore();
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

    return (
        <aside className={cx('nav-rail')} aria-label="X Global Navigation">
            {/* Top: Shrimple S Logo SVG */}
            <div className={cx('logo-container')}>
                <button 
                    type="button" 
                    className={cx('logo-btn')} 
                    onClick={() => navigate('/feed')}
                    title="Trang chủ Shrimple"
                    aria-label="Trang chủ"
                >
                    <ShrimpleLogo size={28} />
                </button>
            </div>

            {/* Middle: Navigation Links */}
            <nav className={cx('nav-links')}>
                {navItems.map((item) => {
                    const isActive = item.path === '/chat' 
                        ? location.pathname.startsWith('/chat') 
                        : location.pathname === item.path;
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
                                {isActive && <span className={cx('active-indicator')}></span>}
                            </div>
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
                </button>

                {/* Quick Action Button (X-Style Compose) */}
                {onOpenNewChat && (
                    <button
                        type="button"
                        className={cx('compose-btn')}
                        onClick={onOpenNewChat}
                        title="Viết tin nhắn mới"
                        aria-label="Tin nhắn mới"
                    >
                        <SquarePen size={20} strokeWidth={2.2} />
                    </button>
                )}
            </nav>

            {/* Bottom: Theme Toggle & User Avatar */}
            <div className={cx('bottom-container')}>
                <button
                    type="button"
                    className={cx('theme-toggle-btn')}
                    onClick={toggleTheme}
                    title={isLight ? "Chuyển sang nền tối" : "Chuyển sang nền sáng"}
                    aria-label="Theme toggle"
                >
                    {isLight ? <Moon size={20} /> : <Sun size={20} />}
                </button>

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
