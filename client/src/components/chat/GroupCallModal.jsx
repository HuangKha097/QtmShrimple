import React, { useEffect, useRef, useState, useMemo } from 'react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/GroupCall.module.scss';
import { useGroupCallStore } from '../../stores/useGroupCallStore';
import { useAuthStore } from '../../stores/useAuthStore';
import {
    Mic,
    MicOff,
    Video,
    VideoOff,
    ScreenShare,
    PhoneOff,
    Minus,
    Maximize2,
    Users,
    Tv,
    Radio
} from 'lucide-react';
import defaultAvatar from '../../../public/favicon.png';
import { ASSET_BASE_URL } from '../../config/env';

const cx = classNames.bind(styles);

// Sub-component for individual participant tile
const ParticipantTile = ({
    user,
    stream,
    isLocal = false,
    isMuted = false,
    isCameraOn = false,
    isScreenSharing = false,
    isSpeaking = false,
    displayName = 'Người dùng',
    avatar = defaultAvatar
}) => {
    const videoRef = useRef(null);
    const audioRef = useRef(null);

    const avatarSrc = useMemo(() => {
        if (!avatar) return defaultAvatar;
        if (avatar.startsWith('http') || avatar.startsWith('data:')) return avatar;
        return `${ASSET_BASE_URL}${avatar}`;
    }, [avatar]);

    // Attach stream to video tag if camera or screen sharing is active
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream, isCameraOn, isScreenSharing]);

    // Attach remote stream to audio element (unmuted for remote, muted for local)
    useEffect(() => {
        if (!isLocal && audioRef.current && stream) {
            audioRef.current.srcObject = stream;
        }
    }, [stream, isLocal]);

    const hasActiveVideo = (isCameraOn || isScreenSharing) && Boolean(stream);

    return (
        <div className={cx('participant-card', { speaking: isSpeaking && !isMuted })}>
            {/* Hidden audio element for remote audio */}
            {!isLocal && (
                <audio ref={audioRef} autoPlay playsInline />
            )}

            {hasActiveVideo ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal}
                    className={cx('camera-video')}
                />
            ) : (
                <div className={cx('avatar-view')}>
                    <div className={cx('avatar-wrapper')}>
                        <img
                            src={avatarSrc}
                            alt={displayName}
                            onError={(e) => { e.target.src = defaultAvatar; }}
                        />
                    </div>
                </div>
            )}

            {/* Top Right Status Badges */}
            <div className={cx('status-badges')}>
                {isMuted && (
                    <div className={cx('badge-icon', 'muted')} title="Đã tắt micro">
                        <MicOff size={14} />
                    </div>
                )}
                {isScreenSharing && (
                    <div className={cx('badge-icon', 'live')} title="Đang chia sẻ màn hình">
                        <Tv size={14} />
                    </div>
                )}
            </div>

            {/* Bottom Left Name Tag */}
            <div className={cx('participant-tag')}>
                <span className={cx('tag-name')}>{displayName}</span>
                {isLocal && <span className={cx('you-pill')}>Bạn</span>}
            </div>
        </div>
    );
};

