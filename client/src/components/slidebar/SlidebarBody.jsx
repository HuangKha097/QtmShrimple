import React, { useEffect, useMemo, useState } from 'react';
import classNames from 'classnames/bind';
import { motion as Motion } from 'motion/react';
import { Search } from 'lucide-react';
import styles from '../../assets/css/SlideBarBody.module.scss';
import BodyFriendsChat from "./BodyFriendsChat.jsx";
import BodyGroupsChat from "./BodyGroupsChat.jsx";
import BodyRequests from "./BodyRequests.jsx";
import { useChatStore } from "../../stores/useChatStore.js";
import { useAuthStore } from "../../stores/useAuthStore.js";

const cx = classNames.bind(styles);

const SlidebarBody = () => {
    const { conversations = [], friendRequests = [], friends = [], fetchFriends } = useChatStore();
    const { user } = useAuthStore();
    const [activeTab, setActiveTab] = useState('friends');
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        if (fetchFriends) fetchFriends();
    }, [fetchFriends]);

    // LOGIC LỌC TRÙNG LẶP & NULL-SAFE
    const combinedList = useMemo(() => {
        if (!user) return [];

        const processedPartnerIds = new Set();
        const uniqueConversations = [];

        // 1. Sắp xếp conversations
        const sortedConversations = [...(conversations || [])].sort((a, b) => {
            const dateA = new Date(a?.lastMessageAt || a?.updatedAt || 0);
            const dateB = new Date(b?.lastMessageAt || b?.updatedAt || 0);
            return dateB - dateA;
        });

        // 2. Lặp qua danh sách đã sắp xếp để lọc trùng
        sortedConversations.forEach(c => {
            if (!c || c.isGroup) return;

            if (!c.participants || !Array.isArray(c.participants)) {
                return;
            }

            const partner = c.participants.find(p => p && p._id && user && p._id !== user._id);

            if (partner && partner._id) {
                if (!processedPartnerIds.has(partner._id)) {
                    processedPartnerIds.add(partner._id);
                    uniqueConversations.push(c);
                }
            }
        });

        // 3. Gộp thêm những người bạn CHƯA từng chat (Fix triệt để Cannot read properties of null '_id')
        const safeFriends = Array.isArray(friends) ? friends : [];
        const friendsNoChat = safeFriends
            .filter(friend => friend && friend._id && !processedPartnerIds.has(friend._id))
            .map(friend => ({
                _id: `temp_${friend._id}`,
                isGroup: false,
                participants: [friend],
                lastMessage: null,
                unreadCounts: 0,
                updatedAt: 0
            }));

        return [...uniqueConversations, ...friendsNoChat];
    }, [conversations, friends, user]);

    // Lọc Group riêng
    const groupConversations = (conversations || []).filter((convo) => convo && convo.isGroup);

    // --- LOGIC SEARCH ---
    const filteredFriends = useMemo(() => {
        if (!searchText.trim()) return combinedList;
        const lowerSearch = searchText.toLowerCase();

        return combinedList.filter(item => {
            if (!item) return false;
            const participants = item.participants || [];
            let partner;
            
            if (item.isGroup) {
                 return (item.name || item.group?.name || "").toLowerCase().includes(lowerSearch);
            } else {
                partner = participants.find(p => p && p._id && user && p._id !== user._id) || participants[0];
            }

            const name = partner?.displayName || partner?.username || "";
            return name.toLowerCase().includes(lowerSearch);
        });
    }, [combinedList, searchText, user]);

    const filteredGroups = useMemo(() => {
        if (!searchText.trim()) return groupConversations;
        const lowerSearch = searchText.toLowerCase();

        return groupConversations.filter(group => {
            if (!group) return false;
            const name = group.name || group.group?.name || "";
            return name.toLowerCase().includes(lowerSearch);
        });
    }, [groupConversations, searchText]);

    const countGroups = groupConversations.length;
    const countFriendRequest = (friendRequests || []).length;

    const tabs = [
        { key: 'friends', label: 'Hộp thư đến', count: 0 },
        { key: 'groups', label: 'Nhóm', count: countGroups },
        { key: 'requests', label: 'Lời mời', count: countFriendRequest }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'friends':
                return <BodyFriendsChat convo={filteredFriends} />;
            case 'groups':
                return <BodyGroupsChat convo={filteredGroups} />;
            case 'requests':
                return <BodyRequests friendRequests={friendRequests || []} />;
            default:
                return <BodyFriendsChat convo={combinedList} />;
        }
    };

    return (
        <div className={cx("slidebar-body-wrapper")}>
            {/* Pill Search Box */}
            <div className={cx("search-container")}>
                <div className={cx("search-box")}>
                    <Search className={cx("search-icon")} size={16} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm tin nhắn trực tiếp..."
                        className={cx("search-input")}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                </div>
            </div>

            {/* Sub-Tabs X-Style */}
            <div className={cx("slidebar-body-navigation")}>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.key;
                    return (
                        <button
                            key={tab.key}
                            type="button"
                            className={cx("nav-item", { active: isActive })}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            <span className={cx("tab-label")}>
                                {tab.label}
                                {tab.count > 0 && <span className={cx("tab-badge")}>{tab.count}</span>}
                            </span>
                            {isActive && (
                                <Motion.div
                                    layoutId="x-msg-tab"
                                    className={cx("active-indicator")}
                                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Conversations List */}
            <div className={cx("slidebar-body-list")}>
                {renderContent()}
            </div>
        </div>
    );
};

export default SlidebarBody;