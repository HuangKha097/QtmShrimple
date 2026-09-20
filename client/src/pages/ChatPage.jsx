import { useSceneMotion } from '../hooks/useSceneMotion';
import MotionPresence from '../components/common/MotionPresence';
import React, { useRef, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../assets/css/ChatPage.module.scss';
import { Outlet, useLocation } from 'react-router-dom';

import SlideBar from "../components/slidebar/SlideBar.jsx";
import XNavRail from "../components/common/XNavRail.jsx";
import { useAuthStore } from "../stores/useAuthStore.js";
import { useChatStore } from "../stores/useChatStore.js";
import { toast } from "sonner";
import SettingContainer from "../components/setting/SettingContainer.jsx";
import AddFriendPopUp from "../components/slidebar/AddFriendPopUp.jsx";
import CreateGroupPopUp from "../components/slidebar/CreateGroupPopUp.jsx";
import PostsSidebar from "../components/posts/PostsSidebar.jsx";
import GlobalLoadingOverlay from "../components/common/GlobalLoadingOverlay.jsx";

const cx = classNames.bind(styles);

const ChatPage = () => {
    const { activeConversationId } = useChatStore();
    const [isShowSetting, setIsShowSetting] = useState(false);
    const [isShowSlideBar, setIsShowSlideBar] = useState(true);
    const [isShowChatInfo, setIsShowChatInfo] = useState(false);
    const [isShowAddFriendPopup, setIsShowAddFriendPopup] = useState(false);
    const [isShowCreateGroupPopup, setIsShowCreateGroupPopup] = useState(false);
    const signOut = useAuthStore((state) => state.signOut);
    const location = useLocation();
    const shellRef = useRef(null);
    const contentRef = useRef(null);
    useSceneMotion(shellRef, contentRef, location.pathname);
    const [feedMenuPath, setFeedMenuPath] = useState(null);
    const isFeedMenuOpen = feedMenuPath === location.pathname;
    const closeFeedMenu = () => setFeedMenuPath(null);
    const toggleFeedMenu = () => setFeedMenuPath(isFeedMenuOpen ? null : location.pathname);

    // Determine view mode from URL
    const isFeedView = location.pathname.startsWith('/feed') || location.pathname.startsWith('/video');

    React.useEffect(() => {
        if (!activeConversationId) {
            setIsShowSlideBar(true);
        }
    }, [activeConversationId]);

    const handleLogout = async () => {
        try {
            const confirmLogout = confirm("Bạn có muốn đăng xuất không?");
            if (confirmLogout) await signOut();
        } catch (err) {
            toast.error(err.message);
            console.error(err);
        }
    };

    const onCloseSetting = () => setIsShowSetting((prev) => !prev);
    const onCloseSlideBar = () => setIsShowSlideBar((prev) => !prev);
    const onCloseChatInfo = () => setIsShowChatInfo((prev) => !prev);
    const onCloseAddFriendPopup = () => setIsShowAddFriendPopup((prev) => !prev);
    const onCloseCreateGroupPopup = () => setIsShowCreateGroupPopup((prev) => !prev);

    const outletContext = {
        isShowChatInfo,
        onCloseChatInfo,
        toggleSidebar: isFeedView ? toggleFeedMenu : onCloseSlideBar,
        isSidebarOpen: isFeedView ? isFeedMenuOpen : isShowSlideBar,
        onOpenNewChat: onCloseAddFriendPopup
    };

    return (
        <div className={cx("container")} onKeyDown={(event) => { if (event.key === "Escape") closeFeedMenu(); }}>
            <div ref={shellRef} className={cx("chat-wrapper", {
                "has-active-chat": activeConversationId && !isFeedView,
                "feed-view": isFeedView,
                "sidebar-open": isShowSlideBar,
                "feed-menu-open": isFeedMenuOpen
            })}>
                {/* Column 1: X Global Navigation Rail (Only in /chat mode on desktop) */}
                {!isFeedView && (
                    <XNavRail 
                        onCloseSetting={onCloseSetting} 
                        onOpenNewChat={onCloseAddFriendPopup} 
                    />
                )}

                {/* Column 2: Messages List (or PostsSidebar if in feed view) */}
                {(isFeedView || isShowSlideBar) && (
                    <div className={cx("block-left")}>
                        {isFeedView ? (
                            <div key="posts-sidebar" style={{ height: '100%', width: '100%' }}>
                                <PostsSidebar
                                    onNavigate={closeFeedMenu}
                                    onClose={closeFeedMenu}
                                    onCloseSetting={onCloseSetting}
                                />
                            </div>
                        ) : (
                            <div key="chat-sidebar" style={{ height: '100%', width: '100%' }}>
                                <SlideBar
                                    onCloseSetting={onCloseSetting}
                                    onCloseAddFriendPopup={onCloseAddFriendPopup}
                                    onCloseCreateGroupPopup={onCloseCreateGroupPopup}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Mobile feed backdrop */}
                {isFeedView && isFeedMenuOpen && (
                    <div className={cx("mobile-backdrop")} onClick={closeFeedMenu}></div>
                )}

                {/* Column 3: Conversation View / Feed Content */}
                <div className={cx("block-right")}>
                    <div ref={contentRef} style={{ height: '100%', width: '100%' }}>
                        <Outlet context={outletContext} />
                    </div>
                </div>

                <GlobalLoadingOverlay />

                {/* Settings Modal */}
                <MotionPresence 
                    open={isShowSetting}
                    className={cx("setting-wrapper")}
                    onClick={(e) => e.target === e.currentTarget && onCloseSetting()}
                >
                    <SettingContainer onCloseSetting={onCloseSetting} handleLogout={handleLogout} />
                </MotionPresence>
            </div>

            {/* Add Friend / Compose Popup */}
            <MotionPresence 
                open={isShowAddFriendPopup}
                className={cx("add-friend-wrapper")}
                onClick={(e) => e.target === e.currentTarget && onCloseAddFriendPopup()}
            >
                <AddFriendPopUp onCloseAddFriendPopup={onCloseAddFriendPopup} />
            </MotionPresence>

            {/* Create Group Popup */}
            <MotionPresence 
                open={isShowCreateGroupPopup}
                className={cx("add-friend-wrapper")}
                onClick={(e) => e.target === e.currentTarget && onCloseCreateGroupPopup()}
            >
                <CreateGroupPopUp onCloseCreateGroupPopup={onCloseCreateGroupPopup} />
            </MotionPresence>
        </div>
    );
};

export default ChatPage;