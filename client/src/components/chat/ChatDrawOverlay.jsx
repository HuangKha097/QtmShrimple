import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import classNames from 'classnames/bind';
import {
    PenTool,
    Sparkles,
    Highlighter,
    Eraser,
    Undo2,
    Trash2,
    Eye,
    EyeOff,
    Send,
    Pin,
    X,
    Minus,
} from 'lucide-react';
import styles from '../../assets/css/ChatDrawOverlay.module.scss';
import { useChatStore } from '../../stores/useChatStore.js';
import { useAuthStore } from '../../stores/useAuthStore.js';
import { toast } from 'sonner';

const cx = classNames.bind(styles);

const PRESET_COLORS = [
    '#f97316', // Shrimple Orange
    '#ff2a85', // Instagram Neon Pink
    '#00f2fe', // Electric Cyan
    '#a855f7', // Neon Purple
    '#22c55e', // Vivid Lime
    '#facc15', // Sunshine Yellow
    '#ef4444', // Coral Red
    '#ffffff', // Pure White
];

const STROKE_SIZES = [
    { label: 'Nhỏ', value: 3, dot: 5 },
    { label: 'Vừa', value: 6, dot: 8 },
    { label: 'Lớn', value: 11, dot: 12 },
    { label: 'Cực đại', value: 18, dot: 15 },
];

const resolveRecipientId = (currentConvo, currentUser) => {
    if (currentConvo?.participants && currentUser) {
        const currentUserIdStr = (currentUser._id || currentUser.id)?.toString();
        const partner = currentConvo.participants.find((p) => {
            if (!p) return false;
            const pId = (p._id || p.userId?._id || p.userId)?.toString();
            return pId && pId !== currentUserIdStr;
        });
        if (partner) {
            return (partner._id || partner.userId?._id || partner.userId)?.toString();
        }
    }
    return null;
};

const drawStrokeOnCtx = (ctx, stroke, width, height) => {
    const pts = stroke?.points;
    if (!pts || pts.length === 0) return;

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const mode = stroke.mode || 'solid';
    const baseSize = Number(stroke.size) || 5;
    const color = stroke.color || '#f97316';

    if (mode === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
        ctx.lineWidth = baseSize * 2.2;
    } else if (mode === 'neon') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.shadowColor = color;
        ctx.shadowBlur = baseSize * 2.6;
        ctx.strokeStyle = color;
        ctx.lineWidth = baseSize;
    } else if (mode === 'highlighter') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.38;
        ctx.strokeStyle = color;
        ctx.lineWidth = baseSize * 2.1;
    } else if (mode === 'dashed') {
        ctx.globalCompositeOperation = 'source-over';
        ctx.setLineDash([baseSize * 1.8, baseSize * 1.4]);
        ctx.strokeStyle = color;
        ctx.lineWidth = baseSize;
    } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = color;
        ctx.lineWidth = baseSize;
    }

    ctx.beginPath();
    const firstX = pts[0].x * width;
    const firstY = pts[0].y * height;
    ctx.moveTo(firstX, firstY);

    if (pts.length === 1) {
        ctx.lineTo(firstX + 0.1, firstY + 0.1);
    } else {
        for (let i = 1; i < pts.length; i++) {
            const prev = pts[i - 1];
            const curr = pts[i];
            const midX = ((prev.x + curr.x) / 2) * width;
            const midY = ((prev.y + curr.y) / 2) * height;
            ctx.quadraticCurveTo(prev.x * width, prev.y * height, midX, midY);
        }
        const last = pts[pts.length - 1];
        ctx.lineTo(last.x * width, last.y * height);
    }

    ctx.stroke();

    // Inner bright core for neon brush
    if (mode === 'neon') {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = 0.75;
        ctx.lineWidth = Math.max(1.5, baseSize * 0.38);
        ctx.stroke();
    }

    ctx.restore();
};

