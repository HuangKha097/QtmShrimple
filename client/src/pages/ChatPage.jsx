import { useSceneMotion } from '../hooks/useSceneMotion';
import MotionPresence from '../components/common/MotionPresence';
import React, { useRef, useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../assets/css/ChatPage.module.scss';
import { Outlet, useLocation } from 'react-router-dom';

import SlideBar from "../components/slidebar/SlideBar.jsx";
import { useAuthStore } from "../stores/useAuthStore.js";
import { useChatStore } from "../stores/useChatStore.js";
import { toast } from "sonner";
import SettingContainer from "../components/setting/SettingContainer.jsx";
import { ChevronRight } from 'lucide-react';
import AddFriendPopUp from "../components/slidebar/AddFriendPopUp.jsx";
import CreateGroupPopUp from "../components/slidebar/CreateGroupPopUp.jsx";
import PostsSidebar from "../components/posts/PostsSidebar.jsx";
import GlobalLoadingOverlay from "../components/common/GlobalLoadingOverlay.jsx";

const cx = classNames.bind(styles);

const ChatPage = () => {
    const { activeConversationId } = useChatStore();
    const [isShowSetting, setIsShowSetting] = useState(false);
    const [isShowSlideBar, setIsShowSlideBar] = useState(true);
    const [isShowChatInfo, setIisShowChatInfo] = useState(false);
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
    // const isChatView = location.pathname.startsWith('/chat');

    // FORCE SIDEBAR OPEN ON MOBILE/BACK NAVIGATION
    // If we are not in an active chat, we must ensure sidebar is open so users aren't stuck on a blank screen (if they collapsed it)
    React.useEffect(() => {
        if (!activeConversationId) {
            setIsShowSlideBar(true);
        }
    }, [activeConversationId]);

    const handleLogout = async () => {
        try {
            const confirmLogout = confirm("Do you want to sign out ?")
            confirmLogout ? await signOut() : "" ;
        } catch (err) {
            toast.error(err.message);
            console.log(err)
        }
    }
    const onCloseSetting = () => {
        setIsShowSetting((prev) => !prev);
    }
    const onCloseSlideBar = () => {
        setIsShowSlideBar((prev) => !prev);
    }
    const onCloseChatInfo = () => {
        setIisShowChatInfo((prev) => !prev);
    }
    const onCloseAddFriendPopup = () => {
        setIsShowAddFriendPopup((prev) => !prev);
    }
    const onCloseCreateGroupPopup = () => {
        setIsShowCreateGroupPopup((prev) => !prev);
    }

    // Context to pass to Outlet (ChatContainer specifically needs this)
    const outletContext = {
        isShowChatInfo,
        onCloseChatInfo,
        toggleSidebar: isFeedView ? toggleFeedMenu : onCloseSlideBar,
        isSidebarOpen: isFeedView ? isFeedMenuOpen : isShowSlideBar
    };

    return (<div className={cx("container")} onKeyDown={(event) => { if (event.key === "Escape") closeFeedMenu(); }}>
        <div ref={shellRef} className={cx("chat-wrapper", {
            "has-active-chat": activeConversationId && !isFeedView,
            "feed-view": isFeedView,
            "sidebar-open": isShowSlideBar,
            "feed-menu-open": isFeedMenuOpen
        })}>
            {isFeedView || isShowSlideBar ? <div className={cx("block-left")}>

                    {isFeedView ? (
                        <div
                            key="posts-sidebar"

                            style={{ height: '100%', width: '100%' }}
                        >
                            <PostsSidebar
                                onNavigate={closeFeedMenu}
                                onClose={closeFeedMenu}
                                onCloseSetting={onCloseSetting}
                            />
                        </div>
                    ) : (
                        <div
                            key="chat-sidebar"

                            style={{ height: '100%', width: '100%' }}
                        >
                            <SlideBar
                                onCloseSetting={onCloseSetting}
                                onCloseSlideBar={onCloseSlideBar}
                                onCloseAddFriendPopup={onCloseAddFriendPopup}
                                onCloseCreateGroupPopup={onCloseCreateGroupPopup}
                            />
                        </div>
                    )}

            </div> : <div className={cx("block-left", "no-slide-bar")}>
                <button className={cx("more-btn")} onClick={onCloseSlideBar} aria-label="Expand chat sidebar"><ChevronRight size={18} /></button>
            </div>}
            {/* On mobile feed view, create a backdrop to close sidebar */}
            {isFeedView && isFeedMenuOpen && (
                <div className={cx("mobile-backdrop")} onClick={closeFeedMenu}></div>
            )}

            <div className={cx("block-right")}>

                    <div
                        ref={contentRef}

                        style={{ height: '100%', width: '100%' }}
                    >
                        <Outlet context={outletContext} />
                    </div>

            </div>

            <GlobalLoadingOverlay />

                <MotionPresence open={isShowSetting}
                        className={cx("setting-wrapper")}

                        onClick={(e) => e.target === e.currentTarget && onCloseSetting()}
                    >
                        <SettingContainer onCloseSetting={onCloseSetting} handleLogout={handleLogout} />
                    </MotionPresence>

        </div>

            <MotionPresence open={isShowAddFriendPopup}
                    className={cx("add-friend-wrapper")}

                    onClick={(e) => e.target === e.currentTarget && onCloseAddFriendPopup()}
                >
                    <AddFriendPopUp onCloseAddFriendPopup={onCloseAddFriendPopup} />
                </MotionPresence>

            <MotionPresence open={isShowCreateGroupPopup}
                    className={cx("add-friend-wrapper")}

                    onClick={(e) => e.target === e.currentTarget && onCloseCreateGroupPopup()}
                >
                    <CreateGroupPopUp onCloseCreateGroupPopup={onCloseCreateGroupPopup} />
                </MotionPresence>

        {!isFeedView && <p className={cx("copyright")}>
            © 2025 Shrimple. All rights reserved.
        </p>}
    </div>);
};

export default ChatPage;