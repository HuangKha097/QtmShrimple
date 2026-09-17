import React, { useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/SettingContainer.module.scss';

// --- Import các component "trang" mới của bạn ---
import AccountSettings from './AccountSettings';
import ChatSettings from './ChatSettings';
import Notifications from './Notifications';
import BlockedUsers from './BlockedUsers';
import Application from './Application';
import AntiPeepSettings from './AntiPeepSettings';

const cx = classNames.bind(styles);

const SettingContainer = ({ onCloseSetting, handleLogout }) => {

    const [activeTab, setActiveTab] = useState('account');

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'account':
                return <AccountSettings handleLogout={handleLogout} />;
            case 'chat':
                return <ChatSettings />;
            case 'notifications':
                return <Notifications />;
            case 'blocked':
                return <BlockedUsers />;
            case 'privacy':
                return <AntiPeepSettings />;
            case 'application':
                return <Application />;
            default:
                return <AccountSettings />;
        }
    };

    return (
        <div
            className={cx('setting-wrapper')}

        >
            <div className={cx("header")}>
                <span>Settings</span>
                <button onClick={onCloseSetting} aria-label="Close settings">&times;</button>
            </div>
            <div className={cx("body")}>

                <div className={cx("block-left")}>

                    <button type="button" className={cx("menu-item", { active: activeTab === 'account' })}
                        onClick={() => setActiveTab('account')}
                    >
                        <span>Account Settings</span>
                    </button>
                    <button type="button" className={cx("menu-item", { active: activeTab === 'chat' })}
                        onClick={() => setActiveTab('chat')}
                    >
                        <span>Chat Settings</span>
                    </button>
                    <button type="button" className={cx("menu-item", { active: activeTab === 'notifications' })}
                        onClick={() => setActiveTab('notifications')}
                    >
                        <span>Notifications</span>
                    </button>
                    <button type="button" className={cx("menu-item", { active: activeTab === 'privacy' })}
                        onClick={() => setActiveTab('privacy')}
                    >
                        <span>Privacy & Security</span>
                    </button>
                    <button type="button" className={cx("menu-item", { active: activeTab === 'blocked' })}
                        onClick={() => setActiveTab('blocked')}
                    >
                        <span>Blocked Users</span>
                    </button>
                    <button type="button" className={cx("menu-item", { active: activeTab === 'application' })}
                        onClick={() => setActiveTab('application')}
                    >
                        <span>Application</span>
                    </button>
                </div>

                <div className={cx("block-right")}>
                    {renderActiveTab()}
                </div>
            </div>
        </div>
    );
};

export default SettingContainer;