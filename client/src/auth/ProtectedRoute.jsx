import React, {useEffect, useState} from 'react';
import {useAuthStore} from "../stores/useAuthStore.js";
import {Navigate, Outlet} from "react-router";

import {IndeterminateLoader} from "../components/common/loading/Loading.jsx"

const ProtectedRoute = () => {
    const {accessToken, user, loading, refresh, fetchMe, connectSocket} = useAuthStore()
    const [starting, setStarting] = useState(true);

    const init = async () => {
        if (!accessToken) {
            await refresh()
        }
        if (accessToken && !user) {
            await fetchMe();
        } else if (user) {
            connectSocket();
        }

        setStarting(false);
    }

    useEffect(() => {
        init()
    }, [])
    if (starting || loading) {
        return <div style={{
            width: '100vw',
            height: '100vh',
            background: 'var(--primary-backgroundColor)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: "center",
            alignItems: "center",
            gap: '30px'
        }}>
            <h3 style={{color: 'var(--primary-color)', fontSize: '2rem', fontWeight: '600'}}>
                Loading
            </h3>
            <IndeterminateLoader/>
        </div>
    }
    if (!accessToken) {
        return <Navigate to="/signin" replace={true}/>
    }
    
    if (user && !user.isProfileComplete && window.location.pathname !== "/complete-profile") {
        return <Navigate to="/complete-profile" replace={true}/>
    }

    return (
        <Outlet></Outlet>
    );
};

export default ProtectedRoute;