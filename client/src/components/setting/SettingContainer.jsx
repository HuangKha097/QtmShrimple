import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from '../../assets/css/SettingContainer.module.scss';
import { 
    User, 
    Palette, 
    Bell, 
    Shield, 
    EyeOff, 
    UserX, 
    Info, 
    ChevronRight, 
    ArrowLeft, 
    LogOut 
} from 'lucide-react';
import { useAuthStore } from '../../stores/useAuthStore';

// Tab Components
import AccountSettings from './AccountSettings';
import ChatSettings from './ChatSettings';
import Notifications from './Notifications';
import AntiPeepSettings from './AntiPeepSettings';
import BlockedUsers from './BlockedUsers';
import Application from './Application';

const cx = classNames.bind(styles);

const SETTINGS_TABS = [
    {
        id: 'account',
        label: 'Tài khoản của bạn',
        sublabel: 'Xem thông tin hồ sơ, bảo mật và đổi mật khẩu',
        icon: <User size={20} />
    },
    {
        id: 'chat',
        label: 'Giao diện & Trò chuyện',
        sublabel: 'Chế độ sáng/tối và tùy chỉnh màu sắc chủ đạo',
        icon: <Palette size={20} />
    },
    {
        id: 'notifications',
        label: 'Thông báo',
        sublabel: 'Âm thanh thông báo và thông báo đẩy màn hình',
        icon: <Bell size={20} />
    },
    {
        id: 'privacy',
        label: 'Quyền riêng tư & Bảo mật',
        sublabel: 'Quản lý thông tin hiển thị và ai có thể nhắn tin',
        icon: <Shield size={20} />
    },
    {
        id: 'anti-peep',
        label: 'Chống nhìn trộm (Anti-Peep)',
        sublabel: 'Tự động làm mờ nội dung nhạy cảm ở nơi đông người',
        icon: <EyeOff size={20} />
    },
    {
        id: 'blocked',
        label: 'Người dùng đã chặn',
        sublabel: 'Xem danh sách và quản lý tài khoản bị chặn',
        icon: <UserX size={20} />
    },
    {
        id: 'application',
        label: 'Về ứng dụng',
        sublabel: 'Thông tin phiên bản, nhà phát triển và cập nhật',
        icon: <Info size={20} />
    },
];

const SettingContainer = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { signOut } = useAuthStore();

    const initialTab = searchParams.get('tab') || 'account';
    const [activeTab, setActiveTab] = useState(initialTab);
    const [mobileView, setMobileView] = useState('menu'); // 'menu' | 'detail'

    useEffect(() => {
        const tabParam = searchParams.get('tab');
        if (tabParam && SETTINGS_TABS.some(t => t.id === tabParam)) {
            setActiveTab(tabParam);
            setMobileView('detail');
        }
    }, [searchParams]);

    const handleSelectTab = (tabId) => {
        setActiveTab(tabId);
        setSearchParams({ tab: tabId });
        setMobileView('detail');
    };

    const handleBackToMenu = () => {
        setMobileView('menu');
    };

    const handleLogout = async () => {
        if (confirm("Bạn có muốn đăng xuất không?")) {
            await signOut();
        }
    };

    const currentTabInfo = SETTINGS_TABS.find(t => t.id === activeTab) || SETTINGS_TABS[0];

    const renderActiveTabContent = () => {
        switch (activeTab) {
            case 'account':
                return <AccountSettings handleLogout={handleLogout} />;
            case 'chat':
                return <ChatSettings />;
            case 'notifications':
                return <Notifications />;
            case 'privacy':
                return <AntiPeepSettings />;
            case 'anti-peep':
                return <AntiPeepSettings />;
            case 'blocked':
                return <BlockedUsers />;
            case 'application':
                return <Application />;
            default:
                return <AccountSettings handleLogout={handleLogout} />;
        }
    };

    return (
        <div className={cx('settings-page', { 'show-detail-mobile': mobileView === 'detail' })}>
            {/* Column 1: Settings Navigation Menu */}
            <div className={cx('settings-nav-col')}>
                <div className={cx('settings-nav-header')}>
                    <button 
                        type="button" 
                        className={cx('mobile-home-btn')}
                        onClick={() => navigate(-1)}
                        title="Quay lại"
                        aria-label="Quay lại"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h2>Cài đặt</h2>
                </div>

                <div className={cx('settings-nav-list')}>
                    {SETTINGS_TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                className={cx('nav-item', { active: isActive })}
                                onClick={() => handleSelectTab(tab.id)}
                            >
                                <div className={cx('nav-icon-wrapper', { active: isActive })}>
                                    {tab.icon}
                                </div>
                                <div className={cx('nav-text-group')}>
                                    <span className={cx('nav-item-title')}>{tab.label}</span>
                                    <span className={cx('nav-item-sub')}>{tab.sublabel}</span>
                                </div>
                                <ChevronRight size={18} className={cx('nav-arrow')} />
                            </button>
                        );
                    })}

                    <div className={cx('nav-divider')} />

                    <button
                        type="button"
                        className={cx('nav-item', 'logout-btn')}
                        onClick={handleLogout}
                    >
                        <div className={cx('nav-icon-wrapper', 'logout-icon')}>
                            <LogOut size={20} />
                        </div>
                        <div className={cx('nav-text-group')}>
                            <span className={cx('nav-item-title', 'logout-text')}>Đăng xuất</span>
                            <span className={cx('nav-item-sub')}>Thoát khỏi tài khoản trên thiết bị này</span>
                        </div>
                    </button>
                </div>
            </div>

            {/* Column 2: Selected Tab Content */}
            <div className={cx('settings-content-col')}>
                <div className={cx('settings-content-header')}>
                    <button
                        type="button"
                        className={cx('content-back-btn')}
                        onClick={handleBackToMenu}
                        title="Quay lại danh mục"
                        aria-label="Quay lại danh mục"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className={cx('header-title-wrapper')}>
                        <span className={cx('content-header-title')}>{currentTabInfo.label}</span>
                    </div>
                </div>

                <div className={cx('settings-content-body')}>
                    {renderActiveTabContent()}
                </div>
            </div>
        </div>
    );
};

export default SettingContainer;