import React from 'react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/AntiPeep.module.scss';
import { useAuthStore } from '../../stores/useAuthStore';
import { useAntiPeep } from '../anti-peep/AntiPeepProvider';
import { 
    ScanFace, 
    Shield, 
    ChevronRight,
    RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import axios from '../../lib/axios';

const cx = classNames.bind(styles);

const AntiPeepSettings = () => {
    const { user, updateUser } = useAuthStore();
    const { setupCalibration, isModelsLoaded } = useAntiPeep();

    const isCalibrated = Boolean(
        user?.antiPeepData?.faceDescriptor && 
        Array.isArray(user.antiPeepData.faceDescriptor) && 
        user.antiPeepData.faceDescriptor.length > 0
    );
    const isEnabled = user?.antiPeepData?.isEnabled || false;

    const toggleEnable = async () => {
        if (!isCalibrated && !isEnabled) {
            toast.error("Vui lòng thiết lập Face ID trước khi bật bảo vệ.");
            setupCalibration();
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
            toast.success(newState ? "Đã bật bảo vệ chống nhìn trộm" : "Đã tắt bảo vệ chống nhìn trộm");
        } catch (error) {
            console.error(error);
            toast.error("Không thể cập nhật cài đặt");
        }
    };

    return (
        <div className={cx('anti-peep-container')}>
            {/* Header Section */}
            <div className={cx('header-section')}>
                <div className={cx('header-title-row')}>
                    <div className={cx('header-icon')}>
                        <ScanFace size={22} />
                    </div>
                    <h2>Face ID & Chống nhìn trộm</h2>
                </div>
                <p className={cx('header-subtitle')}>
                    Bảo vệ màn hình của bạn khi ở nơi công cộng. Hệ thống tự động làm mờ hoặc khóa màn hình khi phát hiện ánh nhìn lạ từ người khác.
                </p>
            </div>

            {/* Group 1: Automatic Protection */}
            <div className={cx('settings-group')}>
                <span className={cx('group-title')}>Tính năng bảo vệ</span>
                <div className={cx('group-box')}>
                    <div className={cx('group-row')}>
                        <div className={cx('row-info')}>
                            <span className={cx('row-label')}>Tự động khóa màn hình</span>
                            <span className={cx('row-desc')}>
                                Khóa màn hình tức thì khi có người lạ nhìn vào hoặc phát hiện từ hai người trở lên
                            </span>
                        </div>
                        <div className={cx('row-action')}>
                            <label className={cx('switch')}>
                                <input
                                    type="checkbox"
                                    checked={isEnabled}
                                    onChange={toggleEnable}
                                    disabled={!isModelsLoaded}
                                />
                                <span className={cx('slider')} />
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            {/* Group 2: Biometrics Face ID */}
            <div className={cx('settings-group')}>
                <span className={cx('group-title')}>Dữ liệu sinh trắc học</span>
                <div className={cx('group-box')}>
                    <div className={cx('group-row')}>
                        <div className={cx('row-info')}>
                            <span className={cx('row-label')}>Khuôn mặt Face ID</span>
                            <span className={cx('row-desc')}>
                                {isCalibrated 
                                    ? "Đã lưu trữ dữ liệu 68 điểm mốc khuôn mặt của bạn trên thiết bị" 
                                    : "Chưa có dữ liệu khuôn mặt. Thiết lập để bắt đầu sử dụng"}
                            </span>
                        </div>
                        <div className={cx('row-action')}>
                            <button
                                type="button"
                                className={cx('minimal-action-btn')}
                                onClick={setupCalibration}
                                disabled={!isModelsLoaded}
                            >
                                {isCalibrated ? (
                                    <>
                                        <RefreshCw size={14} />
                                        <span>Căn chỉnh lại</span>
                                    </>
                                ) : (
                                    <span>Thiết lập Face ID</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Privacy Note Footer */}
            <div className={cx('privacy-note')}>
                <Shield size={18} className={cx('note-icon')} />
                <p>
                    <strong>Bảo mật tuyệt đối:</strong> Toàn bộ dữ liệu Face ID được xử lý cục bộ ngay trên trình duyệt (On-Device AI). 
                    Không có bất kỳ hình ảnh hay video nào được gửi đi hoặc lưu trữ trên máy chủ.
                </p>
            </div>
        </div>
    );
};

export default AntiPeepSettings;
