import React, { useState, useEffect } from 'react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/SettingContainer.module.scss';
import { userSettingsService } from "../../services/userSettingsService.js";
import { useAuthStore } from "../../stores/useAuthStore.js";
import { toast } from 'sonner';
import { UserX, Loader2 } from 'lucide-react';

const cx = classNames.bind(styles);

const BlockedUsers = () => {
    const [blockedList, setBlockedList] = useState([]);
    const { checkAuth } = useAuthStore(); // Unblocking might change user object (blockedUsers array)

    useEffect(() => {
        fetchBlockedUsers();
    }, []);

    const fetchBlockedUsers = async () => {
        try {
            const users = await userSettingsService.getBlockedUsers();
            setBlockedList(users);
        } catch (error) {
            console.error("Failed to fetch blocked users", error);
        }
    };

    const handleUnblock = async (userId) => {
        // We can keep standard confirm for destructive actions if we don't have a custom modal yet, 
        // but let's use toast for the results.
        if (!window.confirm("Are you sure you want to unblock this user?")) return;

        try {
            await userSettingsService.unblockUser(userId);
            setBlockedList(prev => prev.filter(u => u._id !== userId));
            checkAuth();
            toast.success("User unblocked");
        } catch (error) {
            console.error("Failed to unblock user", error);
            toast.error("Failed to unblock user");
        }
    };

    return (
        <>
            <h3>Blocked Users</h3>
            <div className={cx('section')}>
                <h4>Management</h4>
                {blockedList.length === 0 ? (
                    <p style={{ fontSize: '1.4rem', color: 'var(--text-muted)' }}>You haven't blocked anyone yet.</p>
                ) : (
                    <ul className={cx('blocked-list')}>
                        {blockedList.map(u => (
                            <li key={u._id} className={cx('blocked-item')}>
                                <div className={cx('info')}>
                                    <img src={u.avatarURL || "/favicon.png"} alt="avatar" />
                                    <span>{u.displayName || u.username}</span>
                                </div>
                                <button onClick={() => handleUnblock(u._id)} className={cx('unblock-btn')}>Unblock</button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </>
    );
};

export default BlockedUsers;
