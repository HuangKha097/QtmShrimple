import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Download, Loader2, Pencil, RefreshCw, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../../stores/useAuthStore.js';
import { useChatStore } from '../../stores/useChatStore.js';
import { chatService } from '../../services/chatService.js';
import styles from '../../assets/css/GroupDetails.module.scss';

const errorMessage = error => error.response?.data?.message || 'Không thể thực hiện thao tác. Vui lòng thử lại.';

const GroupInviteDialog = ({ chat, isLeader, onClose }) => {
    const dialog = useRef(null);
    const qr = useRef(null);
    const [token, setToken] = useState('');
    const [busy, setBusy] = useState(true);
    const [error, setError] = useState('');
    const inviteUrl = token ? `${window.location.origin}/groups/join/${token}` : '';
    const socket = useAuthStore(state => state.socket);

    useEffect(() => {
        dialog.current.showModal();
        let alive = true;
        const load = async () => {
            try {
                const data = await chatService.getGroupInvite(chat._id);
                if (alive) { setToken(data.token); setError(''); }
            } catch (err) {
                if (alive) setError(errorMessage(err));
            } finally {
                if (alive) setBusy(false);
            }
        };
        load();
        const onChanged = ({ conversationId }) => {
            if (conversationId === chat._id) { setToken(''); setBusy(true); load(); }
        };
        socket?.on('groupInviteChanged', onChanged);
        return () => { alive = false; socket?.off('groupInviteChanged', onChanged); };
    }, [chat._id, socket]);

    const copyLink = async () => {
        try { await navigator.clipboard.writeText(inviteUrl); toast.success('Đã sao chép liên kết mời'); }
        catch { toast.error('Không thể sao chép tự động. Bạn có thể sao chép liên kết bên dưới.'); }
    };
    const rotateLink = async () => {
        if (!window.confirm('Tạo liên kết mới? URL và QR cũ sẽ không còn sử dụng được.')) return;
        setBusy(true);
        try {
            const data = await chatService.rotateGroupInvite(chat._id);
            setToken(data.token);
            toast.success('Đã tạo liên kết mới và thu hồi liên kết cũ');
        } catch (err) { toast.error(errorMessage(err)); }
        finally { setBusy(false); }
    };
    const downloadQr = () => {
        const svg = qr.current?.querySelector('svg');
        if (!svg) return;
        const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'shrimple-group-qr.svg';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    return createPortal(
        <dialog ref={dialog} className={styles.dialog} onCancel={onClose} aria-labelledby="invite-title"
            onClick={event => { if (event.target === dialog.current) onClose(); }}>
            <div className={styles.dialogContent}>
                <div className={styles.heading}>
                    <h2 id="invite-title">Mời tham gia nhóm</h2>
                    <button type="button" onClick={onClose} aria-label="Đóng"><X size={20} /></button>
                </div>
                <p>{chat.group?.name}</p>
                {busy ? <div className={styles.loading} role="status"><Loader2 className={styles.spinner} /> Đang tải liên kết…</div> : error ?
                    <p role="alert">{error}</p> : <>
                        <div ref={qr} className={styles.qr}>
                            <QRCodeSVG value={inviteUrl} size={224} level="M" marginSize={4} title="QR tham gia nhóm" />
                        </div>
                        <p>Quét QR hoặc mở liên kết để đăng nhập và tham gia nhóm.</p>
                        <label className={styles.field}>Liên kết mời
                            <input readOnly value={inviteUrl} onFocus={event => event.target.select()} />
                        </label>
                        <div className={styles.actions}>
                            <button type="button" onClick={copyLink}><Copy size={16} /> Sao chép URL</button>
                            <button type="button" onClick={downloadQr}><Download size={16} /> Tải QR</button>
                        </div>
                        {isLeader && <button type="button" className={styles.rotate} onClick={rotateLink} disabled={busy}>
                            <RefreshCw size={16} /> Tạo liên kết mới
                        </button>}
                    </>}
            </div>
        </dialog>, document.body
    );
};

const GroupDetails = ({ chat, isLeader, showInvite, onCloseInvite, onClose }) => {
    const currentUserId = useAuthStore(state => state.user?._id);
    const isAdmin = chat.participants?.some(member => member._id === currentUserId && member.role === 'admin');
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [busy, setBusy] = useState(false);
    const { updateGroup, deleteGroup } = useChatStore();
    const startEditing = () => {
        setName(chat.group?.name || '');
        setDescription(chat.group?.descriptionGroup || '');
        setEditing(true);
    };
    const save = async event => {
        event.preventDefault();
        if (!name.trim()) { toast.error('Vui lòng nhập tên nhóm'); return; }
        setBusy(true);
        try {
            await updateGroup(chat._id, { name, descriptionGroup: description });
            setEditing(false);
            toast.success('Đã cập nhật thông tin nhóm');
        } catch (error) { toast.error(errorMessage(error)); }
        finally { setBusy(false); }
    };
    const remove = async () => {
        if (!window.confirm(`Xóa nhóm "${chat.group?.name}" và toàn bộ tin nhắn? Thao tác này không thể hoàn tác.`)) return;
        setBusy(true);
        try { await deleteGroup(chat._id); onClose(); }
        catch (error) { toast.error(errorMessage(error)); }
        finally { setBusy(false); }
    };
    const leader = chat.participants?.find(p => p.role === 'leader' || p._id === chat.group?.createdBy);

    return <section className={styles.details} aria-label="Thông tin nhóm">
        <div className={styles.heading}><h3>Thông tin nhóm</h3><span className={styles.role}>{isLeader ? 'Trưởng nhóm' : isAdmin ? 'Quản trị viên' : 'Thành viên'}</span></div>
        <p>Trưởng nhóm: <strong>{leader?.displayName || leader?.username || 'Chưa xác định'}</strong></p>
        <p className={styles.description}>{chat.group?.descriptionGroup || 'Nhóm chưa có mô tả.'}</p>
        {isLeader && !editing && <div className={styles.actions}>
            <button type="button" disabled={busy} onClick={startEditing}><Pencil size={16} /> Chỉnh sửa</button>
            <button type="button" disabled={busy} className={styles.danger} onClick={remove}><Trash2 size={16} /> Xóa nhóm</button>
        </div>}
        {isLeader && editing && <form onSubmit={save}>
            <label className={styles.field}>Tên nhóm<input value={name} onChange={event => setName(event.target.value)} required maxLength={100} disabled={busy} /></label>
            <label className={styles.field}>Mô tả<textarea value={description} onChange={event => setDescription(event.target.value)} maxLength={1000} rows={3} disabled={busy} /></label>
            <div className={styles.actions}>
                <button type="submit" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
                <button type="button" disabled={busy} onClick={() => setEditing(false)}>Hủy</button>
            </div>
        </form>}
        {showInvite && <GroupInviteDialog chat={chat} isLeader={isLeader} onClose={onCloseInvite} />}
    </section>;
};

export default GroupDetails;
