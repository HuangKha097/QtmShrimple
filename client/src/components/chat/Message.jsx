import React, { useState } from 'react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/Message.module.scss';
import profilePic_test from "../../../public/favicon.png";
import { X, MapPin, ExternalLink, File, Download, Pin, CornerUpRight, RotateCcw, Trash2, MoreHorizontal, PinOff } from 'lucide-react';
import { useChatStore } from "../../stores/useChatStore.js";
import { useAuthStore } from "../../stores/useAuthStore.js";
import CustomAudioPlayer from './CustomAudioPlayer.jsx';
import ForwardModal from './ForwardModal.jsx';
import { toast } from 'sonner';

const cx = classNames.bind(styles);

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

const Message = ({
                     text,
                     time,
                     senderName,
                     avatar = profilePic_test,
                     isMe = false,
                     image = null,
                     messageType = 'text',
                     fileUrl = null,
                     isGroup = false,
                     reactions = [],
                     onReact,
                     isRecalled = false,
                     isPinned = false,
                     isForwarded = false,
                     messageId,
                     createdAt
                 }) => {
    const [showPicker, setShowPicker] = useState(false);
    const [pickerStyle, setPickerStyle] = useState({});
    const [showDropdown, setShowDropdown] = useState(false);
    const [isForwardOpen, setIsForwardOpen] = useState(false);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const containerRef = React.useRef(null);
    const timeoutRef = React.useRef(null);

    const { recallMessageAction, deleteMessageForMeAction, togglePinMessageAction } = useChatStore();

    let locationData = null;
    if (messageType === 'location' && text && !isRecalled) {
        try {
            locationData = JSON.parse(text);
        } catch (e) {
            console.error("Failed to parse coordinates JSON:", e);
        }
    }

    // Group reactions by emoji
    const reactionsByEmoji = reactions.reduce((acc, curr) => {
        if (!acc[curr.reaction]) {
            acc[curr.reaction] = [];
        }
        acc[curr.reaction].push(curr.userId);
        return acc;
    }, {});

    const hasReactions = Object.keys(reactionsByEmoji).length > 0;

    const handleMouseEnter = () => {
        if (isRecalled) return; // Disable picker for recalled messages

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }

        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            // Calculate fixed position for picker to be above the message
            const top = rect.top - 55; 
            
            const style = {
                position: 'fixed',
                top: `${top}px`,
                zIndex: 9999,
            };

            if (isMe) {
                style.right = `${window.innerWidth - rect.right}px`;
                style.left = 'auto';
            } else {
                style.left = `${rect.left}px`;
                style.right = 'auto';
            }
            setPickerStyle(style);
            setShowPicker(true);
        }
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setShowPicker(false);
            setShowDropdown(false);
        }, 300); // 300ms delay to allow moving to picker
    };

    // 3-hour limit check
    const isRecallable = isMe && createdAt && (Date.now() - new Date(createdAt).getTime() < 3 * 60 * 60 * 1000);

    const handleTogglePin = async (e) => {
        e.stopPropagation();
        try {
            await togglePinMessageAction(messageId);
            toast.success(isPinned ? "Đã bỏ ghim tin nhắn!" : "Đã ghim tin nhắn!");
            setShowPicker(false);
            setShowDropdown(false);
        } catch (err) {
            console.error("Failed to pin:", err);
            toast.error("Không thể ghim tin nhắn");
        }
    };

    const handleRecall = async (e) => {
        e.stopPropagation();
        try {
            await recallMessageAction(messageId);
            toast.success("Đã thu hồi tin nhắn!");
            setShowPicker(false);
            setShowDropdown(false);
        } catch (err) {
            console.error("Failed to recall:", err);
            toast.error("Không thể thu hồi tin nhắn");
        }
    };

    const handleDeleteForMe = async (e) => {
        e.stopPropagation();
        try {
            await deleteMessageForMeAction(messageId);
            toast.success("Đã xóa tin nhắn đối với bạn!");
            setShowPicker(false);
            setShowDropdown(false);
        } catch (err) {
            console.error("Failed to delete:", err);
            toast.error("Không thể xóa tin nhắn");
        }
    };

    return (
        <div id={messageId ? `msg-${messageId}` : undefined} className={cx('message-wrapper', { me: isMe })}>
            {!isMe && <img src={avatar} alt="avatar" className={cx('avatar')} onError={(e) => {e.target.src = profilePic_test}}/>}

            <div className={cx('message-content')}>
                {(!isMe && isGroup && senderName) && (
                    <p className={cx('sender-name')}>{senderName}</p>
                )}

                {isForwarded && !isRecalled && (
                    <div className={cx('forwarded-label')}>
                        <CornerUpRight size={12} className={cx('forward-icon')} />
                        <span>Đã chuyển tiếp</span>
                    </div>
                )}

                <div 
                    className={cx('message-container')} 
                    ref={containerRef}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    {/* Reaction Picker - Fixed Position */}
                    {showPicker && !isRecalled && (
                         <div 
                            className={cx('reaction-picker', { 'picker-me': isMe })} 
                            style={pickerStyle}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                         >
                            {EMOJIS.map(emoji => (
                                <span 
                                    key={emoji} 
                                    className={cx('emoji-btn')}
                                    onClick={() => {
                                        onReact(emoji);
                                        setShowPicker(false);
                                    }}
                                >
                                    {emoji}
                                </span>
                            ))}
                            
                            {/* Triple-dot actions trigger */}
                            <span 
                                className={cx('emoji-btn', 'more-actions-btn', { active: showDropdown })}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowDropdown(!showDropdown);
                                }}
                            >
                                <MoreHorizontal size={18} />
                            </span>

                            {/* Dropdown menu */}
                            {showDropdown && (
                                <div 
                                    className={cx('actions-dropdown', { 'dropdown-me': isMe })} 
                                    onClick={(e) => e.stopPropagation()}
                                    onMouseEnter={handleMouseEnter}
                                    onMouseLeave={handleMouseLeave}
                                >
                                    <button className={cx('dropdown-item')} onClick={handleTogglePin}>
                                        {isPinned ? <PinOff size={14} className={cx('icon')} /> : <Pin size={14} className={cx('icon')} />}
                                        <span>{isPinned ? "Bỏ ghim" : "Ghim"}</span>
                                    </button>
                                    <button className={cx('dropdown-item')} onClick={() => { setIsForwardOpen(true); setShowPicker(false); setShowDropdown(false); }}>
                                        <CornerUpRight size={14} className={cx('icon')} />
                                        <span>Chuyển tiếp</span>
                                    </button>
                                    {isRecallable && (
                                        <button className={cx('dropdown-item', 'recall-item')} onClick={handleRecall}>
                                            <RotateCcw size={14} className={cx('icon')} />
                                            <span>Thu hồi</span>
                                        </button>
                                    )}
                                    <button className={cx('dropdown-item', 'delete-item')} onClick={handleDeleteForMe}>
                                        <Trash2 size={14} className={cx('icon')} />
                                        <span>Xóa bên tôi</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {isRecalled ? (
                        <div className={cx('message-bubble', 'recalled-bubble')}>
                            Tin nhắn đã bị thu hồi
                        </div>
                    ) : (
                        <>
                            {image && (messageType === 'image' || messageType === 'text') && (
                                <img 
                                    src={image} 
                                    alt="chat-content" 
                                    className={cx('message-image')}
                                    onClick={() => setIsImageModalOpen(true)}
                                    style={{ cursor: 'pointer', marginBottom: '0.6rem' }}
                                />
                            )}
                            
                            {messageType === 'location' && locationData ? (
                                <div className={cx('location-bubble')}>
                                    <div className={cx('location-card')}>
                                        <div className={cx('location-header')}>
                                            <MapPin size={18} className={cx('pin-icon')} />
                                            <span>{locationData.address || "Shared Location"}</span>
                                        </div>
                                        <div className={cx('map-preview')}>
                                            <iframe
                                                title="Location Preview"
                                                width="100%"
                                                height="160"
                                                frameBorder="0"
                                                src={`https://maps.google.com/maps?q=${locationData.lat},${locationData.lng}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                                allowFullScreen
                                            ></iframe>
                                        </div>
                                        <a 
                                            href={`https://www.google.com/maps?q=${locationData.lat},${locationData.lng}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={cx('maps-btn')}
                                        >
                                            <span>Open in Google Maps</span>
                                            <ExternalLink size={12} />
                                        </a>
                                    </div>
                                    <p className={cx('message-time')} style={{ marginTop: '0.4rem' }}>{time}</p>
                                </div>
                            ) : messageType === 'file' ? (
                                <div className={cx('file-bubble')}>
                                    <div className={cx('file-card')}>
                                        <div className={cx('file-info')}>
                                            <div className={cx('file-icon-wrapper')}>
                                                <File size={22} className={cx('file-icon')} />
                                            </div>
                                            <div className={cx('file-details')}>
                                                <div className={cx('file-name')} title={text}>
                                                    {text || "Attachment File"}
                                                </div>
                                                <div className={cx('file-meta')}>
                                                    Document
                                                </div>
                                            </div>
                                        </div>
                                        <a 
                                            href={fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            download={text || "download"}
                                            className={cx('file-download-btn')}
                                            title="Download"
                                        >
                                            <Download size={16} />
                                        </a>
                                    </div>
                                    <p className={cx('message-time')} style={{ marginTop: '0.4rem' }}>{time}</p>
                                </div>
                            ) : messageType === 'audio' ? (
                                <div className={cx('audio-bubble')}>
                                    <CustomAudioPlayer src={fileUrl} />
                                    <p className={cx('message-time')} style={{ marginTop: '0.4rem' }}>{time}</p>
                                </div>
                            ) : (
                                // Standard text bubble
                                (!image || text) && (
                                    <div className={cx('message-bubble', { 'pinned-message': isPinned })}>
                                        {text && <p className={cx('message-text')}>{text}</p>}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                                            <p className={cx('message-time')}>{time}</p>
                                            {isPinned && <Pin size={10} className={cx('pinned-indicator-icon')} style={{ opacity: 0.6, color: '#facc15' }} />}
                                        </div>
                                    </div>
                                )
                            )}
                        </>
                    )}

                    {/* Reactions Display (Only if not recalled) */}
                    {hasReactions && !isRecalled && (
                        <div className={cx('reactions-display', { 'reactions-me': isMe })}>
                            {Object.entries(reactionsByEmoji).map(([emoji, users]) => (
                                <ReactionItem key={emoji} emoji={emoji} users={users} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Image Modal Overlay */}
            {isImageModalOpen && (
                <div 
                    style={{
                        position: 'fixed',
                        top: 0, 
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: 'rgba(0,0,0,1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 10000
                    }} 
                    onClick={() => setIsImageModalOpen(false)}
                >
                    <img 
                        src={image} 
                        alt="Full size" 
                        style={{
                            maxWidth: '90%',
                            maxHeight: '90%',
                            objectFit: 'contain'
                        }} 
                    />
                    <button 
                        onClick={() => setIsImageModalOpen(false)}
                        style={{
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            background: 'none',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        <X size={32} />
                    </button>
                </div>
            )}

            {/* Forward Modal Overlay */}
            {isForwardOpen && (
                <ForwardModal messageId={messageId} onClose={() => setIsForwardOpen(false)} />
            )}
        </div>
    );
};

const ReactionItem = ({ emoji, users }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const { friends } = useChatStore.getState();
    const { user: currentUser } = useAuthStore.getState();

    const userNames = users.map(u => {
        if (typeof u === 'object' && (u.displayName || u.username)) {
             if (u._id === currentUser?._id) return "You";
             return u.displayName || u.username;
        }

        const userIdStr = typeof u === 'object' ? u._id : u;
        if (userIdStr === currentUser?._id) return "You";

        const friend = friends.find(f => f._id === userIdStr);
        if (friend) return friend.displayName || friend.username;

        return "Unknown";
    });

    const displayNames = userNames.slice(0, 5);
    const remaining = userNames.length - 5;

    let tooltipText = displayNames.join(', ');
    if (remaining > 0) tooltipText += ` and ${remaining} others`;

    return (
        <div 
            className={cx('reaction-item')}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            {emoji} <span className={cx('reaction-count')}>{users.length > 1 ? users.length : ''}</span>
            
            {showTooltip && (
                <div className={cx('reaction-tooltip')}>
                    {tooltipText}
                </div>
            )}
        </div>
    );
};

export default Message;