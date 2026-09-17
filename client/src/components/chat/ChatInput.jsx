import React, { useState, useMemo, useRef, useEffect } from 'react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/ChatInput.module.scss';
import { Paperclip, Send, Smile, Mic, MapPin, X, Image as ImageIcon, Plus, Camera, File } from 'lucide-react';
import { useChatStore } from "../../stores/useChatStore.js";
import { useAuthStore } from "../../stores/useAuthStore.js";
import EmojiPicker from 'emoji-picker-react';
import { useThemeStore } from '../../stores/useThemeStore';
import { toast } from 'sonner';
import api from '../../lib/axios.js';

const cx = classNames.bind(styles);

const ChatInput = () => {
    const isLight = useThemeStore(state => state.isLight);
    const [text, setText] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [image, setImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    const fileInputRef = useRef(null);
    const fileAttachmentInputRef = useRef(null);

    // Audio recording state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const audioChunksRef = useRef([]);
    const recordingTimerRef = useRef(null);

    useEffect(() => {
        return () => {
            if (recordingTimerRef.current) {
                clearInterval(recordingTimerRef.current);
            }
        };
    }, []);

    const { sendDirectMessage, sendGroupMessage, activeConversationId, conversations, friends } = useChatStore();
    const { user: currentUser } = useAuthStore();

    // Check chat permission logic
    const chatStatus = useMemo(() => {
        const currentConvo = conversations.find(c => c._id === activeConversationId);
        if (!activeConversationId) return { allowed: false, reason: "No selection" };

        const isTemp = activeConversationId.toString().startsWith('temp_');
        const isGroup = currentConvo?.isGroup && !isTemp;

        if (isGroup) return { allowed: true, reason: "" };

        let partnerId = null;
        if (isTemp) {
            partnerId = activeConversationId.split('temp_')[1];
        } else if (currentConvo) {
            const partner = currentConvo.participants.find(p => p._id !== currentUser._id);
            partnerId = partner ? partner._id : null;
        }

        if (!partnerId) return { allowed: false, reason: "User not found" };

        // Check if I blocked them
        if (currentUser.blockedUsers && currentUser.blockedUsers.includes(partnerId)) {
            return { allowed: false, reason: "You have blocked this user" };
        }

        // Check friendship
        const isFriend = friends.some(f => f._id.toString() === partnerId.toString());
        if (!isFriend) {
            return { allowed: false, reason: "You are not friends with this user" };
        }

        return { allowed: true, reason: "" };

    }, [activeConversationId, conversations, friends, currentUser]);


    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            // Toast error here ideally
            console.error("Please select an image file");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewUrl(reader.result);
            setImage(file);
        };
        reader.readAsDataURL(file);
    };

    const removeImage = () => {
        setImage(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleFileAttachmentChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const toastId = toast.loading("Uploading attachment...");
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await api.post("/api/messages/upload", formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            const cloudUrl = response.data.url;
            const originalName = response.data.originalName || file.name;

            const currentConvo = conversations.find(c => c._id === activeConversationId);
            const isGroup = currentConvo?.isGroup && !activeConversationId.toString().startsWith('temp_');

            if (isGroup) {
                await sendGroupMessage(activeConversationId, originalName, null, cloudUrl, 'file');
            } else {
                let recipientId = null;
                if (activeConversationId.toString().startsWith('temp_')) {
                    recipientId = activeConversationId.split('temp_')[1];
                } else if (currentConvo) {
                    const partner = currentConvo.participants.find(p => p._id !== currentUser._id);
                    recipientId = partner ? partner._id : null;
                }

                if (recipientId) {
                    const convoIdToSend = activeConversationId.toString().startsWith('temp_') ? null : activeConversationId;
                    await sendDirectMessage(recipientId, originalName, convoIdToSend, null, cloudUrl, 'file');
                }
            }
            toast.success("Attachment sent successfully!", { id: toastId });
        } catch (error) {
            console.error("Failed to upload/send file:", error);
            toast.error(error.response?.data?.message || "Failed to upload file", { id: toastId });
        } finally {
            if (fileAttachmentInputRef.current) {
                fileAttachmentInputRef.current.value = "";
            }
            setShowActionsMenu(false);
        }
    };

    const handleShareLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            return;
        }

        const toastId = toast.loading("Fetching location...");

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const coords = JSON.stringify({
                    lat: latitude,
                    lng: longitude,
                    address: "Shared Location"
                });

                try {
                    const currentConvo = conversations.find(c => c._id === activeConversationId);
                    const isGroup = currentConvo?.isGroup && !activeConversationId.toString().startsWith('temp_');

                    if (isGroup) {
                        await sendGroupMessage(activeConversationId, coords, null, null, 'location');
                    } else {
                        let recipientId = null;
                        if (activeConversationId.toString().startsWith('temp_')) {
                            recipientId = activeConversationId.split('temp_')[1];
                        } else if (currentConvo) {
                            const partner = currentConvo.participants.find(p => p._id !== currentUser._id);
                            recipientId = partner ? partner._id : null;
                        }

                        if (recipientId) {
                            const convoIdToSend = activeConversationId.toString().startsWith('temp_') ? null : activeConversationId;
                            await sendDirectMessage(recipientId, coords, convoIdToSend, null, null, 'location');
                        }
                    }
                    toast.success("Location shared successfully!", { id: toastId });
                } catch (err) {
                    console.error("Failed to share location:", err);
                    toast.error("Failed to share location", { id: toastId });
                } finally {
                    setShowActionsMenu(false);
                }
            },
            (error) => {
                console.error("Error getting geolocation:", error);
                let errorMsg = "Unable to retrieve your location";
                if (error.code === error.PERMISSION_DENIED) {
                    errorMsg = "Location access denied. Please check permissions.";
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    errorMsg = "Location information is unavailable.";
                } else if (error.code === error.TIMEOUT) {
                    errorMsg = "Location request timed out.";
                }
                toast.error(errorMsg, { id: toastId });
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioChunksRef.current = [];

            let options = {};
            if (MediaRecorder.isTypeSupported('audio/webm')) {
                options = { mimeType: 'audio/webm' };
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
                options = { mimeType: 'audio/mp4' };
            } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
                options = { mimeType: 'audio/ogg' };
            } else if (MediaRecorder.isTypeSupported('audio/wav')) {
                options = { mimeType: 'audio/wav' };
            }

            const recorder = new MediaRecorder(stream, options);

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = async () => {
                if (audioChunksRef.current.length === 0) {
                    return;
                }

                const mimeType = recorder.mimeType || 'audio/webm';
                const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
                audioChunksRef.current = [];
                
                stream.getTracks().forEach(track => track.stop());

                if (audioBlob.size < 500) {
                    toast.error("Recording is too short.");
                    return;
                }

                let ext = 'webm';
                if (mimeType.includes('mp4')) ext = 'mp4';
                else if (mimeType.includes('ogg')) ext = 'ogg';
                else if (mimeType.includes('wav')) ext = 'wav';
                else if (mimeType.includes('aac')) ext = 'aac';

                const toastId = toast.loading("Sending voice message...");

                const formData = new FormData();
                formData.append("file", audioBlob, `voice-note-${Date.now()}.${ext}`);

                try {
                    const response = await api.post("/api/messages/upload", formData, {
                        headers: {
                            'Content-Type': 'multipart/form-data'
                        }
                    });
                    const cloudUrl = response.data.url;

                    const currentConvo = conversations.find(c => c._id === activeConversationId);
                    const isGroup = currentConvo?.isGroup && !activeConversationId.toString().startsWith('temp_');

                    if (isGroup) {
                        await sendGroupMessage(activeConversationId, "Voice Message", null, cloudUrl, 'audio');
                    } else {
                        let recipientId = null;
                        if (activeConversationId.toString().startsWith('temp_')) {
                            recipientId = activeConversationId.split('temp_')[1];
                        } else if (currentConvo) {
                            const partner = currentConvo.participants.find(p => p._id !== currentUser._id);
                            recipientId = partner ? partner._id : null;
                        }

                        if (recipientId) {
                            const convoIdToSend = activeConversationId.toString().startsWith('temp_') ? null : activeConversationId;
                            await sendDirectMessage(recipientId, "Voice Message", convoIdToSend, null, cloudUrl, 'audio');
                        }
                    }
                    toast.success("Voice message sent!", { id: toastId });
                } catch (err) {
                    console.error("Failed to send voice message:", err);
                    toast.error(err.response?.data?.message || "Failed to send voice message", { id: toastId });
                }
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
            setRecordingTime(0);

            recordingTimerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            toast.error("Microphone access denied or not available");
        }
    };

    const stopAndSendRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
        }
        cleanupRecordingState();
    };

    const cancelRecording = () => {
        audioChunksRef.current = [];
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop());
        }
        cleanupRecordingState();
        toast.info("Recording cancelled");
    };

    const cleanupRecordingState = () => {
        setIsRecording(false);
        setRecordingTime(0);
        setMediaRecorder(null);
        if (recordingTimerRef.current) {
            clearInterval(recordingTimerRef.current);
            recordingTimerRef.current = null;
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const onEmojiClick = (emojiObject) => {
        setText((prev) => prev + emojiObject.emoji);
    };

    const [isSending, setIsSending] = useState(false);

    const handleSendMessage = async () => {
        if ((!text.trim() && !image) || !chatStatus.allowed || isSending) return;

        setIsSending(true);
        const currentConvo = conversations.find(c => c._id === activeConversationId);
        const isGroup = currentConvo?.isGroup && !activeConversationId.toString().startsWith('temp_');

        // Use previewUrl as base64 image data for simple handling
        const imageToSend = previewUrl;

        try {
            if (isGroup) {
                await sendGroupMessage(activeConversationId, text, imageToSend, null, 'text'); // Type infer inside store if needed? Or pass 'image' if only image?
            } else {
                let recipientId = null;
                if (activeConversationId.toString().startsWith('temp_')) {
                    recipientId = activeConversationId.split('temp_')[1];
                } else if (currentConvo) {
                    const partner = currentConvo.participants.find(p => p._id !== currentUser._id);
                    recipientId = partner ? partner._id : null;
                }

                if (recipientId) {
                    const convoIdToSend = activeConversationId.toString().startsWith('temp_') ? null : activeConversationId;
                    await sendDirectMessage(recipientId, text, convoIdToSend, imageToSend, null, 'text');
                }
            }
            // Reset state
            setText("");
            removeImage();
            setShowEmojiPicker(false);
        } catch (error) {
            console.error("Failed to send message:", error);
            toast.error(error.response?.data?.message || "Failed to send message");
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !isSending) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    if (!chatStatus.allowed) {
        return (
            <div className={cx('container')}>
                <div className={cx('input-wrapper', 'disabled-banner')}>
                    <span className={cx('disabled-text')}>
                        {chatStatus.reason}
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className={cx('container')}>
            {showEmojiPicker && (
                <div className={cx('emoji-picker-container')}>
                    <EmojiPicker onEmojiClick={onEmojiClick} theme={isLight ? "light" : "dark"} width={300} height={400} />
                </div>
            )}

            {previewUrl && (
                <div className={cx('preview-area')}>
                    <div className={cx('preview-img-wrapper')}>
                        <img src={previewUrl} alt="Preview" />
                        <button className={cx('close-btn')} onClick={removeImage}>
                            <X size={12} />
                        </button>
                    </div>
                </div>
            )}

            <div className={cx('input-wrapper')}>
                <div className={cx('left-actions')}>
                    <button
                        className={cx('btn', 'more-btn', { active: showActionsMenu })}
                        onClick={() => setShowActionsMenu(!showActionsMenu)}
                        disabled={isRecording}
                    >
                        <Plus size={22} style={{ transform: showActionsMenu ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform 0.2s' }} />
                    </button>

                    <div className={cx('actions-menu', { show: showActionsMenu })}>
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                        <input
                            type="file"
                            ref={fileAttachmentInputRef}
                            style={{ display: 'none' }}
                            accept="*"
                            onChange={handleFileAttachmentChange}
                        />
                        <button
                            className={cx('btn', 'action-item')}
                            onClick={() => { fileInputRef.current?.click(); setShowActionsMenu(false); }}
                            title="Photo/Video"
                        >
                            <ImageIcon size={20} />
                        </button>
                        <button className={cx('btn', 'action-item')} title="Camera" onClick={()=> alert("Camera is coming soon")}>
                            <Camera size={20} />
                        </button>
                        <button 
                            className={cx('btn', 'action-item')} 
                            title="File" 
                            onClick={() => { fileAttachmentInputRef.current?.click(); setShowActionsMenu(false); }}
                        >
                            <File size={20} />
                        </button>
                        <button 
                            className={cx('btn', 'action-item')} 
                            title="Location" 
                            onClick={handleShareLocation}
                        >
                            <MapPin size={20} />
                        </button>
                    </div>
                </div>

                {isRecording ? (
                    <div className={cx('recording-hud')}>
                        <div className={cx('recording-indicator')}>
                            <span className={cx('pulse-dot')}></span>
                            <span className={cx('recording-text')}>Recording Audio... {formatTime(recordingTime)}</span>
                        </div>
                        <div className={cx('recording-wave')}>
                            <div className={cx('wave-bar', 'bar-1')}></div>
                            <div className={cx('wave-bar', 'bar-2')}></div>
                            <div className={cx('wave-bar', 'bar-3')}></div>
                            <div className={cx('wave-bar', 'bar-4')}></div>
                            <div className={cx('wave-bar', 'bar-5')}></div>
                        </div>
                        <div className={cx('recording-actions')}>
                            <button className={cx('btn', 'cancel-rec-btn')} onClick={cancelRecording} title="Cancel Recording">
                                <X size={20} />
                            </button>
                            <button className={cx('btn', 'send-rec-btn')} onClick={stopAndSendRecording} title="Send Recording">
                                <Send size={20} />
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className={cx('input-field-container')}>
                            <input
                                type="text"
                                placeholder="Type a message..."
                                className={cx('text-input')}
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onFocus={() => { setShowEmojiPicker(false); setShowActionsMenu(false); }}
                            />
                            <button
                                className={cx('btn', 'emoji-btn')}
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            >
                                <Smile size={20} />
                            </button>
                        </div>

                        <div className={cx("btn-group")}>
                            <button
                                className={cx('btn', 'mic-btn')}
                                onClick={startRecording}
                                title="Record Voice Message"
                            >
                                <Mic size={20} />
                            </button>
                            <button
                                className={cx('btn', 'send-btn')}
                                onClick={handleSendMessage}
                                disabled={(!text.trim() && !image) || isSending}
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default ChatInput;