import React from 'react';
import { useNavigate } from "react-router-dom";
import classNames from 'classnames/bind';
import styles from '../../assets/css/ChatCard.module.scss';
import default_avt from "../../../public/favicon.png";
import { useChatStore } from "../../stores/useChatStore.js";
import { useAuthStore } from "../../stores/useAuthStore.js";
import { ASSET_BASE_URL } from "../../config/env.js";

const cx = classNames.bind(styles);

const GroupChatCard = ({ props }) => {
    // Lấy các hàm và state cần thiết từ Store
    const { setActiveConversationId, activeConversationId, messages, fetchMessages, friends } = useChatStore();
    const { user: currentUser } = useAuthStore();
    const navigate = useNavigate();

    // 1. Phân tách dữ liệu
    const groupInfo = props?.group;
    const participants = props?.participants || [];
    const lastMessage = props?.lastMessage;

    // 2. Hàm format thời gian
    const formatTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();

        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString([], { day: '2-digit', month: '2-digit' });
    };

    // 3. Logic hiển thị Avatar Group
    const renderAvatar = () => {
        const getAvatarSrc = (url) => {
            if (!url) return default_avt;
            if (url.startsWith('http') || url.startsWith('data:')) return url;
            return `${ASSET_BASE_URL}${url}`;
        };

        if (groupInfo?.avatarURL) {
            return (
                <img
                    src={getAvatarSrc(groupInfo.avatarURL)}
                    alt="Group Avatar"
                    className={cx('avatar', 'single-avatar')}
                    onError={(e) => { e.target.src = default_avt }}
                />
            );
        }

        if (participants.length > 0) {
            // Resolve avatars for the first 2 participants from Friends list if available
            const resolveAvatar = (member) => {
                if (!member) return null;
                // Try to find in friends list
                if (friends && friends.length > 0) {
                    const friend = friends.find(f => f._id === member._id || f._id === member._id?.toString());
                    if (friend && friend.avatarURL) return friend.avatarURL;
                }
                return member.avatarURL;
            };

            const firstAvatar = resolveAvatar(participants[0]);
            const secondAvatar = participants.length > 1 ? resolveAvatar(participants[1]) : null;

            return (
                <div className={cx('group-avatar-stack')}>
                    <img
                        src={getAvatarSrc(firstAvatar)}
                        alt="mem1"
                        className={cx('stack-avatar', 'first')}
                        onError={(e) => { e.target.src = default_avt }}
                    />
                    {participants.length > 1 && (
                        <img
                            src={getAvatarSrc(secondAvatar)}
                            alt="mem2"
                            className={cx('stack-avatar', 'second')}
                            onError={(e) => { e.target.src = default_avt }}
                        />
                    )}
                </div>
            );
        }
        return <img src={default_avt} alt="default" className={cx('avatar', 'single-avatar')} />;
    };

    // 4. Xử lý khi click vào Card: Set Active ID + Tải tin nhắn
    const handleSelectConversation = async (conversationId) => {
        setActiveConversationId(conversationId);
        navigate(`/chat?id=${conversationId}`);

        // Luôn gọi fetchMessages để đảm bảo tải dữ liệu mới nhất
        // Store sẽ tự xử lý nếu cần thiết (dựa vào cursor) nhưng gọi ở đây là an toàn nhất
        await fetchMessages(conversationId);
    };

    const formatLastMessage = (lastMsg) => {
        if (!lastMsg) return <span className={cx('empty-msg')}>No messages yet</span>;
        if (lastMsg.isRecalled || lastMsg.content === "Tin nhắn đã bị thu hồi") {
            return "Tin nhắn đã bị thu hồi";
        }
        
        const type = lastMsg.messageType || 'text';
        
        const senderIdStr = typeof lastMsg.senderId === 'object' 
            ? lastMsg.senderId?._id?.toString() 
            : lastMsg.senderId?.toString();
            
        let senderName = "";
        const isMe = currentUser && senderIdStr === currentUser._id?.toString();
        
        if (isMe) {
            senderName = "Bạn";
        } else if (typeof lastMsg.senderId === 'object' && lastMsg.senderId?.displayName) {
            senderName = lastMsg.senderId.displayName;
        } else if (participants.length > 0) {
            const p = participants.find(part => {
                const id = part._id || (typeof part.userId === 'object' ? part.userId?._id : part.userId);
                return id?.toString() === senderIdStr;
            });
            if (p) senderName = p.displayName || p.username;
        }
        
        if (!senderName) senderName = "Ai đó";

        switch (type) {
            case 'image':
                return isMe ? "Bạn đã gửi hình ảnh" : `${senderName} đã gửi hình ảnh`;
            case 'audio':
                return isMe ? "Bạn đã gửi file âm thanh" : `${senderName} đã gửi file âm thanh`;
            case 'video':
                return isMe ? "Bạn đã gửi video" : `${senderName} đã gửi video`;
            case 'file':
                return isMe ? "Bạn đã gửi tệp đính kèm" : `${senderName} đã gửi tệp đính kèm`;
            case 'location':
                return isMe ? "Bạn đã gửi vị trí" : `${senderName} đã gửi vị trí`;
            case 'text':
            default:
                if (lastMsg.content && (lastMsg.content.startsWith('http') || lastMsg.content.includes('/uploads/'))) {
                    if (lastMsg.content.match(/\.(jpeg|jpg|gif|png|webp)/i)) {
                        return isMe ? "Bạn đã gửi hình ảnh" : `${senderName} đã gửi hình ảnh`;
                    }
                    if (lastMsg.content.match(/\.(mp3|wav|ogg|webm|m4a)/i)) {
                        return isMe ? "Bạn đã gửi file âm thanh" : `${senderName} đã gửi file âm thanh`;
                    }
                }
                return isMe ? `Bạn: ${lastMsg.content || ""}` : `${senderName}: ${lastMsg.content || ""}`;
        }
    };

    return (
        <div
            className={cx('chat-card-wrapper', { active: (Boolean(activeConversationId) && props._id === activeConversationId) })}
            onClick={() => handleSelectConversation(props._id)}
            style={{
                cursor: 'pointer',
                border: (Boolean(activeConversationId) && props._id === activeConversationId) ? "2px solid var(--primary-color)" : "none"
            }}
        >
            <div className={cx('avatar-wrapper')}>
                {renderAvatar()}
            </div>

            <div className={cx('info-wrapper')}>
                <p className={cx('group-name')}>
                    {groupInfo?.name || "Unnamed Group"}
                </p>

                <p className={cx('last-message', { 'unseen': props?.unreadCounts > 0 })}>
                    {formatLastMessage(lastMessage)}
                </p>
            </div>

            <div className={cx('status-wrapper')}>
                <p className={cx('time')}>{formatTime(props?.updatedAt || props?.lastMessageAt)}</p>

                {props?.unreadCounts > 0 && (
                    <span className={cx('unread-badge')}>
                        {props?.unreadCounts > 9 ? '9+' : props?.unreadCounts}
                    </span>
                )}
            </div>
        </div>
    );
};

export default GroupChatCard;
