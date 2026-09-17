import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePostStore } from '../../stores/usePostStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useChatStore } from '../../stores/useChatStore';
import { authService } from '../../services/authService';
import classNames from 'classnames/bind';
import styles from '../../assets/css/PostsContainer.module.scss'; // Reuse styles
import { ChevronLeft } from 'lucide-react';
import PostItem from './PostItem';
import { toast } from 'sonner';

const cx = classNames.bind(styles);

const ProfileContainer = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    const { userPosts, fetchUserPosts, likePost, addComment, deletePost } = usePostStore();
    const { user: currentUser } = useAuthStore();
    const { friends, sendRequestAction } = useChatStore();

    const [profileUser, setProfileUser] = useState(null);
    const [isLoadingUser, setIsLoadingUser] = useState(true);

    const isFriend = friends.some(f => f._id === userId);

    const handleAddFriend = async () => {
        try {
            await sendRequestAction(userId);
            toast.success("Friend request sent!");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to send request");
        }
    };

    useEffect(() => {
        const loadData = async () => {
            if (!userId) return;
            setIsLoadingUser(true);
            try {
                // Fetch User Info
                const userData = await authService.getUserById(userId);
                setProfileUser(userData);
                
                // Fetch User Posts
                await fetchUserPosts(userId);
            } catch (error) {
                console.error("Failed to load profile", error);
                toast.error("Failed to load profile");
            } finally {
                setIsLoadingUser(false);
            }
        };
        loadData();
    }, [userId, fetchUserPosts]);

    if (isLoadingUser) {
        return <div className={cx('posts-container-wrapper')} style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%'}}>Loading...</div>;
    }

    if (!profileUser) {
        return <div className={cx('posts-container-wrapper')} style={{padding: '2rem', textAlign: 'center'}}>User not found</div>;
    }

    return (
        <div className={cx('posts-container-wrapper')}>
            <div className={cx('header')}>
                 <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginRight: '1rem', display: 'flex', alignItems: 'center' }}>
                    <ChevronLeft size={24} />
                </button>
                <h2>{profileUser.displayName}'s Wall</h2>
            </div>
            
            <div className={cx('content-area')}>
                {/* Profile Header Card */}
                <div style={{
                    backgroundColor: 'var(--primary-blockBackgroundColor)',
                    padding: '2.5rem 2rem',
                    borderRadius: '1rem',
                    marginBottom: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2.5rem',
                    border: '1px solid var(--primary-borderColor)',
                    flexWrap: 'wrap'
                }}>
                    <img 
                        src={profileUser.avatarURL || '/favicon.png'} 
                        alt={profileUser.displayName} 
                        style={{width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0}}
                    />
                    <div style={{ display: 'flex', flex: 1, justifyContent: 'space-between', alignItems: 'center', gap: '3rem', flexWrap: 'wrap', minWidth: '280px' }}>
                        {/* Column 1: Info and Actions */}
                        <div>
                            <h1 style={{fontSize: '2rem', marginBottom: '0.5rem', fontWeight: '600'}}>{profileUser.displayName}</h1>
                            <p style={{opacity: 0.7, fontSize: '1.1rem', marginBottom: '1.2rem'}}>@{profileUser.username}</p>
                            
                            {/* Profile Actions */}
                            {currentUser._id !== profileUser._id && (
                                <div style={{display: 'flex', gap: '1rem'}}>
                                    {isFriend ? (
                                        <>
                                            <button 
                                                onClick={() => {
                                                    // Find existing conversation with this friend
                                                    const existingConvo = useChatStore.getState().conversations.find(c => 
                                                        !c.isGroup && c.participants.some(p => p._id === profileUser._id)
                                                    );

                                                    if (existingConvo) {
                                                        useChatStore.getState().setActiveConversationId(existingConvo._id);
                                                        navigate(`/chat?id=${existingConvo._id}`);
                                                    } else {
                                                        const tempId = `temp_${profileUser._id}`;
                                                        useChatStore.getState().setActiveConversationId(tempId);
                                                        navigate(`/chat?id=${tempId}`);
                                                    }
                                                }}
                                                style={{
                                                    padding: '0.8rem 1.6rem',
                                                    backgroundColor: 'var(--primary-color)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '0.6rem',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.5rem',
                                                    fontWeight: '600'
                                                }}
                                            >
                                                Message
                                            </button>
                                            <div style={{
                                                padding: '0.8rem 1.6rem',
                                                backgroundColor: 'var(--surface-subtle)',
                                                color: 'var(--primary-textColor)',
                                                borderRadius: '0.6rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                            }}>
                                                Friends
                                            </div>
                                        </>
                                    ) : (
                                        <button 
                                            onClick={handleAddFriend}
                                            style={{
                                                padding: '0.8rem 1.6rem',
                                                backgroundColor: 'var(--primary-color)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '0.6rem',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '0.5rem',
                                                fontWeight: '600'
                                            }}
                                        >
                                            Add Friend
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Column 2: Bio Panel */}
                        <div style={{
                            flex: 1,
                            minWidth: '260px',
                            maxWidth: '480px',
                            height: '115px',
                            padding: '1rem 1.4rem',
                            backgroundColor: 'var(--surface-subtle)',
                            borderRadius: '0.8rem',
                            border: '1px solid var(--primary-borderColor)',
                            display: 'flex',
                            flexDirection: 'column',
                            boxSizing: 'border-box'
                        }}>
                            <span style={{ 
                                fontSize: '0.85rem', 
                                textTransform: 'uppercase', 
                                letterSpacing: '0.08em', 
                                opacity: 0.45, 
                                marginBottom: '0.4rem',
                                fontWeight: '700',
                                flexShrink: 0
                            }}>
                                Bio / Tiểu sử
                            </span>
                            <div style={{
                                flex: 1,
                                overflowY: 'auto',
                                paddingRight: '0.4rem'
                            }}>
                                <p style={{ 
                                    fontSize: '1.1rem', 
                                    lineHeight: '1.5',
                                    opacity: 0.85, 
                                    margin: 0,
                                    whiteSpace: 'pre-wrap', 
                                    wordBreak: 'break-word',
                                    fontStyle: profileUser.bio ? 'normal' : 'italic'
                                }}>
                                    {profileUser.bio || "Người dùng chưa cập nhật tiểu sử."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Posts */}
                {userPosts.length === 0 ? (
                    <div style={{textAlign: 'center', opacity: 0.6, marginTop: '2rem'}}>
                        <p>No posts yet.</p>
                    </div>
                ) : (
                    userPosts.map(post => (
                        <PostItem 
                            key={post._id} 
                            post={post} 
                            currentUser={currentUser}
                            onLike={likePost}
                            onComment={addComment}
                            onDelete={deletePost}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

export default ProfileContainer;
