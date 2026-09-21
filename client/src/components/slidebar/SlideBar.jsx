import React from 'react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/SlideBar.module.scss';
import SlidebarBody from './SlidebarBody.jsx';
import { Settings, SquarePen, Users, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const cx = classNames.bind(styles);

const SlideBar = ({ onCloseSetting, onCloseAddFriendPopup, onCloseCreateGroupPopup }) => {
    const navigate = useNavigate();

    return (
        <div className={cx('messages-column-wrapper')}>
            {/* X-Style Top Header: 53px, back button + title on left, settings & compose on right */}
            <div className={cx('messages-header')}>
                <div className={cx('header-title-row')}>
                    <div className={cx('header-title-group')}>
                        <button 
                            type="button" 
                            className={cx('header-back-btn')} 
                            onClick={() => navigate('/feed')}
                            title="Quay lại Bảng tin (Home)"
                            aria-label="Quay lại Bảng tin"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className={cx('header-title')}>Tin nhắn</h1>
                    </div>

                    <div className={cx('header-actions')}>
                        <button 
                            type="button" 
                            className={cx('header-action-btn')} 
                            onClick={() => navigate('/setting?tab=chat')}
                            title="Cài đặt tin nhắn"
                            aria-label="Cài đặt"
                        >
                            <Settings size={20} />
                        </button>
                        <button 
                            type="button" 
                            className={cx('header-action-btn')} 
                            onClick={onCloseAddFriendPopup}
                            title="Tin nhắn mới / Thêm bạn"
                            aria-label="Tin nhắn mới"
                        >
                            <SquarePen size={20} />
                        </button>
                        <button 
                            type="button" 
                            className={cx('header-action-btn')} 
                            onClick={onCloseCreateGroupPopup}
                            title="Tạo nhóm trò chuyện"
                            aria-label="Tạo nhóm"
                        >
                            <Users size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Messages Body (Search + Tabs + Conversations) */}
            <div className={cx('messages-body')}>
                <SlidebarBody onOpenNewChat={onCloseAddFriendPopup} />
            </div>
        </div>
    );
};

export default SlideBar;