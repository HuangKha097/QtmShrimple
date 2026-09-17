import React, { useEffect, useRef } from 'react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/ChatBody.module.scss';
import Message from './Message.jsx';
import { useChatStore } from "../../stores/useChatStore.js";
import { useAuthStore } from "../../stores/useAuthStore.js";
import defaultAvatar from "../../../public/favicon.png";
import LoadingSpin from "../common/loading/LoadingSpin.jsx";

const cx = classNames.bind(styles);

const ChatBody = () => {
    // Lấy thêm fetchMessages từ store
    const { messages, activeConversationId, conversations, fetchMessages, reactToMessageAction, friends , messageLoading} = useChatStore();
    const { user: currentUser } = useAuthStore();
    console.log("Loading:", messageLoading)
    const endOfMessagesRef = useRef(null);

    // Tìm conversation hiện tại
    const currentConvo = conversations.find(c => c._id === activeConversationId);

    // Lấy dữ liệu tin nhắn từ store
    const currentMessagesData = messages[activeConversationId];
    const messageList = currentMessagesData?.items || [];
    const hasMore = currentMessagesData?.hasMore;

    // Ref cho container để tính toán scroll
    const containerRef = useRef(null);
    const prevScrollHeightRef = useRef(0);
    const isFetchingRef = useRef(false);

    // --- 1. Tự động tải tin nhắn nếu chưa có (Backup cho trường hợp F5) ---
    useEffect(() => {
        if (activeConversationId && !currentMessagesData) {
            fetchMessages(activeConversationId);
        }
    }, [activeConversationId, currentMessagesData, fetchMessages]);

    const isFirstLoadRef = useRef(true);
    const [isReady, setIsReady] = React.useState(false);

    // Reset state when conversation changes
    React.useLayoutEffect(() => {
        isFirstLoadRef.current = true;
        setIsReady(false); // Show loading when switching
    }, [activeConversationId]);

    // --- 2. Tự động cuộn xuống dưới cùng ---
    React.useLayoutEffect(() => {
        // Nếu là ID tạm thời (chưa có hội thoại), hiện giao diện trống ngay
        if (activeConversationId?.startsWith('temp_')) {
            setTimeout(() => setIsReady(true), 300);
            return;
        }

        // Nếu đang tải tin nhắn lần đầu, giữ trạng thái loading
        if (messageLoading && messageList.length === 0) {
            setIsReady(false);
            return;
        }


        const finalizeScroll = () => {
            setTimeout(() => {
                setIsReady(true);
            }, 300);
        };

        // Nếu không có tin nhắn (cuộc hội thoại mới trống), hiện giao diện ngay (có delay)
        if (messageList.length === 0) {
            if (!isReady) finalizeScroll();
            return;
        }

        if (!containerRef.current) return;

        if (isFetchingRef.current) {
            // Load more: Keep relative scroll position (Instant)
            const newScrollHeight = containerRef.current.scrollHeight;
            const diff = newScrollHeight - prevScrollHeightRef.current;
            containerRef.current.scrollTop = diff; 
            isFetchingRef.current = false;
            setIsReady(true); 
        } else if (isFirstLoadRef.current) {
            // First load/Switch: Jump INSTANTLY to bottom
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
            isFirstLoadRef.current = false;
            finalizeScroll();
        } else {
            // New message: Instant jump to bottom
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
            setIsReady(true);
        }
    }, [messageList, messageLoading]);






    const handleScroll = (e) => {
        const { scrollTop, scrollHeight } = e.target;

        // Nếu cuộn lên đỉnh, còn tin nhắn cũ và KHÔNG đang loading -> Load more
        if (scrollTop === 0 && hasMore && !messageLoading) {
            isFetchingRef.current = true;
            prevScrollHeightRef.current = scrollHeight; // Lưu lại chiều cao trước khi load
            fetchMessages(activeConversationId);
        }
    };

    const formatTime = (isoString) => {
        if (!isoString) return "";
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Hàm lấy thông tin người gửi
    const getAvatarSrc = (url) => {
        if (!url) return defaultAvatar;
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        return `http://localhost:5001${url}`;
    };

    const getSenderInfo = (senderId) => {
        if (!senderId) return { name: "Unknown User", avatar: defaultAvatar };
        const senderIdStr = senderId.toString();

        // 1. Try to find in currentConvo.participants
        let participant = null;
        if (currentConvo?.participants) {
            participant = currentConvo.participants.find(p => {
                if (p._id && p._id.toString() === senderIdStr) return true;
                if (p.userId) {
                    const uId = typeof p.userId === 'object' ? p.userId._id?.toString() : p.userId.toString();
                    if (uId === senderIdStr) return true;
                }
                return false;
            });
        }

        // 2. Extract sender info
        let sender = null;
        if (participant) {
            if (participant.userId && typeof participant.userId === 'object') {
                sender = { ...participant.userId, ...participant };
            } else {
                sender = participant;
            }
        }

        // 3. Fallback/Enhancement from friends list
        if (friends && friends.length > 0) {
            const friend = friends.find(f => f._id?.toString() === senderIdStr);
            if (friend) {
                sender = sender ? { ...sender, ...friend } : friend;
            }
        }

        // 4. If we STILL don't have the user object but we know their ID, check if they are the current user
        if (!sender && currentUser && currentUser._id?.toString() === senderIdStr) {
            sender = currentUser;
        }

        return {
            name: sender?.displayName || sender?.username || "Unknown User",
            avatar: getAvatarSrc(sender?.avatarURL)
        };
    };

    // --- Loading State logic ---
    // If it's the very first load (no messages yet), show the big spinner

    return (
        <div
            className={cx('chat-body-wrapper')}
            ref={containerRef}
            onScroll={handleScroll}
            style={{ 
                opacity: isReady ? 1 : 0,
                visibility: isReady ? 'visible' : 'hidden'
            }}
        >
            {!isReady ? (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                    <LoadingSpin size={30} />
                </div>
            ) : (

                <>
                    {/* Loading Indicator for older messages at TOP */}
                    {messageLoading && messageList.length > 0 && (
                        <div style={{ textAlign: 'center', padding: '1.5rem', display: 'flex', justifyContent: 'center' }}>
                            <LoadingSpin size={20} />
                        </div>
                    )}

                    {/* Hiển thị thông báo nếu chưa có tin nhắn và không đang loading */}
                    {!messageLoading && messageList.length === 0 && (
                        <div
                            style={{
                                textAlign: 'center',
                                marginTop: '40px',
                                color: 'var(--text-muted)',
                                fontSize: '1.4rem',
                                opacity: 1
                            }}
                        >
                            Send a message to start the conversation!
                        </div>
                    )}

                    {messageList.map((message, index) => {
                        const senderId =

                        typeof message.senderId === 'object'
                            ? message.senderId?._id
                            : message.senderId;

                    const isMe =
                        message.isOwn !== undefined
                            ? message.isOwn
                            : currentUser?._id && senderId === currentUser._id;

                    const senderInfo = isMe ? {} : getSenderInfo(senderId);

                    return (
                        <Message
                            key={message._id || index}
                            senderName={isMe ? 'Me' : senderInfo.name}
                            avatar={
                                isMe
                                    ? getAvatarSrc(currentUser?.avatarURL)
                                    : senderInfo.avatar
                            }
                            text={message.content}
                            image={message.imgUrl}
                            messageType={message.messageType}
                            fileUrl={message.fileUrl}
                            isGroup={currentConvo?.isGroup}
                            time={formatTime(message.createdAt)}
                            isMe={isMe}
                            reactions={message.reactions || []}
                            onReact={(emoji) =>
                                reactToMessageAction(
                                    message._id,
                                    emoji,
                                    activeConversationId
                                )
                            }
                            isRecalled={message.isRecalled}
                            isPinned={message.isPinned}
                            isForwarded={message.isForwarded}
                            messageId={message._id}
                            createdAt={message.createdAt}
                        />
                    );
                })}

                <div ref={endOfMessagesRef} />
                </>
            )}
        </div>
    );
};


export default ChatBody;