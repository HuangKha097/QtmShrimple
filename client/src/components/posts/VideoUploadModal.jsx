import MotionPresence from '../common/MotionPresence';
import React, { useState, useRef } from 'react';
import { X, Upload, Film, Loader2 } from 'lucide-react';
import { usePostStore } from '../../stores/usePostStore';
import { useAuthStore } from '../../stores/useAuthStore';
import styles from '../../assets/css/VideoUploadModal.module.scss';
import classNames from 'classnames/bind';

const cx = classNames.bind(styles);

const VideoUploadModal = ({ isOpen, onClose }) => {
    const { createPost, isLoading } = usePostStore();
    const { user } = useAuthStore();
    
    const [content, setContent] = useState('');
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const fileInputRef = useRef(null);
    const [dragActive, setDragActive] = useState(false);



    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        validateAndSetFile(selectedFile);
    };

    const validateAndSetFile = (selectedFile) => {
        if (selectedFile && selectedFile.type.startsWith('video/')) {
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
        } else {
            alert("Please upload a valid video file.");
        }
    }

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const handleSubmit = async () => {
        if (!file) return;
        
        // Ensure duration check happens on server, but we can also check client side if we load metadata
        // For now, rely on server
        
        await createPost({
            content: content || "Check out this video! 🎥", // Default caption if empty
            image: file // reusing the 'image' field helper in store which handles media
        });
        
        onClose();
        setContent('');
        setFile(null);
        setPreview(null);
    };

    return (
        <MotionPresence open={isOpen} className={cx('modal-overlay')} onClick={onClose}>
            <div role="dialog" aria-modal="true" aria-labelledby="upload-video-title" className={cx('modal-content')} onClick={e => e.stopPropagation()}>
                <button className={cx('close-btn')} onClick={onClose} aria-label="Close upload">
                    <X size={24} />
                </button>
                
                <h2 id="upload-video-title" className={cx('modal-title')}>Upload Video</h2>
                
                <div className={cx('upload-body')}>
                    {!preview ? (
                        <div 
                            className={cx('drag-drop-zone', { active: dragActive })}
                            role="button" tabIndex={0}
                            onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); fileInputRef.current?.click(); } }}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload size={48} className={cx('upload-icon')} />
                            <h3>Select video to upload</h3>
                            <p>Or drag and drop a file</p>
                            <span className={cx('info-text')}>MP4 or WebM • 60s max</span>
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                accept="video/*" 
                                hidden 
                            />
                        </div>
                    ) : (
                        <div className={cx('preview-zone')}>
                            <video src={preview} controls className={cx('video-preview')} />
                            <button className={cx('remove-video-btn')} onClick={() => { setFile(null); setPreview(null); }}>
                                Change Video
                            </button>
                        </div>
                    )}
                    
                    <div className={cx('form-group')}>
                        <label>Caption</label>
                        <textarea 
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={`What's on your mind, ${user?.displayName || 'User'}?`}
                            rows={3}
                        />
                    </div>
                </div>

                <div className={cx('modal-footer')}>
                    <button className={cx('cancel-btn')} onClick={onClose} disabled={isLoading}>Cancel</button>
                    <button 
                        className={cx('post-btn')} 
                        onClick={handleSubmit}
                        disabled={!file || isLoading}
                    >
                        {isLoading ? <><Loader2 className={cx('spinner')} size={18} /> Posting...</> : 'Post'}
                    </button>
                </div>
            </div>
        </MotionPresence>
    );
};

export default VideoUploadModal;
