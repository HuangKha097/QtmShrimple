import React from 'react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/SettingContainer.module.scss';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAntiPeep } from '../anti-peep/AntiPeepProvider';
import { Shield, ShieldAlert, ScanFace, Lock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import axios from '../../lib/axios';

const cx = classNames.bind(styles);

const AntiPeepSettings = () => {
    const { user, updateUser } = useAuthStore();
    const { setupCalibration, isModelsLoaded } = useAntiPeep();

    const isCalibrated = user?.antiPeepData?.faceDescriptor && user.antiPeepData.faceDescriptor.length > 0;
    const isEnabled = user?.antiPeepData?.isEnabled || false;

    const toggleEnable = async () => {
        if (!isCalibrated && !isEnabled) {
            toast.error("Please calibrate your face first before enabling.");
            return;
        }

        try {
            const newState = !isEnabled;
            await axios.put('/api/users/anti-peep', {
                isEnabled: newState
            });

            updateUser({
                antiPeepData: {
                    ...user.antiPeepData,
                    isEnabled: newState
                }
            });
            toast.success(`Anti-peeping ${newState ? 'enabled' : 'disabled'}`);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update settings");
        }
    };

    return (
        <div className={cx('content-wrapper')}>
            <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Shield size={24} color="var(--primary-color)" />
                Privacy & Security (Beta)
            </h2>

            <div className={cx('section')}>
                <h3>Anti-Peeping Protection</h3>
                <p style={{ opacity: 0.7, marginBottom: '1rem', fontSize: '1.2rem', lineHeight: '1.6' }}>
                    Protect your privacy by locking the screen when an unknown person looks at your screen or when multiple people are detected.
                </p>

                <div className={cx('setting-item')}>
                    <div className={cx('info')}>
                        <span className={cx('label')}>Enable Protection</span>
                        <span className={cx('desc')}>Automatically blur screen when intruders are detected</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {!isModelsLoaded && <span style={{ fontSize: '1.2rem', color: 'orange' }}>Loading AI...</span>}
                        {isModelsLoaded && !isCalibrated && <span style={{ fontSize: '1.2rem', color: 'red' }}>Setup Required</span>}

                        <label className={cx('switch')}>
                            <input
                                type="checkbox"
                                checked={isEnabled}
                                onChange={toggleEnable}
                                disabled={!isModelsLoaded || (!isEnabled && !isCalibrated)}
                            />
                            <span className={cx('slider')}></span>
                        </label>
                    </div>
                </div>

                <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--primary-blockBackgroundColor)', borderRadius: '0.5rem', border: '1px solid var(--primary-borderColor)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <div>
                            <h4 style={{ marginBottom: '0.2rem' }}>Face Calibration</h4>
                            <span style={{ fontSize: '1.2rem', color: isCalibrated ? '#4caf50' : '#ff9800' }}>
                                {isCalibrated ? "Calibrated" : "Not Calibrated"}
                            </span>
                        </div>
                        <ScanFace size={24} color={isCalibrated ? '#4caf50' : '#ff9800'} />
                    </div>

                    {!isModelsLoaded && <p style={{ color: 'orange', fontSize: '0.9rem' }}>Loading AI Models...</p>}

                    <button
                        onClick={setupCalibration}
                        disabled={!isModelsLoaded}
                        style={{
                            width: '100%',
                            padding: '0.8rem',
                            backgroundColor: 'var(--primary-color)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.5rem',
                            cursor: isModelsLoaded ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            opacity: isModelsLoaded ? 1 : 0.6
                        }}
                    >
                        {isCalibrated ? <RefreshCw size={18} /> : <ScanFace size={18} />}
                        {isCalibrated ? "Recalibrate Face & PIN" : "Setup Face ID & PIN"}
                    </button>
                </div>
            </div>
            <span style={{ color: '#ff9800', fontSize: '1.2rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>Anti-peeping is a beta feature  can make mistakes !</span>
            <div className={cx('section')}>
                <h3>How it works</h3>
                <ul style={{ listStyle: 'disc', paddingLeft: '1.2rem', opacity: 0.8, lineHeight: '1.6' }}>
                    <li>We use your camera to detect faces locally. No video is sent to the server.</li>
                    <li>If more than 1 person is seen, the screen locks.</li>
                    <li>If a face doesn't match yours, the screen locks.</li>
                    <li>Use your 4-digit PIN to unlock.</li>
                </ul>
            </div>
        </div>
    );
};

export default AntiPeepSettings;
