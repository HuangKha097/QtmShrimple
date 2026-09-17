import { create } from "zustand";
import api from "../lib/axios.js";
import { toast } from "sonner";

export const usePostStore = create((set, get) => ({
    posts: [],
    userPosts: [],
    savedPosts: [],
    videoPosts: [],
    postsNextCursor: null,
    hasMorePosts: true,
    
    videoNextCursor: null,
    hasMoreVideos: true,
    
    isLoading: false,

    fetchPosts: async (isRefresh = false) => {
        const { postsNextCursor, hasMorePosts, isLoading } = get();
        if (isLoading) return;

        // If not refreshing and no more posts, do nothing
        if (!isRefresh && !hasMorePosts) return;

        set({ isLoading: true });
        try {
            const cursor = isRefresh ? null : postsNextCursor;
            const query = cursor ? `?limit=10&cursor=${cursor}` : `?limit=10`;
            
            const res = await api.get(`/api/posts${query}`);
            const { posts: newPosts, nextCursor } = res.data;

            set((state) => ({
                posts: isRefresh ? newPosts : [...state.posts, ...newPosts],
                postsNextCursor: nextCursor,
                hasMorePosts: !!nextCursor
            }));
            
            return newPosts;
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to fetch posts");
            return [];
        } finally {
            set({ isLoading: false });
        }
    },

    fetchUserPosts: async (userId) => {
        set({ isLoading: true });
        try {
            const res = await api.get(`/api/posts/user/${userId}`);
            set({ userPosts: res.data });
        } catch (error) {
            console.error(error);
            toast.error("Failed to fetch user posts");
        } finally {
            set({ isLoading: false });
        }
    },

    createPost: async (postData) => {
        set({ isLoading: true });
        try {

            let dataToSend = postData;
            // ... (keep existing Logic for FormData vs JSON)
            if (postData.image instanceof File) {
                const formData = new FormData();
                formData.append("content", postData.content);
                formData.append("media", postData.image);
                dataToSend = formData;
            }

            const res = await api.post("/api/posts/create", dataToSend); 
            
            const newPost = res.data;
            
            set((state) => {
                const posts = [newPost, ...state.posts];
                
                // Keep video logic
                let videoPosts = state.videoPosts;
                const isVideo = newPost.video || (newPost.mediaUrl && (newPost.mediaUrl.endsWith('.mp4') || newPost.mediaType === 'video'));
                
                if (isVideo) { 
                     videoPosts = [newPost, ...state.videoPosts];
                }
                
                return { posts, videoPosts };
            });
            toast.success("Post created successfully");
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to create post");
        } finally {
            set({ isLoading: false });
        }
    },

    likePost: async (postId) => {
        try {
            const res = await api.put(`/api/posts/like/${postId}`);
            const updatedPost = res.data;
            
            set(state => ({
                posts: state.posts.map(p => p._id === postId ? updatedPost : p),
                videoPosts: state.videoPosts.map(p => p._id === postId ? updatedPost : p),
                userPosts: state.userPosts.map(p => p._id === postId ? updatedPost : p),
                savedPosts: state.savedPosts.map(p => p._id === postId ? updatedPost : p)
            }));
        } catch (error) {
            console.error(error);
            toast.error("Failed to like post");
        }
    },

    addComment: async (postId, text) => {
        try {
            const res = await api.put(`/api/posts/comment/${postId}`, { text });
            const updatedPost = res.data;

            set(state => ({
                posts: state.posts.map(p => p._id === postId ? updatedPost : p),
                videoPosts: state.videoPosts.map(p => p._id === postId ? updatedPost : p),
                userPosts: state.userPosts.map(p => p._id === postId ? updatedPost : p),
                savedPosts: state.savedPosts.map(p => p._id === postId ? updatedPost : p)
            }));
            toast.success("Comment added");
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to add comment");
        }
    },

    reactToComment: async (postId, commentId, reaction) => {
        try {
            const res = await api.put(`/api/posts/${postId}/comment/${commentId}/like`, { reaction });
            const updatedPost = res.data;
            
             set(state => ({
                posts: state.posts.map(p => p._id === postId ? updatedPost : p),
                videoPosts: state.videoPosts.map(p => p._id === postId ? updatedPost : p),
                userPosts: state.userPosts.map(p => p._id === postId ? updatedPost : p),
                savedPosts: state.savedPosts.map(p => p._id === postId ? updatedPost : p)
            }));
        } catch (error) {
            console.error(error);
            toast.error("Failed to react to comment");
        }
    },

    replyComment: async (postId, commentId, text) => {
        try {
            const res = await api.post(`/api/posts/${postId}/comment/${commentId}/reply`, { text });
            const updatedPost = res.data;
            
             set(state => ({
                posts: state.posts.map(p => p._id === postId ? updatedPost : p),
                videoPosts: state.videoPosts.map(p => p._id === postId ? updatedPost : p),
                userPosts: state.userPosts.map(p => p._id === postId ? updatedPost : p),
                savedPosts: state.savedPosts.map(p => p._id === postId ? updatedPost : p)
            }));
            toast.success("Reply added");
        } catch (error) {
            console.error(error);
            toast.error("Failed to reply");
        }
    },

    reactToReply: async (postId, commentId, replyId, reaction) => {
        try {
             const res = await api.put(`/api/posts/${postId}/comment/${commentId}/reply/${replyId}/like`, { reaction });
             const updatedPost = res.data;
             
              set(state => ({
                posts: state.posts.map(p => p._id === postId ? updatedPost : p),
                videoPosts: state.videoPosts.map(p => p._id === postId ? updatedPost : p),
                userPosts: state.userPosts.map(p => p._id === postId ? updatedPost : p),
                savedPosts: state.savedPosts.map(p => p._id === postId ? updatedPost : p)
            }));
        } catch (error) {
            console.error(error);
            toast.error("Failed to react to reply");
        }
    },

    deletePost: async (postId) => {
        try {
            await api.delete(`/api/posts/${postId}`);
            
            set(state => ({
                posts: state.posts.filter(p => p._id !== postId),
                videoPosts: state.videoPosts.filter(p => p._id !== postId),
                userPosts: state.userPosts.filter(p => p._id !== postId),
                savedPosts: state.savedPosts.filter(p => p._id !== postId)
            }));
            toast.success("Post deleted");
        } catch (error) {
             console.error(error);
             toast.error(error.response?.data?.message || "Failed to delete post");
        }
    },

    fetchVideoFeed: async (isRefresh = false) => {
         const { videoNextCursor, hasMoreVideos, isLoading } = get();
         // If already loading, maybe debounce or ignore, but here simple check
         // We might want separate loading state for video feed if they can load purely independently without UI conflict
         
         if (!isRefresh && !hasMoreVideos) return;
         
        try {
            const cursor = isRefresh ? null : videoNextCursor;
            const query = cursor ? `?limit=5&cursor=${cursor}` : `?limit=5`;

            const res = await api.get(`/api/posts/videos${query}`);
            
            const { posts: newVideos, nextCursor } = res.data;

            set(state => {
                 // For refresh, replace. For load more, append.
                 const videos = isRefresh ? newVideos : [...state.videoPosts, ...newVideos];
                 
                 // Deduplicate if needed (though cursor should prevent it mostly)
                 // Keeping simple strictly cursor based now.
                return { 
                    videoPosts: videos,
                    videoNextCursor: nextCursor,
                    hasMoreVideos: !!nextCursor
                };
            });
            return newVideos;
        } catch (error) {
            console.error(error);
            toast.error("Failed to load videos");
            return [];
        }
    },

    getPostById: async (postId) => {
        // ... (existing code)
        try {
            const res = await api.get(`/api/posts/single/${postId}`);
            return res.data;
        } catch (error) {
            console.error(error);
            throw error;
        }
    },

    toggleSavePost: async (postId) => {
        try {
            const res = await api.post("/api/users/toggle-save", { postId });
            
            // We can locally update the savedPosts array if we have it loaded
            const currentSaved = get().savedPosts;
            const isAlreadySaved = currentSaved.some(p => p._id === postId);
            
            if (isAlreadySaved) {
                set({ savedPosts: currentSaved.filter(p => p._id !== postId) });
                 toast.success("Post unsaved");
            } else {
                toast.success("Post saved");
            }
            
            // Update AuthStore User object too, so UI relying on user.savedPosts updates immediately
             import("./useAuthStore.js").then(({ useAuthStore }) => {
                 const user = useAuthStore.getState().user;
                 if (user) {
                     let newSavedPosts = user.savedPosts || [];
                     // Check if it's already in the user's list (which might be just IDs or Objects)
                     const exists = newSavedPosts.some(id => (typeof id === 'string' ? id : id._id) === postId);
                     
                     if (exists) {
                         newSavedPosts = newSavedPosts.filter(id => (typeof id === 'string' ? id : id._id) !== postId);
                     } else {
                         newSavedPosts = [...newSavedPosts, postId];
                     }
                     useAuthStore.getState().updateUser({ savedPosts: newSavedPosts });
                 }
             });

            return res.data;
        } catch (error) {
             console.error(error);
             toast.error(error.response?.data?.message || "Failed to toggle save");
        }
    },

    fetchSavedPosts: async () => {
        set({ isLoading: true });
        try {
             // Note: Route depends on userRoute definition. userRoute is usually mounted at /api/users
             const res = await api.get("/api/users/saved-posts");
             set({ savedPosts: res.data });
        } catch (error) {
             console.error(error);
             toast.error(error.response?.data?.message || "Failed to fetch saved posts");
        } finally {
             set({ isLoading: false });
        }
    },
}));
