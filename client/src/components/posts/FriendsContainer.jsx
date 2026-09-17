import React, { useEffect } from 'react';
import { useChatStore } from '../../stores/useChatStore';
import classNames from 'classnames/bind';
import styles from '../../assets/css/PostsContainer.module.scss';
import { ChevronLeft, MessageSquare, UserMinus, UserX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const cx = classNames.bind(styles);

const FriendsContainer = () => {
    const { friends, fetchFriends, unfriendAction } = useChatStore();
    const navigate = useNavigate();

    useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);

    const handleMessage = (friend) => {
        // Find existing conversation with this friend
        const existingConvo = useChatStore.getState().conversations.find(c => 
            !c.isGroup && c.participants.some(p => p._id === friend._id)
        );

        if (existingConvo) {
            useChatStore.getState().setActiveConversationId(existingConvo._id);
            navigate(`/chat?id=${existingConvo._id}`);
        } else {
            // Initiate a temp conversation
            const tempId = `temp_${friend._id}`;
            useChatStore.getState().setActiveConversationId(tempId);
            navigate(`/chat?id=${tempId}`);
        }
    };

    const handleUnfriend = async (friend) => {
        if(window.confirm(`Are you sure you want to unfriend ${friend.displayName}?`)) {
            try {
                await unfriendAction(friend._id);
                toast.success(`Unfriended ${friend.displayName}`);
            } catch {
                toast.error("Failed to unfriend");
            }
        }
    }
    
    return (
        <div className={cx('posts-container-wrapper')}>
            <div className={cx('header')}>
                 <button onClick={() => navigate('/feed')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', marginRight: '1rem', display: 'flex', alignItems: 'center' }}>
                    <ChevronLeft size={24} />
                </button>
                <h2>My Friends ({friends.length})</h2>
            </div>
            
            <div className={cx('content-area')}>
                {friends.length === 0 && (
                    <div style={{textAlign: 'center', marginTop: '5rem', opacity: 0.6}}>
                        <p>No friends yet. Check out suggestions!</p>
                    </div>
                )}
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem', padding: '1rem' }}>
                    {friends.map(friend => (
                        <div key={friend._id} style={{
                            backgroundColor: 'var(--surface-subtle)',
                            borderRadius: '1rem',
                            padding: '1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '1rem',
                            textAlign: 'center'
                        }}>
                            <img 
                                src={friend.avatarURL || '/favicon.png'} 
                                alt={friend.displayName} 
                                style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer' }}
                                onClick={() => navigate(`/feed/profile/${friend._id}`)}
                            />
                            <div>
                                <h3 
                                    style={{fontSize: '1.6rem', marginBottom: '0.4rem', cursor: 'pointer'}}
                                    onClick={() => navigate(`/feed/profile/${friend._id}`)}
                                >
                                    {friend.displayName}
                                </h3>
                            </div>
                            
                            <div style={{display: 'flex', gap: '1rem', marginTop: 'auto', width: '100%'}}>
                                <button 
                                    onClick={() => handleMessage(friend)}
                                    style={{
                                        flex: 1,
                                        padding: '0.8rem',
                                        borderRadius: '0.6rem',
                                        border: 'none',
                                        backgroundColor: 'var(--primary-color)',
                                        color: 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center'
                                    }}
                                >
                                    <MessageSquare size={18} />
                                </button>
                                <button 
                                    onClick={() => handleUnfriend(friend)}
                                    style={{
                                        flex: 1,
                                        padding: '0.8rem',
                                        borderRadius: '0.6rem',
                                        border: '1px solid var(--primary-borderColor)',
                                        backgroundColor: 'transparent',
                                        color: 'var(--primary-textColor)',
                                        cursor: 'pointer',
                                         display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center'
                                    }}
                                >
                                    <UserMinus size={18} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default FriendsContainer;
