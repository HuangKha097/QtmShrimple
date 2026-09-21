import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import SignInPage from "./pages/SignInPage.jsx";
import SignUpPage from "./pages/SignUpPage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ChatPage from "./pages/ChatPage.jsx";
import { Toaster } from "sonner";
import ProtectedRoute from "./auth/ProtectedRoute.jsx";
import { useThemeStore } from "./stores/useThemeStore.js";
import PostsContainer from "./components/posts/PostsContainer.jsx";
import SearchResultsContainer from "./components/posts/SearchResultsContainer.jsx";
import ChatContainer from "./components/chat/ChatContainer.jsx";
import { useOutletContext } from "react-router-dom";
import SinglePostPage from "./pages/SinglePostPage.jsx";
import SavedPostsContainer from "./components/posts/SavedPostsContainer.jsx";
import FriendsContainer from "./components/posts/FriendsContainer.jsx";
import ProfileContainer from "./components/posts/ProfileContainer.jsx";
import VideoFeed from "./pages/VideoFeed.jsx";
import CompleteProfile from "./pages/CompleteProfile.jsx";

import CallModal from "./components/chat/CallModal.jsx";
import { useCallStore } from "./stores/useCallStore.js";
import { useAuthStore } from "./stores/useAuthStore.js";
import { useUIStore } from "./stores/useUIStore.js";
// import LoadingSpin from "./components/common/loading/LoadingSpin.jsx"; // Removed from here


import { AntiPeepProvider } from "./components/anti-peep/AntiPeepProvider.jsx";


// Wrapper to consume outlet context and pass it to ChatContainer
const ChatContainerWrapper = () => {
    const context = useOutletContext();
    return <ChatContainer {...context} />;
};

const App = () => {
    const { isLight } = useThemeStore();
    const { subscribeToCallEvents, unsubscribeFromCallEvents } = useCallStore();

    const { user, socket } = useAuthStore(); // Check if user and socket are ready to subscribe
    const { setOffline } = useUIStore();

    // Subscribe to call events
    useEffect(() => {
        if (socket && user) {
            subscribeToCallEvents();
        }
        return () => {
            unsubscribeFromCallEvents();
        };
    }, [socket, user, subscribeToCallEvents, unsubscribeFromCallEvents]);

    useEffect(() => {
        const handleOnline = () => setOffline(false);
        const handleOffline = () => setOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [setOffline]);

    return (
        <AntiPeepProvider>
            <Toaster 
                theme={isLight ? "light" : "dark"} 
                position="bottom-center"
                toastOptions={{
                    duration: 2600,
                }}
            />

            <CallModal />

            <BrowserRouter>
                <Routes>
                    {/* Public routes */}
                    <Route path="/signin" element={<SignInPage />} />
                    <Route path="/signup" element={<SignUpPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />


                    <Route element={<ProtectedRoute />}>
                        <Route path="/complete-profile" element={<CompleteProfile />} />
                        <Route path="/post/:postId" element={<SinglePostPage />} />
                        <Route element={<ChatPage />}>
                            <Route path="/" element={<Navigate to="/chat" replace />} />
                            <Route path="/chat" element={<ChatContainerWrapper />} />
                            <Route path="/feed" element={<PostsContainer />} />
                            <Route path="/feed/search" element={<SearchResultsContainer />} />
                            <Route path="/feed/saved" element={<SavedPostsContainer />} />
                            <Route path="/feed/friends" element={<FriendsContainer />} />
                            <Route path="/feed/profile/:userId" element={<ProfileContainer />} />
                            <Route path="/video" element={<VideoFeed />} />
                        </Route>
                    </Route>
                </Routes>
            </BrowserRouter>
        </AntiPeepProvider>
    );
};

export default App;
