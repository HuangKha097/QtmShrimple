import React, { useState, useEffect, useRef } from 'react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/CreateGroupPopUp.module.scss';
import {
    X, Camera, Search, Plus, Minus,
    Loader2
} from 'lucide-react';
import default_avt from "../../../public/favicon.png";

import { useChatStore } from "../../stores/useChatStore.js";
import { toast } from "sonner";

const cx = classNames.bind(styles);

const CreateGroupPopup = ({ onCloseCreateGroupPopup }) => {
    const { friends, fetchFriends, isCreatingGroup, createConversation } = useChatStore();

    // --- State Form ---
    const [groupName, setGroupName] = useState('');
    const [groupDesc, setGroupDesc] = useState('');
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [groupAvatarFile, setGroupAvatarFile] = useState(null);

    // --- State Members ---
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [searchKeyword, setSearchKeyword] = useState('');

    const fileInputRef = useRef(null);

    useEffect(() => {
        if (fetchFriends) fetchFriends();
    }, [fetchFriends]);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setGroupAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const toggleMember = (user) => {
        const isSelected = selectedMembers.some(m => m._id === user._id);
        if (isSelected) {
            setSelectedMembers(prev => prev.filter(m => m._id !== user._id));
        } else {
            setSelectedMembers(prev => [...prev, user]);
        }
    };

    const filteredFriends = Array.isArray(friends)
        ? friends.filter(f =>
            (f.displayName || f.username).toLowerCase().includes(searchKeyword.toLowerCase())
        )
        : [];

    // --- LOGIC VALIDATION ---
    const isNameValid = groupName.trim().length > 0;
    // Cần tối thiểu 2 người được chọn (cộng bản thân user nữa là 3)
    const isMembersValid = selectedMembers.length >= 2;
    const canCreate = isNameValid && isMembersValid;

    // Submit
    const handleCreateGroup = async () => {
        // --- VALIDATION ---
        if (!isNameValid) {
            toast.error("Please enter a group name!");
            return;
        }
        if (!isMembersValid) {
            toast.warning(`Please select at least 2 friends (Selected: ${selectedMembers.length})`);
            return;
        }

        try {
            // 1. Lấy danh sách ID của các thành viên đã chọn
            const memberIds = selectedMembers.map(user => user._id);

            // 2. Gọi action từ store (isGroup = true)
            await createConversation(true, groupName, memberIds);

            // 3. Thông báo thành công
            toast.success(`Group "${groupName}" created successfully!`);

            // 4. Đóng popup
            onCloseCreateGroupPopup();

        } catch (error) {
            console.error(error);
            toast.error("Failed to create group. Please try again.");
        }
    };
    return (
        <div className={cx('overlay')}>
            <div className={cx('popup-container')}>
                <div className={cx('header')}>
                    <h3 className={cx('title')}>Create Group</h3>
                    <button className={cx('close-btn')} onClick={onCloseCreateGroupPopup}>
                        <X size={24} />
                    </button>
                </div>

                <div className={cx('body-content')}>

                    {/* SECTION 1: GROUP INFO & AVATAR */}
                    <div className={cx('group-form')}>
                        <div
                            className={cx('avatar-upload')}
                            onClick={() => fileInputRef.current.click()}
                        >
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Group Avatar" className={cx('avatar-preview')} />
                            ) : (
                                <div className={cx('avatar-placeholder')}>
                                    <Camera size={24} />
                                </div>
                            )}
                            <input
                                type="file"
                                hidden
                                ref={fileInputRef}
                                accept="image/*"
                                onChange={handleImageChange}
                            />
                        </div>

                        <div className={cx('inputs')}>
                            <input
                                type="text"
                                className={cx('input-group-name')}
                                placeholder="Group Name (Required)"
                                value={groupName}
                                onChange={(e) => setGroupName(e.target.value)}
                            />
                            <input
                                type="text"
                                className={cx('input-group-desc')}
                                placeholder="Description (Optional)"
                                value={groupDesc}
                                onChange={(e) => setGroupDesc(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* SECTION 2: SELECTED MEMBERS */}
                    {selectedMembers.length > 0 && (
                        <div className={cx('selected-area')}>
                            <span className={cx('label')}>Selected ({selectedMembers.length}):</span>
                            <div className={cx('chips-wrapper')}>
                                {selectedMembers.map(user => (
                                    <div key={user._id} className={cx('chip')}>
                                        <img src={user.avatarURL || default_avt} alt="" />
                                        <span>{user.displayName || user.username}</span>
                                        <button onClick={() => toggleMember(user)}>
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* SECTION 3: SEARCH & LIST */}
                    <div className={cx('search-wrapper')}>
                        <input
                            type="text"
                            placeholder="Search friends..."
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            className={cx('search-input')}
                        />
                        <div className={cx('search-icon-box')}>
                            <Search size={20} />
                        </div>
                    </div>

                    <div className={cx('results-list')}>
                        {filteredFriends.length === 0 ? (
                            <div className={cx('empty-state')}>No friends found.</div>
                        ) : (
                            filteredFriends.map((user) => {
                                const isSelected = selectedMembers.some(m => m._id === user._id);
                                return (
                                    <div key={user._id} className={cx('user-item', { active: isSelected })}>
                                        <div className={cx('user-info')}>
                                            <img src={user.avatarURL || default_avt} alt="avatar" className={cx('avatar')} />
                                            <div className={cx('details')}>
                                                <p className={cx('name')}>{user.displayName || user.username}</p>
                                                <p className={cx('email')}>{user.email}</p>
                                            </div>
                                        </div>

                                        <button
                                            className={cx('action-btn', { remove: isSelected, add: !isSelected })}
                                            onClick={() => toggleMember(user)}
                                        >
                                            {isSelected ? <Minus size={20} /> : <Plus size={20} />}
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* FOOTER */}
                <div className={cx('footer')}>
                    {/* Giữ nguyên logic hiển thị nút disabled ảo */}
                    <button
                        className={cx('btn-create', { disabled: !canCreate })}
                        onClick={handleCreateGroup}
                    >
                        {isCreatingGroup ? <Loader2 className={cx('spin')} size={20} /> : "Create Group"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CreateGroupPopup;