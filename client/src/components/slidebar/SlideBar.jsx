import React from 'react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/SlideBar.module.scss';
import default_avt from "../../../public/favicon.png";
import SlidebarBody from './SlidebarBody.jsx';
import { ChevronLeft, UserPlus, Users, Settings } from 'lucide-react';
import { useAuthStore } from "../../stores/useAuthStore.js";
import { useNavigate } from 'react-router-dom';
import AppNavigation, { ThemeToggle } from '../common/AppNavigation';

const cx = classNames.bind(styles);
const SlideBar = ({ onCloseSetting, onCloseSlideBar, onCloseAddFriendPopup, onCloseCreateGroupPopup }) => {
    const { user } = useAuthStore();
    const navigate = useNavigate();

    return (<div className={cx('slide-bar-wrapper')}>
        <div className={cx("header")}>

            <div className={cx('logo')}>
                <button className={cx('logo-text')} onClick={() => navigate('/feed')}>Shrimple</button>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <button className={cx("more-btn", "collapse-sidebar-btn")} onClick={onCloseSlideBar} aria-label="Collapse chat sidebar" title="Collapse sidebar"><ChevronLeft size={18} /></button>
                </div>
            </div>
            <div className={cx('profile')}>
                <div className={cx('profile-identity')}>
                    <img
                        src={user?.avatarURL ? (user.avatarURL.startsWith('http') ? user.avatarURL : `http://localhost:5001${user.avatarURL}`) : default_avt}
                        alt="profile-pic"
                        className={cx('profile-pic')}
                        onError={(e) => { e.target.src = default_avt }}
                    />
                    <div className={cx("info-wrapper")}>
                        <p className={cx('full-name')}>{user?.displayName}</p>
                        <p className={cx("username")}>{`@${user?.username}`}</p>
                    </div>
                </div>
                <button className={cx("add-friend-btn")} onClick={onCloseAddFriendPopup} aria-label="Add friend" title="Add friend"><UserPlus size={18} /></button>
                <button className={cx("add-friend-btn")} onClick={onCloseCreateGroupPopup} aria-label="Create group" title="Create group"><Users size={18} /></button>
            </div>
        </div>


        <AppNavigation />

        <div className={cx("body")}>
            <SlidebarBody />
        </div>

        <div className={cx("footer")}>
            <button className={cx("settings-btn")} onClick={onCloseSetting}><Settings size={18} /> Settings</button>
            <ThemeToggle />

        </div>
    </div>);
};

export default SlideBar;