import React, { useEffect, useRef, useState, useMemo } from 'react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/AntiPeep.module.scss';
import { 
    X, 
    Delete, 
    Loader2
} from 'lucide-react';

const cx = classNames.bind(styles);

const FaceIDCalibrationModal = ({
    isOpen,
    stream,
    step, // 'face' | 'pin'
    guidanceText,
    onCaptureFace,
    isCapturing,
    tempPin,
    setTempPin,
    onSave,
    onClose,
    landmarksData
}) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const animationFrameRef = useRef(null);

    // Attach stream to modal video
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream, isOpen, step]);

    // Check if face is well aligned
    const isAligned = useMemo(() => {
        if (!guidanceText) return false;
        const text = guidanceText.toLowerCase();
        return text.includes('perfect') || text.includes('hoàn hảo') || text.includes('hold still');
    }, [guidanceText]);

    const isWarning = useMemo(() => {
        if (!guidanceText) return false;
        const text = guidanceText.toLowerCase();
        return text.includes('no face') || text.includes('multiple');
    }, [guidanceText]);

    // Clean Vietnamese guidance translations
    const translatedGuidance = useMemo(() => {
        if (!guidanceText) return 'Đang khởi động camera...';
        const t = guidanceText.toLowerCase();
        if (t.includes('no face')) return 'Không tìm thấy khuôn mặt. Hãy nhìn thẳng vào camera.';
        if (t.includes('multiple')) return 'Phát hiện nhiều người. Hãy đảm bảo bạn ở một mình.';
        if (t.includes('too far')) return 'Đưa khuôn mặt lại gần hơn';
        if (t.includes('too close')) return 'Lùi khuôn mặt lại một chút';
        if (t.includes('move left')) return 'Di chuyển sang trái ->';
        if (t.includes('move right')) return '<- Di chuyển sang phải';
        if (t.includes('move down')) return 'Hạ mặt xuống một chút';
        if (t.includes('move up')) return 'Nâng mặt lên một chút';
        if (t.includes('perfect') || t.includes('hold still')) return 'Khuôn mặt đã căn chỉnh hoàn hảo. Giữ yên để quét.';
        return guidanceText;
    }, [guidanceText]);

    // Draw Minimal Apple 3D Face Wireframe & Landmark Mesh
    useEffect(() => {
        if (step !== 'face') return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let angle = 0;

        const render = () => {
            const width = canvas.width = 230;
            const height = canvas.height = 230;
            ctx.clearRect(0, 0, width, height);

            if (landmarksData && landmarksData.positions && landmarksData.positions.length > 0) {
                // Real-time Facial Landmark Overlay in Clean Monochromatic White
                const points = landmarksData.positions;
                const scaleX = width / (landmarksData.videoWidth || 320);
                const scaleY = height / (landmarksData.videoHeight || 240);

                const getPt = (idx) => ({
                    x: points[idx].x * scaleX,
                    y: points[idx].y * scaleY
                });

                ctx.strokeStyle = isAligned ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.55)';
                ctx.lineWidth = 1.2;

                const drawChain = (indices, closed = false) => {
                    ctx.beginPath();
                    for (let i = 0; i < indices.length; i++) {
                        const pt = getPt(indices[i]);
                        if (i === 0) ctx.moveTo(pt.x, pt.y);
                        else ctx.lineTo(pt.x, pt.y);
                    }
                    if (closed) ctx.closePath();
                    ctx.stroke();
                };

                // Delicate facial contour lines
                drawChain([0, 2, 4, 6, 8, 10, 12, 14, 16]); // Jawline
                drawChain([17, 18, 19, 20, 21]); // Left eyebrow
                drawChain([22, 23, 24, 25, 26]); // Right eyebrow
                drawChain([27, 28, 29, 30, 33]); // Nose bridge
                drawChain([31, 32, 33, 34, 35]); // Nose base
                drawChain([36, 37, 38, 39, 40, 41], true); // Left eye
                drawChain([42, 43, 44, 45, 46, 47], true); // Right eye
                drawChain([48, 50, 52, 54, 56, 58], true); // Lips

                // Key anchor points
                ctx.fillStyle = '#ffffff';
                [8, 27, 30, 33, 36, 39, 42, 45, 48, 54].forEach(idx => {
                    const pt = getPt(idx);
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
                    ctx.fill();
                });
            } else {
                // Apple 3D Wireframe Head Hologram Guide
                angle += 0.025;
                const centerX = width / 2;
                const centerY = height / 2;
                const radius = 64;

                ctx.save();
                ctx.translate(centerX, centerY);

                ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
                ctx.lineWidth = 1.2;

                // Head oval
                ctx.beginPath();
                ctx.ellipse(0, 0, radius * 0.78, radius, 0, 0, Math.PI * 2);
                ctx.stroke();

                // 3D wireframe longitude rotation
                ctx.beginPath();
                ctx.ellipse(0, 0, Math.abs(radius * 0.78 * Math.cos(angle)), radius, 0, 0, Math.PI * 2);
                ctx.stroke();

                // Subtle latitude lines
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.beginPath();
                ctx.ellipse(0, -10, radius * 0.75, 14, 0, 0, Math.PI * 2);
                ctx.stroke();

                // Eye guide marks
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.fillRect(-20, -12, 4, 2);
                ctx.fillRect(16, -12, 4, 2);

                // Nose dot
                ctx.beginPath();
                ctx.arc(0, 4, 2, 0, Math.PI * 2);
                ctx.fill();

                ctx.restore();
            }

            animationFrameRef.current = requestAnimationFrame(render);
        };

        render();

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [step, landmarksData, isAligned]);

    const handleKeyClick = (num) => {
        if (tempPin.length < 4) {
            setTempPin(tempPin + num);
        }
    };

    const handleDeleteKey = () => {
        if (tempPin.length > 0) {
            setTempPin(tempPin.slice(0, -1));
        }
    };

    if (!isOpen) return null;

    return (
        <div className={cx('face-id-modal-backdrop')}>
            <div className={cx('face-id-card-modal')}>
                {/* Close Button */}
                <button
                    type="button"
                    className={cx('modal-close-btn')}
                    onClick={onClose}
                    title="Đóng"
                    aria-label="Đóng"
                >
                    <X size={16} />
                </button>

                {step === 'face' ? (
                    <>
                        <div className={cx('modal-title-group')}>
                            <h3>Face ID</h3>
                            <p>Định vị khuôn mặt của bạn bên trong khung hình tròn.</p>
                        </div>

                        {/* Circular Apple Face ID Scanner */}
                        <div className={cx('apple-face-id-scanner')}>
                            <svg className={cx('tick-ring-svg', { aligned: isAligned })} viewBox="0 0 258 258">
                                <circle cx="129" cy="129" r="118" />
                            </svg>

                            <div className={cx('camera-viewport', { aligned: isAligned })}>
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                />
                                <canvas ref={canvasRef} />
                            </div>
                        </div>

                        {/* Minimal Guidance Pill */}
                        <div className={cx('guidance-pill', { ready: isAligned, error: isWarning })}>
                            <span className={cx('guidance-dot')} />
                            <span>{translatedGuidance}</span>
                        </div>

                        {/* Action Buttons */}
                        <div className={cx('modal-actions')}>
                            <button
                                type="button"
                                className={cx('primary-apple-btn')}
                                onClick={onCaptureFace}
                                disabled={isCapturing}
                            >
                                {isCapturing ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        <span>Đang quét...</span>
                                    </>
                                ) : (
                                    <span>Bắt đầu quét Face ID</span>
                                )}
                            </button>
                            <button
                                type="button"
                                className={cx('cancel-apple-btn')}
                                onClick={onClose}
                            >
                                Hủy
                            </button>
                        </div>
                    </>
                ) : (
                    /* Step 2: Apple Passcode PIN Setup */
                    <div className={cx('pin-setup-container')}>
                        <div className={cx('modal-title-group')}>
                            <h3>Tạo mã PIN</h3>
                            <p>Nhập mã PIN 4 chữ số để mở khóa khi không thể dùng camera.</p>
                        </div>

                        {/* 4 Pin Dots */}
                        <div className={cx('pin-dots-row')}>
                            {[0, 1, 2, 3].map((index) => (
                                <div
                                    key={index}
                                    className={cx('pin-dot', { filled: tempPin.length > index })}
                                />
                            ))}
                        </div>

                        {/* Clean iOS Keypad */}
                        <div className={cx('keypad-grid')}>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                <button
                                    key={num}
                                    type="button"
                                    className={cx('key-btn')}
                                    onClick={() => handleKeyClick(String(num))}
                                >
                                    {num}
                                </button>
                            ))}
                            <div className={cx('key-btn', 'empty')} />
                            <button
                                type="button"
                                className={cx('key-btn')}
                                onClick={() => handleKeyClick('0')}
                            >
                                0
                            </button>
                            <button
                                type="button"
                                className={cx('key-btn')}
                                onClick={handleDeleteKey}
                                aria-label="Xóa"
                            >
                                <Delete size={18} />
                            </button>
                        </div>

                        <div className={cx('modal-actions')}>
                            <button
                                type="button"
                                className={cx('primary-apple-btn')}
                                onClick={onSave}
                                disabled={tempPin.length < 4}
                            >
                                Hoàn tất & Bật bảo vệ
                            </button>
                            <button
                                type="button"
                                className={cx('cancel-apple-btn')}
                                onClick={onClose}
                            >
                                Hủy
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FaceIDCalibrationModal;
