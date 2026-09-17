
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePostStore } from '../stores/usePostStore';
import { useAuthStore } from '../stores/useAuthStore';
import classNames from 'classnames/bind';
import styles from '../assets/css/PostsContainer.module.scss';
import { ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

// TODO: Refactor PostItem to its own file (e.g. components/posts/PostItem.jsx) to avoid duplication
import { Image, Send, Heart, MessageCircle, Trash2, MoreHorizontal, Bookmark, Link as LinkIcon, EyeOff, Flag, Edit } from 'lucide-react';

const cx = classNames.bind(styles);
const PostItem = ({ post, currentUser, onLike, onComment, onDelete }) => {
    const navigate = useNavigate();
    const [commentText, setCommentText] = useState('');
    const [showOptions, setShowOptions] = useState(false);
    const optionsRef = React.useRef(null);
    
    // Close options menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (optionsRef.current && !optionsRef.current.contains(event.target)) {
                setShowOptions(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const isLiked = post.likes.includes(currentUser?._id);
    
    const handleComment = async (e) => {
        if (e.key === 'Enter' && commentText.trim()) {
            await onComment(post._id, commentText);
            setCommentText('');
        }
    };
    
    const handleDelete = () => {
        if(window.confirm("Are you sure you want to delete this post?")) {
             onDelete(post._id);
        }
        setShowOptions(false);
    }
    
     const handleCopyLink = () => {
         navigator.clipboard.writeText(`${window.location.origin}/post/${post._id}`);
         toast.success("Link copied to clipboard");
         setShowOptions(false);
    };

    const handleHidePost = () => {
        toast.info("Post hidden. We'll show fewer posts like this.");
        setShowOptions(false);
    };
    
    const handleReportPost = () => {
        toast.info("Thank you for reporting this post.");
        setShowOptions(false);
    };


    return (
        <div className={cx('post-item')} style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
            <div className={cx('post-header')} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div 
                    style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }} 
                    onClick={() => navigate(`/feed/profile/${post.author?._id}`)}
                >
                    <img src={post.author?.avatarURL || '/favicon.png'} alt="avatar" style={{width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover'}} />
                    <div className={cx('user-info')} style={{ display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>{post.author?.displayName || post.author?.username}</h4>
                        <span style={{ fontSize: '1.2rem', color: '#aaa', marginTop: '0.2rem' }}>{new Date(post.createdAt).toLocaleString()}</span>
                    </div>
                </div>
                
                <div className={cx('more-options-wrapper')} ref={optionsRef}>
                    <button className={cx('more-btn')} onClick={() => setShowOptions(!showOptions)}>
                        <MoreHorizontal size={20} />
                    </button>
                    
                    {showOptions && (
                        <div className={cx('options-menu')}>
                             <button className={cx('menu-option')} onClick={() => {toast.info('Saved to collection'); setShowOptions(false);}}>
                                <Bookmark size={16} />
                                <span>Save Post</span>
                            </button>
                            
                            <button className={cx('menu-option')} onClick={handleCopyLink}>
                                <LinkIcon size={16} />
                                <span>Copy Link</span>
                            </button>

                            <button className={cx('menu-option')} onClick={handleHidePost}>
                                <EyeOff size={16} />
                                <span>Not interested</span>
                            </button>
                            
                            <button className={cx('menu-option')} onClick={handleReportPost}>
                                <Flag size={16} />
                                <span>Report Post</span>
                            </button>
                            
                            {post.author?._id === currentUser?._id && (
                                <>
                                    <div className={cx('menu-separator')}></div>
                                    <button className={cx('menu-option')} onClick={() => {toast.info('Edit feature coming soon'); setShowOptions(false);}}>
                                        <Edit size={16} />
                                        <span>Edit Post</span>
                                    </button>
                                     <button className={cx('menu-option', 'delete-option')} onClick={handleDelete}>
                                        <Trash2 size={16} />
                                        <span>Move to trash</span>
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
            
            <div className={cx('post-content')}>
                {post.content}
            </div>
            
            {post.image && (
                <div style={{ width: '100%', maxHeight: '600px', borderRadius: '1.2rem', overflow: 'hidden', marginTop: '1.5rem', background: 'rgba(0,0,0,0.2)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <img 
                        src={post.image.startsWith('http') ? post.image : `http://localhost:5001${post.image}`} 
                        alt="post content" 
                        className={cx('post-image')} 
                        style={{ width: '100%', height: 'auto', maxHeight: '600px', objectFit: 'contain' }}
                    />
                </div>
            )}
            
            <div className={cx('post-actions')}>
                <button 
                    className={cx({ liked: isLiked })}
                    onClick={() => onLike(post._id)}
                >
                    <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
                    <span>{post.likes.length} Likes</span>
                </button>
                <button>
                    <MessageCircle size={20} />
                    <span>{post.comments.length} Comments</span>
                </button>
            </div>
            
            <div className={cx('comments-section')}>
                <div className={cx('comment-input')}>
                     <img src={currentUser?.avatarURL || '/favicon.png'} alt="my avatar" style={{width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover'}} />
                     <input 
                        type="text" 
                        placeholder="Write a comment..." 
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={handleComment}
                     />
                     <button onClick={() => {if(commentText.trim()) { onComment(post._id, commentText); setCommentText('') }}} style={{background:'none', border:'none', color:'var(--primary-color)', cursor:'pointer'}}>
                        <Send size={18} />
                     </button>
                </div>
                
                <div className={cx('comment-list')} style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {post.comments.map((comment, index) => (
                        <div key={index} className={cx('comment')} style={{ display: 'flex', gap: '1.2rem', alignItems: 'flex-start' }}>
                            <img 
                                src={comment.postedBy?.avatarURL || '/favicon.png'} 
                                alt="avatar" 
                                style={{width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', flexShrink: 0}} 
                                onClick={() => navigate(`/feed/profile/${comment.postedBy?._id}`)} 
                            />
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem 1.4rem', borderRadius: '1.6rem', borderTopLeftRadius: '0.4rem', flex: 1 }}>
                                <strong 
                                    style={{ display: 'block', marginBottom: '0.4rem', cursor: 'pointer', color: 'var(--primary-color)', fontSize: '1.3rem' }} 
                                    onClick={() => navigate(`/feed/profile/${comment.postedBy?._id}`)}
                                >
                                    {comment.postedBy?.displayName || comment.postedBy?.username || 'User'}
                                </strong>
                                <span style={{ fontSize: '1.4rem', lineHeight: '1.5', color: '#ececec', wordBreak: 'break-word' }}>{comment.text}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};


const SinglePostPage = () => {
    const { postId } = useParams();
    const navigate = useNavigate();
    const { getPostById, likePost, addComment, deletePost } = usePostStore();
    const { user } = useAuthStore();
    
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const data = await getPostById(postId);
                setPost(data);
            } catch (err) {
                setError(err.response?.data?.message || "Failed to load post");
            } finally {
                setLoading(false);
            }
        };
        fetchPost();
    }, [postId, getPostById]);

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white' }}>
                <h2>Loading post...</h2>
            </div>
        );
    }

    if (error || !post) {
         return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', color: 'white', gap: '1rem' }}>
                <h2>{error || "Post not found"}</h2>
                <button 
                    onClick={() => navigate('/feed')}
                    style={{ padding: '0.8rem 1.5rem', borderRadius: '2rem', border: 'none', background: 'var(--primary-color)', color: 'white', cursor: 'pointer', fontSize: '1.4rem' }}
                >
                    Go Back to Feed
                </button>
            </div>
        );
    }

    return (
        <div className={cx('posts-container-wrapper')} style={{ height: '100vh', width: '100vw' }}>
             <div className={cx('header')} style={{ justifyContent: 'flex-start', gap: '1.5rem' }}>
                <button onClick={() => navigate('/feed')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                    <ChevronLeft size={24} />
                </button>
                <h2>Post</h2>
            </div>
            
            <div className={cx('content-area')}>
                <PostItem 
                    post={post}
                    currentUser={user}
                    onLike={async (id) => {
                        await likePost(id);
                        // Refresh post data to show new like state
                        const updated = await getPostById(id);
                        setPost(updated);
                    }}
                    onComment={async (id, text) => {
                         await addComment(id, text);
                         // Refresh post data
                         const updated = await getPostById(id);
                         setPost(updated);
                    }}
                    onDelete={async (id) => {
                        await deletePost(id);
                        navigate('/feed');
                    }}
                />
            </div>
        </div>
    );
};

export default SinglePostPage;
