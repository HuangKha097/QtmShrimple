import MotionPresence from '../common/MotionPresence';
import React from 'react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/ChatContainer.module.scss';
import ChatHeader from "./ChatHeader.jsx";
import ChatBody from "./ChatBody.jsx";
import ChatInput from "./ChatInput.jsx";
import ChatInfo from "./ChatInfo.jsx";
import { useChatStore } from "../../stores/useChatStore.js";
import { MessageSquare } from "lucide-react";
import { useSearchParams } from 'react-router-dom';

const cx = classNames.bind(styles);

const ChatContainer = ({ onCloseChatInfo, isShowChatInfo }) => {
    const { activeConversationId, setActiveConversationId, conversations, friends } = useChatStore();
    const [searchParams] = useSearchParams();

    // Đồng bộ URL -> Store
    React.useEffect(() => {
        const idFromUrl = searchParams.get('id');
        if (idFromUrl) {
            // Chỉ update nếu thực sự khác để tránh loop
            if (idFromUrl !== activeConversationId) {
                setActiveConversationId(idFromUrl);
            }
        } else if (activeConversationId) {
            // Nếu URL trống mà Store vẫn còn ID -> Xóa ID trong Store (trường hợp nhấn Back)
            setActiveConversationId(null);
        }
    }, [searchParams]); // Quan trọng: Chỉ phụ thuộc vào searchParams

    // Logic tìm conversation
    let selectedConvo = conversations.find(conversation => conversation._id === activeConversationId);

    // Nếu là ID tạm, tạo object conversation giả
    if (!selectedConvo && activeConversationId?.startsWith('temp_')) {
        const friendId = activeConversationId.replace('temp_', '');
        const friend = friends.find(f => f._id === friendId);

        if (friend) {
            selectedConvo = {
                _id: activeConversationId,
                isGroup: false,
                participants: [friend],
                updatedAt: new Date().toISOString(),
                unreadCounts: 0
            };
        }
    }

    if (!selectedConvo) {
        return (
            <div className={cx('chat-container', 'no-chat-selected')}>
                <div 
                    className={cx('welcome-content')}

                >
                    <div className={cx('icon-wrapper')}>
                        <MessageSquare size={48} strokeWidth={2.5} />
                    </div>
                    <h2>Welcome to Shrimple Chat!</h2>
                    <p>Select a friend from the sidebar or search to start a new, energetic conversation.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={cx('chat-container-wrapper')}>
            <div 
                className={cx("block-left")}

            >
                <div className={cx("header")}>
                    <ChatHeader onCloseChatInfo={onCloseChatInfo} chat={selectedConvo} />
                </div>

                <div className={cx("body")}>
                    <ChatBody />
                </div>

                <div className={cx("footer")}>
                    <ChatInput />
                </div>
            </div>

                <MotionPresence open={isShowChatInfo} 
                        className={cx("block-right")}

                    >
                        <div className={cx("chat-info-wrapper")}>
                            <ChatInfo chat={selectedConvo} onClose={onCloseChatInfo} />
                        </div>
                    </MotionPresence>

        </div>
    );
};

export default ChatContainer;