const GroupCallModal = () => {
    const {
        isInCall,
        isModalOpen,
        groupInfo,
        localStream,
        screenStream,
        isMuted,
        isCameraOn,
        isScreenSharing,
        peers,
        speakingSockets,
        toggleMic,
        toggleCamera,
        toggleScreenShare,
        leaveGroupCall,
        toggleMinimize,
        setModalOpen,
    } = useGroupCallStore();

    const { user: currentUser } = useAuthStore();
    const [callDuration, setCallDuration] = useState(0);
    const screenVideoRef = useRef(null);

    // Call duration timer
    useEffect(() => {
        let interval;
        if (isInCall) {
            setCallDuration(0);
            interval = setInterval(() => {
                setCallDuration((prev) => prev + 1);
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isInCall]);

    // Attach local screen stream to theater view if sharing screen
    useEffect(() => {
        if (screenVideoRef.current && screenStream) {
            screenVideoRef.current.srcObject = screenStream;
        }
    }, [screenStream, isScreenSharing]);

    if (!isInCall || !isModalOpen) return null;

    const formatTimer = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const peerList = Object.values(peers);
    const totalCount = peerList.length + 1;

    // Check if anyone (including self) is sharing screen
    const remoteScreenSharer = peerList.find((p) => p.isScreenSharing && p.stream);
    const hasScreenShareActive = isScreenSharing || Boolean(remoteScreenSharer);

    const getGridClass = () => {
        if (totalCount === 1) return 'grid-1';
        if (totalCount === 2) return 'grid-2';
        if (totalCount <= 4) return 'grid-4';
        return 'grid-many';
    };

    return (
        <div className={cx('group-call-backdrop')}>
            <div className={cx('group-call-container')}>
                {/* 1. Header Bar */}
                <div className={cx('call-header')}>
                    <div className={cx('header-left')}>
                        <div className={cx('group-meta')}>
                            <h3 className={cx('group-name')}>
                                {groupInfo?.name || 'Phòng trò chuyện nhóm'}
                            </h3>
                            <span className={cx('participant-count')}>
                                {totalCount} người tham gia · {formatTimer(callDuration)}
                            </span>
                        </div>
                    </div>

                    <div className={cx('header-right')}>
                        <button
                            type="button"
                            className={cx('icon-btn')}
                            onClick={toggleMinimize}
                            title="Thu nhỏ cửa sổ"
                        >
                            <Minus size={18} />
                        </button>
                    </div>
                </div>

                {/* 2. Main Stage */}
                <div className={cx('call-stage')}>
                    {hasScreenShareActive ? (
                        /* Theater Mode with Large Screen Share */
                        <div className={cx('theater-layout')}>
                            <div className={cx('theater-screen-box')}>
                                <video
                                    ref={screenVideoRef}
                                    autoPlay
                                    playsInline
                                    muted={isScreenSharing}
                                    srcObject={
                                        isScreenSharing
                                            ? screenStream
                                            : remoteScreenSharer?.stream
                                    }
                                />
                                <div className={cx('theater-screen-badge')}>
                                    <Tv size={16} />
                                    <span>
                                        Màn hình của{' '}
                                        {isScreenSharing
                                            ? 'Bạn'
                                            : remoteScreenSharer?.user?.name || 'Thành viên'}
                                    </span>
                                </div>
                            </div>

                            {/* Participant Strip below screen */}
                            <div className={cx('theater-strip')}>
                                <ParticipantTile
                                    isLocal
                                    stream={localStream}
                                    isMuted={isMuted}
                                    isCameraOn={isCameraOn}
                                    isScreenSharing={isScreenSharing}
                                    isSpeaking={speakingSockets.has('local')}
                                    displayName={
                                        currentUser?.displayName || currentUser?.username || 'Bạn'
                                    }
                                    avatar={currentUser?.avatarURL}
                                />
                                {peerList.map((p) => (
                                    <ParticipantTile
                                        key={p.socketId}
                                        user={p.user}
                                        stream={p.stream}
                                        isMuted={p.isMuted}
                                        isCameraOn={p.isCameraOn}
                                        isScreenSharing={p.isScreenSharing}
                                        isSpeaking={speakingSockets.has(p.socketId)}
                                        displayName={
                                            p.user?.displayName ||
                                            p.user?.name ||
                                            p.user?.username ||
                                            'Người dùng'
                                        }
                                        avatar={p.user?.avatar || p.user?.avatarURL}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        /* Standard Dynamic Participant Grid */
                        <div className={cx('participants-grid', getGridClass())}>
                            {/* Local User Tile */}
                            <ParticipantTile
                                isLocal
                                stream={localStream}
                                isMuted={isMuted}
                                isCameraOn={isCameraOn}
                                isScreenSharing={isScreenSharing}
                                isSpeaking={speakingSockets.has('local')}
                                displayName={
                                    currentUser?.displayName || currentUser?.username || 'Bạn'
                                }
                                avatar={currentUser?.avatarURL}
                            />

                            {/* Remote Peers Tiles */}
                            {peerList.map((p) => (
                                <ParticipantTile
                                    key={p.socketId}
                                    user={p.user}
                                    stream={p.stream}
                                    isMuted={p.isMuted}
                                    isCameraOn={p.isCameraOn}
                                    isScreenSharing={p.isScreenSharing}
                                    isSpeaking={speakingSockets.has(p.socketId)}
                                    displayName={
                                        p.user?.displayName ||
                                        p.user?.name ||
                                        p.user?.username ||
                                        'Người dùng'
                                    }
                                    avatar={p.user?.avatar || p.user?.avatarURL}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* 3. Discord Bottom Control Dock */}
                <div className={cx('call-dock')}>
                    {/* Mic Toggle Button */}
                    <button
                        type="button"
                        className={cx('dock-btn', { muted: isMuted })}
                        onClick={toggleMic}
                        title={isMuted ? 'Bật Micro (Unmute)' : 'Tắt Micro (Mute)'}
                    >
                        {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                    </button>

                    {/* Camera Toggle Button */}
                    <button
                        type="button"
                        className={cx('dock-btn', { active: isCameraOn })}
                        onClick={toggleCamera}
                        title={isCameraOn ? 'Tắt Camera' : 'Bật Camera'}
                    >
                        {isCameraOn ? <Video size={22} /> : <VideoOff size={22} />}
                    </button>

                    {/* Screen Share / Livestream Button */}
                    <button
                        type="button"
                        className={cx('dock-btn', { active: isScreenSharing })}
                        onClick={toggleScreenShare}
                        title={isScreenSharing ? 'Dừng chia sẻ' : 'Chia sẻ màn hình'}
                    >
                        <ScreenShare size={22} />
                    </button>

                    {/* Leave / Disconnect Button */}
                    <button
                        type="button"
                        className={cx('dock-btn', 'disconnect')}
                        onClick={leaveGroupCall}
                        title="Rời phòng thoại"
                    >
                        <PhoneOff size={22} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GroupCallModal;
