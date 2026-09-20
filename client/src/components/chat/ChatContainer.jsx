import MotionPresence from '../common/MotionPresence';
import React from 'react';
import { motion as Motion } from 'motion/react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/ChatContainer.module.scss';
import ChatHeader from "./ChatHeader.jsx";
import ChatBody from "./ChatBody.jsx";
import ChatInput from "./ChatInput.jsx";
import ChatInfo from "./ChatInfo.jsx";
import { useChatStore } from "../../stores/useChatStore.js";
import { useSearchParams, useOutletContext } from 'react-router-dom';

const cx = classNames.bind(styles);

const ChatContainer = ({ onCloseChatInfo, isShowChatInfo }) => {
    const { activeConversationId, setActiveConversationId, conversations, friends } = useChatStore();
    const [searchParams] = useSearchParams();

    // Đồng bộ URL -> Store
    React.useEffect(() => {
        const idFromUrl = searchParams.get('id');
        if (idFromUrl) {
            if (idFromUrl !== activeConversationId) {
                setActiveConversationId(idFromUrl);
            }
        } else if (activeConversationId) {
            setActiveConversationId(null);
        }
    }, [searchParams]);

    // Logic tìm conversation (null-safe)
    let selectedConvo = (conversations || []).find(conversation => conversation && conversation._id === activeConversationId);

    // Nếu là ID tạm, tạo object conversation giả
    if (!selectedConvo && activeConversationId?.startsWith('temp_')) {
        const friendId = activeConversationId.replace('temp_', '');
        const friend = (friends || []).find(f => f && f._id === friendId);

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

    // X-Style Empty State: "Select a message"
    if (!selectedConvo) {
        return (
            <div className={cx('x-empty-state-container')}>
                <div className={cx('empty-content-box')}>
                    <h2 className={cx('empty-title')}>Chọn một tin nhắn</h2>
                    <p className={cx('empty-subtitle')}>
                        Chọn từ các cuộc trò chuyện hiện có của bạn, bắt đầu một cuộc trò chuyện mới hoặc tiếp tục kết nối.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className={cx('chat-container-wrapper')}>
            <div className={cx("block-left")}>
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

            <MotionPresence open={isShowChatInfo} className={cx("block-right")}>
                <div className={cx("chat-info-wrapper")}>
                    <ChatInfo chat={selectedConvo} onClose={onCloseChatInfo} />
                </div>
            </MotionPresence>
        </div>
    );
};

export default ChatContainer;