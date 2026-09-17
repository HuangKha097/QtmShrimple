import React, { useState, useEffect } from 'react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/AddFriendPopUp.module.scss';
import { Search, UserPlus, X, Check, UserCheck, Loader2 } from 'lucide-react';
import default_avt from "../../../public/favicon.png";

import { userService } from "../../services/userService.js";
import { useChatStore } from "../../stores/useChatStore.js";
import { useAuthStore } from "../../stores/useAuthStore.js";
import { friendService } from "../../services/friendService.js";
import { toast } from "sonner";

// Import component LoadingSpin chung (Kiểm tra lại đường dẫn file của bạn)
import LoadingSpin from "../common/loading/LoadingSpin.jsx";

const cx = classNames.bind(styles);

const AddFriendPopUp = ({ onCloseAddFriendPopup }) => {
    // 1. Lấy friends và action từ Store
    const { friends, fetchFriends } = useChatStore();
    const { user: currentUser } = useAuthStore();

    const [keyword, setKeyword] = useState('');
    const [isLoadingSearch, setIsLoadingSearch] = useState(false);
    const [searchResults, setSearchResults] = useState([]);

    // State lưu trạng thái gửi lời mời
    const [sentRequests, setSentRequests] = useState({});
    const [pendingRequests, setPendingRequests] = useState({});

    // 2. Load danh sách bạn bè khi mở popup để check trạng thái
    useEffect(() => {
        if (fetchFriends) {
            fetchFriends();
        }
    }, [fetchFriends]);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!keyword.trim()) return;

        setIsLoadingSearch(true);
        setSearchResults([]);

        try {
            const data = await friendService.findUserByUsername(keyword);
            // Lọc bỏ chính mình khỏi kết quả tìm kiếm
            setSearchResults(data.filter((item) => item._id !== currentUser._id));
        } catch (error) {
            console.error(error);
            toast.error("Lỗi tìm kiếm");
        } finally {
            setIsLoadingSearch(false);
        }
    };

    const handleAddFriend = async (userId) => {
        setPendingRequests(prev => ({ ...prev, [userId]: true }));
        try {
            await friendService.sendRequest(userId);
            setSentRequests(prev => ({ ...prev, [userId]: true }));
            toast.success("Đã gửi lời mời!");
        } catch (error) {
            const msg = error.response?.data?.message || "Lỗi";
            if (msg === "You already send request") {
                setSentRequests(prev => ({ ...prev, [userId]: true }));
                toast.info("Đã gửi lời mời trước đó rồi.");
            } else {
                toast.error(msg);
            }
        } finally {
            setPendingRequests(prev => ({ ...prev, [userId]: false }));
        }
    };

    // Kiểm tra an toàn: Đảm bảo friends luôn là mảng
    const safeFriends = Array.isArray(friends) ? friends : [];

    return (
        <div className={cx('popup-container')}>
            <div className={cx('header')}>
                <h3 className={cx('title')}>Add Friend</h3>
                <button className={cx('close-btn')} onClick={onCloseAddFriendPopup}>
                    <X size={24} />
                </button>
            </div>

            <form onSubmit={handleSearch} className={cx('search-wrapper')}>
                <input
                    type="text"
                    placeholder="Enter username..."
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className={cx('search-input')}
                />
                <button type="submit" className={cx('search-btn')} disabled={isLoadingSearch}>
                    {/* Giữ Loader2 ở đây vì nút nhỏ, LoadingSpin có padding lớn */}
                    {isLoadingSearch ? <Loader2 className={cx('btn-spinner')} size={20} /> : <Search size={20} />}
                </button>
            </form>

            <div className={cx('results-list')}>

                {/* CASE 1: Đang Loading -> Dùng LoadingSpin */}
                {isLoadingSearch && (
                    <div className={cx('loading-state')}>
                        <LoadingSpin size={30} />
                        <p>Searching...</p>
                    </div>
                )}

                {/* CASE 2: Không tìm thấy kết quả */}
                {!isLoadingSearch && searchResults.length === 0 && keyword && (
                    <div className={cx('empty-state')}>
                        No user found with username "{keyword}"
                    </div>
                )}

                {/* CASE 3: Hiển thị danh sách */}
                {!isLoadingSearch && searchResults.map((user) => {
                    const isFriend = safeFriends.some((f) => f._id === user._id);
                    const isSent = sentRequests[user._id];
                    const isPending = pendingRequests[user._id];

                    return (
                        <div key={user._id} className={cx('user-item')}>
                            <div className={cx('user-info')}>
                                <img src={user.avatarURL || default_avt} alt="avatar" className={cx('avatar')} />
                                <div className={cx('details')}>
                                    <p className={cx('name')}>{user.displayName || user.username}</p>
                                    <p className={cx('email')}>{user.email}</p>
                                </div>
                            </div>

                            <button
                                className={cx('add-btn', {
                                    sent: isSent,
                                    friend: isFriend
                                })}
                                onClick={() => handleAddFriend(user._id)}
                                disabled={isSent || isFriend || isPending}
                            >
                                {isPending ? (
                                    <Loader2 className={cx('btn-spinner')} size={18} />
                                ) : isFriend ? (
                                    <>
                                        <UserCheck size={18} />
                                        <span>Friend</span>
                                    </>
                                ) : isSent ? (
                                    <>
                                        <Check size={18} />
                                        <span>Sent</span>
                                    </>
                                ) : (
                                    <>
                                        <UserPlus size={18} />
                                        <span>Add</span>
                                    </>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AddFriendPopUp;