const ChatDrawOverlay = ({ conversationId }) => {
    const {
        chatDrawings,
        setChatDrawing,
        isDrawModeOpen,
        setIsDrawModeOpen,
        conversations,
        sendDirectMessage,
        sendGroupMessage,
    } = useChatStore();
    const { user: currentUser, socket } = useAuthStore();

    const canvasRef = useRef(null);
    const isDrawingRef = useRef(false);
    const currentStrokeRef = useRef(null);

    const [brushMode, setBrushMode] = useState('neon'); // 'solid' | 'neon' | 'highlighter' | 'dashed' | 'eraser'
    const [color, setColor] = useState('#f97316');
    const [strokeSize, setStrokeSize] = useState(6);
    const [isHiddenLocal, setIsHiddenLocal] = useState(false);
    const [isSendingImage, setIsSendingImage] = useState(false);

    const currentDrawing = chatDrawings?.[conversationId];
    const strokes = useMemo(() => currentDrawing?.strokes || [], [currentDrawing]);
    const updatedByName = currentDrawing?.updatedBy?.name;

    // Fetch existing pinned drawing from server when switching conversations
    useEffect(() => {
        if (!conversationId || !socket) return;
        socket.emit('getChatScreenDrawing', { conversationId }, (res) => {
            if (res && Array.isArray(res.strokes) && res.strokes.length > 0) {
                setChatDrawing(conversationId, res);
            }
        });
    }, [conversationId, socket, setChatDrawing]);

    // Render all strokes onto canvas
    const renderCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        if (canvas.width !== Math.floor(rect.width * dpr) || canvas.height !== Math.floor(rect.height * dpr)) {
            canvas.width = Math.floor(rect.width * dpr);
            canvas.height = Math.floor(rect.height * dpr);
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.save();
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, rect.width, rect.height);

        strokes.forEach((s) => drawStrokeOnCtx(ctx, s, rect.width, rect.height));
        if (currentStrokeRef.current) {
            drawStrokeOnCtx(ctx, currentStrokeRef.current, rect.width, rect.height);
        }
        ctx.restore();
    }, [strokes]);

    useEffect(() => {
        renderCanvas();
    }, [renderCanvas, isDrawModeOpen]);

    // ResizeObserver to keep canvas crisp when chat panel resizes
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(() => {
            renderCanvas();
        });
        ro.observe(canvas);
        return () => ro.disconnect();
    }, [renderCanvas]);

    const broadcastStrokes = useCallback(
        (nextStrokes) => {
            if (!conversationId) return;
            const authorName =
                currentUser?.displayName || currentUser?.username || 'Bạn';
            const payload = {
                conversationId,
                strokes: nextStrokes,
                updatedBy: { _id: currentUser?._id, name: authorName },
                updatedAt: new Date().toISOString(),
            };
            setChatDrawing(conversationId, payload);
            if (socket) {
                socket.emit('updateChatScreenDrawing', {
                    conversationId,
                    strokes: nextStrokes,
                    authorName,
                });
            }
        },
        [conversationId, currentUser, setChatDrawing, socket]
    );

    const getNormalizedPoint = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: Math.max(0, Math.min(1, (clientX - rect.left) / (rect.width || 1))),
            y: Math.max(0, Math.min(1, (clientY - rect.top) / (rect.height || 1))),
        };
    };

    const handlePointerDown = (e) => {
        if (!isDrawModeOpen) return;
        e.preventDefault();
        isDrawingRef.current = true;
        setIsHiddenLocal(false);
        const pt = getNormalizedPoint(e);
        currentStrokeRef.current = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            mode: brushMode,
            color,
            size: strokeSize,
            points: [pt],
        };
        renderCanvas();
    };

    const handlePointerMove = (e) => {
        if (!isDrawingRef.current || !currentStrokeRef.current) return;
        e.preventDefault();
        const pt = getNormalizedPoint(e);
        const pts = currentStrokeRef.current.points;
        const last = pts[pts.length - 1];
        const dist = Math.hypot(pt.x - last.x, pt.y - last.y);
        if (dist < 0.002) return;
        pts.push(pt);
        renderCanvas();
    };

    const handlePointerUp = () => {
        if (!isDrawingRef.current || !currentStrokeRef.current) return;
        isDrawingRef.current = false;
        const finishedStroke = currentStrokeRef.current;
        currentStrokeRef.current = null;
        const nextStrokes = [...strokes, finishedStroke];
        broadcastStrokes(nextStrokes);
    };

    const handleUndo = () => {
        if (strokes.length === 0) return;
        const nextStrokes = strokes.slice(0, -1);
        broadcastStrokes(nextStrokes);
    };

    const handleClearAll = () => {
        if (strokes.length === 0) return;
        const authorName = currentUser?.displayName || currentUser?.username || 'Bạn';
        setChatDrawing(conversationId, {
            conversationId,
            strokes: [],
            updatedBy: null,
        });
        if (socket) {
            socket.emit('clearChatScreenDrawing', { conversationId, authorName });
        }
        toast.info('Đã xóa nét vẽ trên màn hình chat');
    };

    const handlePinAndClose = () => {
        setIsDrawModeOpen(false);
        if (strokes.length > 0) {
            toast.success('Đã ghim nét vẽ lên màn hình cuộc trò chuyện!');
        }
    };

    const handleSendAsChatImage = async () => {
        const canvas = canvasRef.current;
        if (!canvas || strokes.length === 0 || isSendingImage) return;

        setIsSendingImage(true);
        const toastId = toast.loading('Đang gửi bản vẽ vào cuộc trò chuyện...');
        try {
            // Create export canvas with dark background so neon strokes look great in chat bubble
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = canvas.width;
            exportCanvas.height = canvas.height;
            const eCtx = exportCanvas.getContext('2d');
            eCtx.fillStyle = '#0b0e14';
            eCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
            eCtx.drawImage(canvas, 0, 0);

            const dataUrl = exportCanvas.toDataURL('image/png');
            const currentConvo = (conversations || []).find((c) => c && c._id === conversationId);
            if (currentConvo?.isGroup) {
                await sendGroupMessage(conversationId, '🎨 Đã gửi một nét vẽ tay', dataUrl, null, 'text');
            } else {
                const recipientId = resolveRecipientId(currentConvo, currentUser);
                if (recipientId) {
                    await sendDirectMessage(recipientId, '🎨 Đã gửi một nét vẽ tay', conversationId, dataUrl, null, 'text');
                }
            }
            toast.success('Đã gửi bản vẽ vào đoạn chat!', { id: toastId });
        } catch (err) {
            console.error('Failed to send drawing as image:', err);
            toast.error('Không thể gửi bản vẽ', { id: toastId });
        } finally {
            setIsSendingImage(false);
        }
    };

    const hasStrokes = strokes.length > 0;

    return (
        <div className={cx('draw-overlay-root')}>
            {/* Top-Pinned Bar (Always Pinned at Top of Chat Screen Layout) */}
            {!isDrawModeOpen ? (
                <div className={cx('pinned-top-bar', { 'has-drawing': hasStrokes })}>
                    {hasStrokes && (
                        <div className={cx('pinned-status-info')}>
                            <span className={cx('pulse-dot')} />
                            <span>Nét vẽ trên màn hình</span>
                            {updatedByName && (
                                <span className={cx('author-sub')}>({updatedByName})</span>
                            )}
                        </div>
                    )}

                    <button
                        type="button"
                        className={cx('pinned-pen-trigger')}
                        onClick={() => {
                            setIsHiddenLocal(false);
                            setIsDrawModeOpen(true);
                        }}
                        title="Vẽ trực tiếp lên màn hình chat (Instagram Draw)"
                    >
                        <PenTool size={14} />
                        <span>{hasStrokes ? 'Vẽ thêm' : 'Bút vẽ màn hình'}</span>
                    </button>

                    {hasStrokes && (
                        <>
                            <button
                                type="button"
                                className={cx('pinned-mini-btn')}
                                onClick={() => setIsHiddenLocal(!isHiddenLocal)}
                                title={isHiddenLocal ? 'Hiện nét vẽ trên màn hình' : 'Tạm ẩn nét vẽ'}
                            >
                                {isHiddenLocal ? <Eye size={14} /> : <EyeOff size={14} />}
                            </button>
                            <button
                                type="button"
                                className={cx('pinned-mini-btn', 'danger')}
                                onClick={handleClearAll}
                                title="Xóa nét vẽ trên màn hình"
                            >
                                <Trash2 size={14} />
                            </button>
                        </>
                    )}
                </div>
            ) : (
                /* Active Instagram Draw Studio Dock Pinned at Top */
                <div className={cx('draw-studio-dock')}>
                    <div className={cx('studio-top-row')}>
                        <div className={cx('studio-brand')}>
                            <span className={cx('brand-badge')}>
                                <PenTool size={14} />
                            </span>
                            <span>Vẽ lên màn hình Chat</span>
                            <span className={cx('live-pill')}>LIVE</span>
                        </div>

                        <div className={cx('brush-group')}>
                            <button
                                type="button"
                                className={cx('brush-btn', { active: brushMode === 'neon' })}
                                onClick={() => setBrushMode('neon')}
                                title="Bút Neon phát sáng (Instagram Glow)"
                            >
                                <Sparkles size={14} />
                                <span>Neon</span>
                            </button>
                            <button
                                type="button"
                                className={cx('brush-btn', { active: brushMode === 'solid' })}
                                onClick={() => setBrushMode('solid')}
                                title="Bút nét liền"
                            >
                                <PenTool size={14} />
                                <span>Nét liền</span>
                            </button>
                            <button
                                type="button"
                                className={cx('brush-btn', { active: brushMode === 'highlighter' })}
                                onClick={() => setBrushMode('highlighter')}
                                title="Bút dạ quang"
                            >
                                <Highlighter size={14} />
                                <span>Dạ quang</span>
                            </button>
                            <button
                                type="button"
                                className={cx('brush-btn', { active: brushMode === 'dashed' })}
                                onClick={() => setBrushMode('dashed')}
                                title="Bút nét đứt"
                            >
                                <Minus size={14} />
                                <span>Nét đứt</span>
                            </button>
                            <button
                                type="button"
                                className={cx('brush-btn', { active: brushMode === 'eraser' })}
                                onClick={() => setBrushMode('eraser')}
                                title="Tẩy nét vẽ"
                            >
                                <Eraser size={14} />
                                <span>Tẩy</span>
                            </button>
                        </div>

                        <div className={cx('studio-actions')}>
                            <button
                                type="button"
                                className={cx('action-icon-btn')}
                                onClick={handleUndo}
                                disabled={!hasStrokes}
                                title="Hoàn tác nét vừa vẽ"
                            >
                                <Undo2 size={15} />
                            </button>
                            <button
                                type="button"
                                className={cx('action-icon-btn', 'danger')}
                                onClick={handleClearAll}
                                disabled={!hasStrokes}
                                title="Xóa toàn bộ nét vẽ"
                            >
                                <Trash2 size={15} />
                            </button>
                            <button
                                type="button"
                                className={cx('action-pill-btn')}
                                onClick={handleSendAsChatImage}
                                disabled={!hasStrokes || isSendingImage}
                                title="Gửi bản vẽ thành hình ảnh trong tin nhắn"
                            >
                                <Send size={13} />
                                <span>Gửi ảnh</span>
                            </button>
                            <button
                                type="button"
                                className={cx('action-pill-btn', 'primary')}
                                onClick={handlePinAndClose}
                                title="Ghim nét vẽ đính trên màn hình chat"
                            >
                                <Pin size={13} />
                                <span>Ghim trên màn hình</span>
                            </button>
                            <button
                                type="button"
                                className={cx('action-icon-btn')}
                                onClick={() => setIsDrawModeOpen(false)}
                                title="Đóng bảng vẽ"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    <div className={cx('studio-bottom-row')}>
                        <div className={cx('palette-row')}>
                            {PRESET_COLORS.map((hex) => (
                                <button
                                    key={hex}
                                    type="button"
                                    className={cx('color-swatch', {
                                        active: color.toLowerCase() === hex.toLowerCase() && brushMode !== 'eraser',
                                    })}
                                    style={{ backgroundColor: hex }}
                                    onClick={() => {
                                        setColor(hex);
                                        if (brushMode === 'eraser') setBrushMode('neon');
                                    }}
                                    title={`Màu ${hex}`}
                                />
                            ))}
                            <label className={cx('custom-color-label')} title="Tùy chọn màu khác">
                                <input
                                    type="color"
                                    value={color}
                                    onChange={(e) => {
                                        setColor(e.target.value);
                                        if (brushMode === 'eraser') setBrushMode('neon');
                                    }}
                                />
                            </label>
                        </div>

                        <div className={cx('size-row')}>
                            <span className={cx('size-label')}>Cỡ nét:</span>
                            {STROKE_SIZES.map((s) => (
                                <button
                                    key={s.value}
                                    type="button"
                                    className={cx('size-btn', { active: strokeSize === s.value })}
                                    onClick={() => setStrokeSize(s.value)}
                                    title={s.label}
                                >
                                    <span
                                        className={cx('size-dot')}
                                        style={{ width: `${s.dot}px`, height: `${s.dot}px` }}
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Transparent Drawing Canvas Overlay */}
            <canvas
                ref={canvasRef}
                className={cx('draw-canvas', {
                    interactive: isDrawModeOpen,
                    'hidden-canvas': isHiddenLocal && !isDrawModeOpen,
                })}
                onMouseDown={handlePointerDown}
                onMouseMove={handlePointerMove}
                onMouseUp={handlePointerUp}
                onMouseLeave={handlePointerUp}
                onTouchStart={handlePointerDown}
                onTouchMove={handlePointerMove}
                onTouchEnd={handlePointerUp}
            />
        </div>
    );
};

export default ChatDrawOverlay;
