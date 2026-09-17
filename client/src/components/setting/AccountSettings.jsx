import React, { useState, useEffect, useRef } from 'react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/SettingContainer.module.scss';
import { useAuthStore } from '../../stores/useAuthStore';
import { authService } from '../../services/authService';
import { Camera, Trash2, ShieldAlert, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { userSettingsService } from '../../services/userSettingsService';

const cx = classNames.bind(styles);

const AccountSettings = ({ handleLogout }) => {
    const { user, updateUser } = useAuthStore();

    const [displayName, setDisplayName] = useState(user?.displayName || "");
    const [username, setUsername] = useState(user?.username || ""); 
    const [bio, setBio] = useState(user?.bio || "");
    const [avatar, setAvatar] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(user?.avatarURL || null);

    const [isUpdating, setIsUpdating] = useState(false);

    // Password Change State
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);

    // Privacy State
    const [whoCanMessage, setWhoCanMessage] = useState(user?.privacy?.whoCanMessage || "Everyone");
    const [showBirthday, setShowBirthday] = useState(user?.privacy?.showBirthday ?? true);
    const [showOnlineStatus, setShowOnlineStatus] = useState(user?.privacy?.showOnlineStatus ?? true);
    const [isUpdatingPrivacy, setIsUpdatingPrivacy] = useState(false);

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (user) {
            setDisplayName(user.displayName || "");
            setUsername(user.username || "");
            setBio(user.bio || "");
            setAvatarPreview(user.avatarURL || null);
        }
    }, [user]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatar(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setAvatarPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpdate = async () => {
        setIsUpdating(true);
        try {
            const formData = new FormData();
            formData.append("displayName", displayName);
            formData.append("bio", bio);
            formData.append("username", username);
            if (avatar) {
                formData.append("avatar", avatar);
            }

            const updatedUser = await authService.updateProfile(formData);

            if (updatedUser) {
                updateUser(updatedUser);
            }

            toast.success("Profile updated successfully!");
        } catch (error) {
            console.error("Failed to update profile:", error);
            toast.error(error.response?.data?.message || "Failed to update profile");
        } finally {
            setIsUpdating(false);
        }
    };

    const handleUpdatePrivacy = async (field, value) => {
        setIsUpdatingPrivacy(true);
        try {
            const updateObj = {
                whoCanMessage: field === 'whoCanMessage' ? value : whoCanMessage,
                showBirthday: field === 'showBirthday' ? value : showBirthday,
                showOnlineStatus: field === 'showOnlineStatus' ? value : showOnlineStatus
            };

            const updatedPrivacy = await userSettingsService.updatePrivacy(updateObj);
            
            updateUser({
                privacy: updatedPrivacy
            });

            if (field === 'whoCanMessage') setWhoCanMessage(value);
            if (field === 'showBirthday') setShowBirthday(value);
            if (field === 'showOnlineStatus') setShowOnlineStatus(value);

            toast.success("Privacy settings updated!");
        } catch (error) {
            console.error("Failed to update privacy:", error);
            toast.error("Failed to update privacy settings");
        } finally {
            setIsUpdatingPrivacy(false);
        }
    };

    const handleChangePassword = async () => {
        if (!oldPassword || !newPassword) {
            toast.error("Please fill in both old and new passwords.");
            return;
        }

        if (newPassword.length < 6) {
            toast.error("New password must be at least 6 characters.");
            return;
        }

        setIsChangingPassword(true);
        try {
            await authService.changePassword(oldPassword, newPassword);
            toast.success("Password changed successfully!");
            setOldPassword("");
            setNewPassword("");

            setTimeout(() => {
                handleLogout();
            }, 2000);
        } catch (error) {
            console.error("Failed to change password:", error);
            toast.error(error.response?.data?.message || "Failed to change password.");
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleDeleteAccount = async () => {
        const confirmText = "DELETE MY ACCOUNT";
        const userInput = prompt(`WARNING: This action is permanent. All your data will be lost.\nType "${confirmText}" to confirm:`);
        
        if (userInput !== confirmText) {
            if (userInput !== null) toast.error("Incorrect confirmation text.");
            return;
        }

        setIsDeletingAccount(true);
        try {
            await userSettingsService.deleteAccount();
            toast.success("Your account has been deleted. Goodbye!");
            setTimeout(() => {
                handleLogout();
            }, 3000);
        } catch (error) {
            console.error("Failed to delete account:", error);
            toast.error("Failed to delete account. Please contact support.");
        } finally {
            setIsDeletingAccount(false);
        }
    };

    return (
        <>
            <h3>Account Settings</h3>

            <div className={cx('section', 'profile-header')}>
                <div className={cx('avatar-wrapper')} onClick={() => fileInputRef.current.click()}>
                    <img
                        src={avatarPreview || "/favicon.png"}
                        alt="Avatar"
                        className={cx('avatar-preview')}
                    />
                    <div className={cx('overlay')}>
                        <Camera size={24} />
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                </div>
                <h4>{user?.displayName || user?.username}</h4>
            </div>

            <div className={cx('section')}>
                <h4>Profile Information</h4>
                <div className={cx('form-group')}>
                    <label htmlFor="displayName">Display Name</label>
                    <input
                        type="text"
                        id="displayName"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                    />
                </div>
                <div className={cx('form-group')}>
                    <label htmlFor="username">Username</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                </div>
                <div className={cx('form-group')}>
                    <label htmlFor="bio">Bio</label>
                    <textarea
                        id="bio"
                        placeholder="Tell something about yourself..."
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                    ></textarea>
                </div>
                <button
                    className={cx("save-btn")}
                    onClick={handleUpdate}
                    disabled={isUpdating}
                >
                    {isUpdating ? "Saving..." : "Save Changes"}
                </button>
            </div>

            <div className={cx('section')}>
                <h4>Security</h4>
                <div className={cx('form-group')}>
                    <label htmlFor="oldPassword">Current Password</label>
                    <input
                        type="password"
                        id="oldPassword"
                        placeholder="Current Password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                    />
                </div>
                <div className={cx('form-group')}>
                    <label htmlFor="newPassword">New Password</label>
                    <input
                        type="password"
                        id="newPassword"
                        placeholder="New Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                    />
                </div>
                <button
                    className={cx("save-btn")}
                    onClick={handleChangePassword}
                    disabled={isChangingPassword}
                    style={{ marginTop: '1rem' }}
                >
                    {isChangingPassword ? "Changing..." : "Change Password"}
                </button>
            </div>

            <div className={cx('section')}>
                <h4>Privacy & Visibility</h4>
                <div className={cx('form-group')}>
                    <label htmlFor="whoCanMessage">Who can message you</label>
                    <select 
                        id="whoCanMessage" 
                        value={whoCanMessage}
                        onChange={(e) => handleUpdatePrivacy('whoCanMessage', e.target.value)}
                        disabled={isUpdatingPrivacy}
                    >
                        <option value="Everyone">Everyone</option>
                        <option value="Friends">Friends</option>
                        <option value="Nobody">Nobody</option>
                    </select>
                </div>

                <div className={cx('form-group', 'row-layout')}>
                    <label>Show Birthday</label>
                    <label className={cx('switch')}>
                        <input
                            type="checkbox"
                            checked={showBirthday}
                            onChange={(e) => handleUpdatePrivacy('showBirthday', e.target.checked)}
                            disabled={isUpdatingPrivacy}
                        />
                        <span className={cx('slider')}></span>
                    </label>
                </div>

                <div className={cx('row-layout')}>
                    <label>Show Online Status</label>
                    <label className={cx('switch')}>
                        <input
                            type="checkbox"
                            checked={showOnlineStatus}
                            onChange={(e) => handleUpdatePrivacy('showOnlineStatus', e.target.checked)}
                            disabled={isUpdatingPrivacy}
                        />
                        <span className={cx('slider')}></span>
                    </label>
                </div>
            </div>

            <div className={cx('section', 'danger-zone')}>
                <h4>Danger Zone</h4>
                <p>Once you delete your account, there is no going back. Please be certain.</p>
                <button 
                    className={cx("delete-btn")} 
                    onClick={handleDeleteAccount}
                    disabled={isDeletingAccount}
                >
                    {isDeletingAccount ? "Deleting..." : "Delete Account"}
                </button>
            </div>

            <button className={cx("sign-out-btn")} onClick={handleLogout}>Sign out</button>

        </>
    );
};

export default AccountSettings;