import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import * as faceapi from '@vladmandic/face-api';
import { useAuthStore } from '../../stores/useAuthStore';
import { toast } from 'sonner';
import { Lock, Eye, EyeOff, ShieldAlert } from 'lucide-react';
import axios from '../../lib/axios';
import FaceIDCalibrationModal from './FaceIDCalibrationModal';
import styles from '../../assets/css/AntiPeep.module.scss';
import classNames from 'classnames/bind';

const cx = classNames.bind(styles);

const AntiPeepContext = createContext();

export const useAntiPeep = () => useContext(AntiPeepContext);

const MODEL_URL = 'https://vladmandic.github.io/face-api/model/';

export const AntiPeepProvider = ({ children }) => {
    const { user, updateUser } = useAuthStore();
    const [isModelsLoaded, setIsModelsLoaded] = useState(false);
    const [isProtecting, setIsProtecting] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [lockReason, setLockReason] = useState("");

    // Calibration State
    const [calibrationStep, setCalibrationStep] = useState('idle'); // 'idle', 'face', 'pin'
    const [tempDescriptor, setTempDescriptor] = useState(null);
    const [guidanceText, setGuidanceText] = useState("Initializing...");
    const [isCapturing, setIsCapturing] = useState(false);
    const [landmarksData, setLandmarksData] = useState(null);
    const calibrationInterval = useRef(null);

    // PIN State
    const [pinInput, setPinInput] = useState("");
    const [tempPin, setTempPin] = useState(""); // For setting up PIN

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const intervalRef = useRef(null);

    const latestUser = useRef(user);
    useEffect(() => { latestUser.current = user; }, [user]);

    const [isHeavyModelLoaded, setIsHeavyModelLoaded] = useState(false);

    // Initial Load of Models
    useEffect(() => {
        const loadModels = async () => {
            try {
                console.log("Loading Anti-Peep Models from", MODEL_URL);
                // Load only lighter/critical models initially for fast startup
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                ]);
                setIsModelsLoaded(true);
                console.log("Anti-Peep Core Models Loaded Successfully");
                // toast.success("Security AI Models Loaded");
            } catch (error) {
                console.error("Failed to load face-api models:", error);
                toast.error("Failed to load Security AI. Check internet connection.");
            }
        };
        loadModels();
    }, []);

    // Sync state with User settings
    useEffect(() => {
        // Start protection if enabled, loaded, not protecting, and NOT calibrating
        if (user?.antiPeepData?.isEnabled && isModelsLoaded && !isProtecting && calibrationStep === 'idle') {
            startProtection();
        }
        // Stop protection if disabled OR if calibrating (pause)
        else if (isProtecting && ((!user?.antiPeepData?.isEnabled || !user) || calibrationStep !== 'idle')) {
            stopProtection();
        }
    }, [user, isModelsLoaded, calibrationStep, isProtecting]);

    const startProtection = async () => {
        if (!isModelsLoaded) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                streamRef.current = stream;
                // Only set state if not already set preventing loop
                if (!isProtecting) setIsProtecting(true);
                startDetectionLoop();
            }
        } catch (err) {
            console.error("Camera access denied:", err);
            toast.error("Camera access required for Anti-Peeping");
        }
    };

    const stopProtection = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setIsProtecting(false);
        setIsLocked(false);
    };

    const startDetectionLoop = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);

        intervalRef.current = setInterval(async () => {
            if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

            const currentUser = latestUser.current;
            if (!currentUser?.antiPeepData) return;

            // Logic
            // 1. Detect all faces
            // Using TinyFaceDetector for real-time speed
            const options = new faceapi.TinyFaceDetectorOptions();
            const detections = await faceapi.detectAllFaces(videoRef.current, options)
                .withFaceLandmarks()
                .withFaceDescriptors();

            if (detections.length === 0) return;

            // Rule 1: Multiple Faces
            if (detections.length > 1) {
                triggerLock("Multiple people detected");
                return;
            }

            // Rule 2: Unknown Person (if configured)
            if (currentUser.antiPeepData.faceDescriptor && currentUser.antiPeepData.faceDescriptor.length > 0) {
                const storedDescriptor = new Float32Array(currentUser.antiPeepData.faceDescriptor);
                const distance = faceapi.euclideanDistance(detections[0].descriptor, storedDescriptor);

                // Threshold: 0.6 is standard.
                if (distance > 0.6) {
                    triggerLock("Unrecognized face detected");
                    return;
                }
            }

            // Rule 3: Looking away (Head Pose) ?
            // We can check landmarks for roughly looking at screen.
            // Skipped for MVP stability, focus on ID and Count.

        }, 1000); // Check every second
    };

    const triggerLock = (reason) => {
        // Note: isLocked state inside here relies on closure, but since we modify state,
        // we should check the ref or just set true idempotently.
        // Ideally we check a ref for isLocked too if we want to avoid spamming setState,
        // but react batches updates so it's not critical.
        // However, checking the real current state is better.
        setIsLocked(prev => {
            if (!prev) {
                setLockReason(reason);
                return true;
            }
            return prev;
        });
    };

    const handleUnlock = async () => {
        // Verify PIN
        // Simple client check against user object (assuming it's loaded securely enough for this context)
        // Or call backend to verify if we want 100% security
        if (pinInput === user.antiPeepData.pin) {
            setIsLocked(false);
            setPinInput("");
            setLockReason("");
        } else {
            toast.error("Incorrect PIN");
            setPinInput("");
        }
    };

    const setupCalibration = async () => {
        if (!isModelsLoaded) {
            toast.error("Core models loading...");
            return;
        }

        // Lazy load heavy model
        if (!isHeavyModelLoaded) {
            try {
                await toast.promise(
                    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                    {
                        loading: 'Loading High-Precision AI Model...',
                        success: 'AI Ready!',
                        error: 'Failed to load heavy model'
                    }
                );
                setIsHeavyModelLoaded(true);
            } catch (e) {
                console.error(e);
                return;
            }
        }

        setCalibrationStep('face');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
            streamRef.current = stream; // Store stream for modal usage
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                // Allow video to play to get dimensions
                videoRef.current.onloadedmetadata = () => {
                    startCalibrationGuidance();
                };
            }
        } catch (e) {
            toast.error("Camera error");
            setCalibrationStep('idle');
        }
    };

    const startCalibrationGuidance = () => {
        if (calibrationInterval.current) clearInterval(calibrationInterval.current);

        calibrationInterval.current = setInterval(async () => {
            if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

            // Use TinyFace for fast guidance updates
            const options = new faceapi.TinyFaceDetectorOptions();
            const detections = await faceapi.detectAllFaces(videoRef.current, options).withFaceLandmarks();

            if (!detections || detections.length === 0) {
                setGuidanceText("No face detected. Look at the camera.");
                setLandmarksData(null);
                return;
            }

            if (detections.length > 1) {
                setGuidanceText("Multiple faces detected. Ensure you are alone.");
                setLandmarksData(null);
                return;
            }

            const face = detections[0];
            const videoWidth = videoRef.current.videoWidth || 320;
            const videoHeight = videoRef.current.videoHeight || 240;
            const { x, y, width, height } = face.box;

            if (face.landmarks) {
                setLandmarksData({
                    positions: face.landmarks.positions,
                    videoWidth,
                    videoHeight
                });
            }

            // Check Size (Distance)
            const faceAreaRatio = (width * height) / (videoWidth * videoHeight);
            if (faceAreaRatio < 0.05) {
                setGuidanceText("Too far! Come closer.");
                return;
            }
            if (faceAreaRatio > 0.4) {
                setGuidanceText("Too close! Move back.");
                return;
            }

            // Check Centering
            const centerX = x + width / 2;
            const centerY = y + height / 2;
            const videoCenterX = videoWidth / 2;
            const videoCenterY = videoHeight / 2;

            const diffX = Math.abs(centerX - videoCenterX);
            const diffY = Math.abs(centerY - videoCenterY);

            // Access user feedback
            if (diffX > videoWidth * 0.15) {
                setGuidanceText(centerX < videoCenterX ? "Move Left ->" : "<- Move Right");
                return;
            }
            if (diffY > videoHeight * 0.15) {
                setGuidanceText(centerY < videoCenterY ? "Move Down" : "Move Up");
                return;
            }

            setGuidanceText("Perfect! Hold still and Capture.");

        }, 150);
    };

    const handleCaptureFace = async () => {
        if (!videoRef.current) return;
        setIsCapturing(true);

        try {
            await toast.promise(
                async () => {
                    // Use SSD MobileNet for high precision enrollment
                    const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.8 });
                    const detection = await faceapi.detectSingleFace(videoRef.current, options).withFaceLandmarks().withFaceDescriptor();

                    if (!detection) throw new Error("Không thể ghi nhận khuôn mặt rõ nét. Vui lòng nhìn thẳng và thử lại.");

                    return detection;
                },
                {
                    loading: 'Đang ghi nhận dữ liệu khuôn mặt 3D...',
                    success: (detection) => {
                        const descriptor = Array.from(detection.descriptor);
                        setTempDescriptor(descriptor);
                        setCalibrationStep('pin');

                        // Stop guidance
                        if (calibrationInterval.current) clearInterval(calibrationInterval.current);
                        return "Ghi nhận khuôn mặt thành công!";
                    },
                    error: (err) => {
                        return err.message;
                    }
                }
            );
        } finally {
            setIsCapturing(false);
        }
    };

    const saveCalibration = async () => {
        if (!tempDescriptor || tempPin.length < 4) return;

        try {
            await axios.put('/api/users/anti-peep', {
                faceDescriptor: tempDescriptor,
                pin: tempPin,
                isEnabled: true
            });

            // Update local user
            updateUser({
                antiPeepData: {
                    ...user.antiPeepData,
                    faceDescriptor: tempDescriptor,
                    pin: tempPin,
                    isEnabled: true
                }
            });

            toast.success("Thiết lập Face ID thành công và đã kích hoạt bảo vệ!");
            closeCalibration();
        } catch (err) {
            toast.error("Lỗi khi lưu dữ liệu Face ID");
            console.error(err);
        }
    };

    const closeCalibration = () => {
        setCalibrationStep('idle');
        setTempPin("");
        setTempDescriptor(null);
        setLandmarksData(null);
        if (calibrationInterval.current) clearInterval(calibrationInterval.current);

        // If we weren't protecting, turn off camera
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(t => t.stop());
            videoRef.current.srcObject = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    };

    return (
        <AntiPeepContext.Provider value={{
            isModelsLoaded,
            isLocked,
            isProtecting,
            setupCalibration
        }}>
            {children}

            {/* Hidden Video Element for AI Processing (Always running in background when needed) */}
            <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '320px',
                    height: '240px',
                    opacity: 0, // Always hidden, used only for computation
                    pointerEvents: 'none',
                    zIndex: -1
                }}
            />

            {/* Apple Face ID 3D Calibration Modal */}
            <FaceIDCalibrationModal
                isOpen={calibrationStep !== 'idle'}
                stream={streamRef.current}
                step={calibrationStep}
                guidanceText={guidanceText}
                onCaptureFace={handleCaptureFace}
                isCapturing={isCapturing}
                tempPin={tempPin}
                setTempPin={setTempPin}
                onSave={saveCalibration}
                onClose={closeCalibration}
                landmarksData={landmarksData}
            />

            {/* MODERN SECURITY LOCK SCREEN OVERLAY */}
            {isLocked && (
                <div className={cx('security-lock-backdrop')}>
                    <div className={cx('security-lock-card')}>
                        <div className={cx('lock-badge')}>
                            <Lock size={36} />
                        </div>

                        <h3>Khóa Bảo Mật</h3>
                        <p className={cx('lock-reason')}>{lockReason || "Phát hiện người lạ hoặc nhiều người cùng nhìn vào màn hình."}</p>

                        <input
                            type="password"
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value)}
                            placeholder="Nhập mã PIN"
                            maxLength={4}
                            autoFocus
                            style={{
                                width: '180px',
                                height: '50px',
                                fontSize: '1.8rem',
                                textAlign: 'center',
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '2px solid rgba(255, 255, 255, 0.15)',
                                borderRadius: '12px',
                                color: '#ffffff',
                                letterSpacing: '0.6rem',
                                marginBottom: '20px',
                                outline: 'none'
                            }}
                        />

                        <button
                            type="button"
                            onClick={handleUnlock}
                            style={{
                                width: '100%',
                                padding: '12px',
                                background: '#f97316',
                                color: '#ffffff',
                                fontWeight: '700',
                                border: 'none',
                                borderRadius: '9999px',
                                fontSize: '1.45rem',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            Mở khóa màn hình
                        </button>
                    </div>
                </div>
            )}
        </AntiPeepContext.Provider>
    );
};
