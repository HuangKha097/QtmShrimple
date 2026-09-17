import React, { useMemo, useState, useEffect } from 'react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/ChatInfo.module.scss';
import defaultAvatar from "../../../public/favicon.png";
import { useAuthStore } from "../../stores/useAuthStore.js";
import { chatService } from "../../services/chatService";
import { userSettingsService } from "../../services/userSettingsService";
import { FileText, Ban, X, Image as ImageIcon, Users, Info } from "lucide-react";

import { useChatStore } from "../../stores/useChatStore.js";
import { ASSET_BASE_URL } from "../../config/env.js";

const cx = classNames.bind(styles);

const ChatInfo = ({ chat, onClose }) => {
    const { user: currentUser } = useAuthStore();
    const { friends } = useChatStore();
    const [media, setMedia] = useState({ images: [], files: [] });
    const [loadingMedia, setLoadingMedia] = useState(false);
    const [isBlocked, setIsBlocked] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);

    useEffect(() => {
        if (chat?._id) {
            setLoadingMedia(true);
            chatService.getSharedMedia(chat._id)
                .then(data => setMedia(data))
                .catch(err => console.error("Failed to fetch media", err))
                .finally(() => setLoadingMedia(false));
        }
    }, [chat?._id]);


    const isGroup = chat?.isGroup;
    const participants = chat?.participants || [];

    const sortedParticipants = useMemo(() => {
        return [...(chat?.participants || [])].sort((a, b) => {
            if (a._id === currentUser?._id) return -1;
            if (b._id === currentUser?._id) return 1;
            return 0;
        });
    }, [chat?.participants, currentUser]);

    if (!chat) return null;

    let partner = !isGroup ? (participants.find(p => p._id !== currentUser?._id) || participants[0]) : null;

    if (partner && friends.length > 0) {
        const friend = friends.find(f => f._id === partner._id || f._id === partner._id?.toString());
        if (friend) {
            partner = { ...partner, ...friend };
        }
    }

    const displayName = isGroup ? (chat.name || chat.group?.name || "Group Chat") : (partner?.displayName || partner?.username || "User");
    const subInfo = isGroup ? `${participants.length} members` : (partner?.email || "No email provided");
    const partnerId = partner?._id;

    const getAvatarSrc = (url) => {
        if (!url) return defaultAvatar;
        if (url.startsWith('http') || url.startsWith('data:')) return url;
        return `${ASSET_BASE_URL}${url}`;
    };

    const renderAvatar = () => {
        if (isGroup) {
            if (chat.avatarURL || chat.group?.avatarURL) {
                return (
                    <img
                        src={getAvatarSrc(chat.avatarURL || chat.group?.avatarURL)}
                        alt="Group Avatar"
                        className={cx('hero-avatar')}
                        onError={(e) => e.target.src = defaultAvatar}
                    />
                );
            }
            return (
                <div className={cx('hero-avatar-stack')}>
                    <img src={getAvatarSrc(participants[0]?.avatarURL)} className={cx('stack-img', 'first')} alt="" />
                    {participants.length > 1 && <img src={getAvatarSrc(participants[1]?.avatarURL)} className={cx('stack-img', 'second')} alt="" />}
                </div>
            );
        }

        return (
            <img
                src={getAvatarSrc(partner?.avatarURL)}
                alt="avatar"
                className={cx('hero-avatar')}
                onError={(e) => e.target.src = defaultAvatar}
            />
        );
    };

    const handleBlockUser = async () => {
        if (partnerId && window.confirm(`Are you sure you want to block ${displayName}?`)) {
            try {
                await userSettingsService.blockUser(partnerId);
                await useAuthStore.getState().checkAuth();
                setIsBlocked(true);
            } catch (error) {
                console.error("Failed to block user", error);
            }
        }
    };

    return (
        <div 
            className={cx('chat-info-container')}

        >
            <header className={cx('header-nav')}>
                <button className={cx('back-btn')} onClick={onClose} aria-label="Close Info">
                    <X size={24} strokeWidth={2.5} />
                </button>
                <span className={cx('nav-title')}>Details</span>
            </header>

            <section className={cx('profile-hero')} >
                <div className={cx('hero-content')}>
                    <div className={cx('hero-avatar-container')}>
                        {renderAvatar()}
                        {!isGroup && partner?.status === 'online' && <div className={cx('online-indicator')} />}
                    </div>
                    <h1 className={cx('hero-name')}>{displayName}</h1>
                    <p className={cx('hero-sub')}>{subInfo}</p>
                </div>
            </section>

            <div className={cx('scroll-content')}>
                {/* Media Section */}
                <section className={cx('info-section')} >
                    <div className={cx('section-header')}>
                        <div className={cx('header-title')}>
                            <ImageIcon size={18} />
                            <span>Shared Media</span>
                        </div>
                        <span className={cx('count-badge')}>{media.images.length}</span>
                    </div>
                    <div className={cx('media-grid')}>
                        {loadingMedia ? (
                            <div className={cx('skeleton-grid')}>{[1,2,3].map(i => <div key={i} className={cx('skeleton-item')} />)}</div>
                        ) : media.images.length > 0 ? (
                            media.images.slice(0, 6).map((img) => (
                                <div 
                                    key={img._id} 
                                    className={cx('media-item-wrapper')}

                                    onClick={() => setSelectedImage(img.url)}
                                >
                                    <img src={img.url} alt="Shared" className={cx('media-img')} />
                                </div>
                            ))
                        ) : (
                            <div className={cx('empty-state')}>
                                <p>No photos yet</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Files Section */}
                <section className={cx('info-section')} >
                    <div className={cx('section-header')}>
                        <div className={cx('header-title')}>
                            <FileText size={18} />
                            <span>Files</span>
                        </div>
                    </div>
                    <div className={cx('files-list')}>
                        {loadingMedia ? (
                            <div className={cx('skeleton-list')}>{[1,2].map(i => <div key={i} className={cx('skeleton-line')} />)}</div>
                        ) : media.files.length > 0 ? (
                            media.files.map((file) => (
                                <a key={file._id} href={file.url} target="_blank" rel="noopener noreferrer" className={cx('file-card')}>
                                    <div className={cx('file-icon')}>
                                        <FileText size={20} />
                                    </div>
                                    <div className={cx('file-info')}>
                                        <span className={cx('file-name')}>{file.fileName || "Shared File"}</span>
                                        <span className={cx('file-meta')}>Document</span>
                                    </div>
                                </a>
                            ))
                        ) : (
                            <div className={cx('empty-state')}>
                                <p>No files shared</p>
                            </div>
                        )}
                    </div>
                </section>

                {/* Members Section (Groups Only) */}
                {isGroup && (
                    <section className={cx('info-section')} >
                        <div className={cx('section-header')}>
                            <div className={cx('header-title')}>
                                <Users size={18} />
                                <span>Members</span>
                            </div>
                            <span className={cx('count-badge')}>{participants.length}</span>
                        </div>
                        <div className={cx('members-list')}>
                            {sortedParticipants.map((member) => (
                                <div key={member._id} className={cx('member-row')}>
                                    <img 
                                        src={getAvatarSrc(member.avatarURL)} 
                                        className={cx('member-avatar')} 
                                        alt="" 
                                    />
                                    <div className={cx('member-info')}>
                                        <span className={cx('member-name')}>
                                            {member._id === currentUser?._id ? "You" : (member.displayName || member.username)}
                                        </span>
                                        {member._id === currentUser?._id && <span className={cx('me-badge')}>You</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Actions */}
                {!isGroup && (
                    <section className={cx('info-section', 'no-border')} >
                        <button className={cx('danger-action-btn', { blocked: isBlocked })} onClick={handleBlockUser}>
                            <Ban size={18} />
                            <span>{isBlocked ? "User Blocked" : "Block User"}</span>
                        </button>
                    </section>
                )}
            </div>

            {/* Image Preview Overlay */}

                {selectedImage && (
                    <div 
                        className={cx('overlay')}

                        onClick={() => setSelectedImage(null)}
                    >
                        <img 
                            src={selectedImage} 

                            className={cx('full-img')} 
                        />
                        <button className={cx('overlay-close')}><X size={32} /></button>
                    </div>
                )}

        </div>
    );
};

export default ChatInfo;
