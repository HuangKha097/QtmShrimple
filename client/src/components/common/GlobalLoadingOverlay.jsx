import React from 'react';
import LoadingSpin from './loading/LoadingSpin';
import { useUIStore } from '../../stores/useUIStore';

const GlobalLoadingOverlay = () => {
    const { isGlobalLoading, isOffline } = useUIStore();

    if (!isGlobalLoading && !isOffline) return null;

    return (
        <div style={{
            position: 'absolute', // Changed from fixed to absolute
            inset: 0,
            zIndex: 99999,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            color: 'white',
            borderRadius: 'inherit' // Inherit border radius from parent
        }}>
            <LoadingSpin size={50} />
            {isOffline && <p style={{ marginTop: '1rem', fontSize: '1.2rem', fontWeight: 600 }}>No Internet Connection</p>}
        </div>
    );
};

export default GlobalLoadingOverlay;
