import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import styles from '../assets/css/ForgotPasswordPage.module.scss';
import { Loader2, ArrowLeft, Key, Mail, Lock, Eye, EyeOff, Check, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

const ForgotPasswordPage = () => {
    const navigate = useNavigate();
    const { forgotPassword, verifyOtp, resetPassword, loading } = useAuthStore();

    // Flow State: 1 = Email, 2 = OTP, 3 = New Password
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(Array(6).fill(''));
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Resend OTP timer state
    const [resendTimer, setResendTimer] = useState(60);
    const [isResendDisabled, setIsResendDisabled] = useState(true);

    const otpInputRefs = useRef([]);

    // Live password checklist validation
    const passwordRequirements = {
        minLength: newPassword.length >= 6,
        hasNumber: /\d/.test(newPassword),
        hasLetter: /[a-zA-Z]/.test(newPassword),
    };

    // Calculate password strength
    const getPasswordStrength = () => {
        let score = 0;
        if (passwordRequirements.minLength) score += 1;
        if (passwordRequirements.hasNumber) score += 1;
        if (passwordRequirements.hasLetter) score += 1;
        if (newPassword.length >= 10 && /[A-Z]/.test(newPassword) && /[^A-Za-z0-9]/.test(newPassword)) score += 1;

        if (score === 0) return { text: 'Empty', class: '' };
        if (score <= 1) return { text: 'Weak', class: 'weak' };
        if (score === 2) return { text: 'Fair', class: 'fair' };
        if (score === 3) return { text: 'Good', class: 'good' };
        return { text: 'Strong', class: 'strong' };
    };

    const passwordStrength = getPasswordStrength();

    // Timer countdown effect for OTP Resend
    useEffect(() => {
        let interval = null;
        if (step === 2 && isResendDisabled) {
            interval = setInterval(() => {
                setResendTimer((prev) => {
                    if (prev <= 1) {
                        setIsResendDisabled(false);
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [step, isResendDisabled]);

    // Handle single OTP inputs
    const handleOtpChange = (value, index) => {
        // Only allow numbers
        if (isNaN(value)) return;

        const newOtp = [...otp];
        // Take only the last character entered
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);

        // Auto focus next input
        if (value && index < 5) {
            otpInputRefs.current[index + 1]?.focus();
        }
    };

    // Handle backspaces in OTP
    const handleOtpKeyDown = (e, index) => {
        if (e.key === 'Backspace') {
            if (!otp[index] && index > 0) {
                // Focus previous box and clear it
                const newOtp = [...otp];
                newOtp[index - 1] = '';
                setOtp(newOtp);
                otpInputRefs.current[index - 1]?.focus();
            } else {
                const newOtp = [...otp];
                newOtp[index] = '';
                setOtp(newOtp);
            }
        }
    };

    // Handle pasting in OTP fields
    const handleOtpPaste = (e) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').trim();
        if (/^\d{6}$/.test(pastedData)) {
            const digits = pastedData.split('');
            setOtp(digits);
            // Focus on the last input field
            otpInputRefs.current[5]?.focus();
        } else {
            toast.error('Please paste a valid 6-digit OTP.');
        }
    };

    // Submit Action for Phase 1: Send OTP
    const handleSendOtp = async (e) => {
        e.preventDefault();
        if (!email) {
            toast.error('Please enter a valid email.');
            return;
        }

        const res = await forgotPassword(email);
        if (res?.success) {
            setStep(2);
            setResendTimer(60);
            setIsResendDisabled(true);
        }
    };

    // Resend OTP Action
    const handleResendOtp = async () => {
        const res = await forgotPassword(email);
        if (res?.success) {
            setResendTimer(60);
            setIsResendDisabled(true);
            setOtp(Array(6).fill(''));
            otpInputRefs.current[0]?.focus();
        }
    };

    // Submit Action for Phase 2: Verify OTP
    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        const otpCode = otp.join('');
        if (otpCode.length < 6) {
            toast.error('Please enter the complete 6-digit OTP code.');
            return;
        }

        const res = await verifyOtp(email, otpCode);
        if (res?.success) {
            setStep(3);
        }
    };

    // Submit Action for Phase 3: Reset Password
    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (!passwordRequirements.minLength || !passwordRequirements.hasNumber || !passwordRequirements.hasLetter) {
            toast.error('Password does not meet the security requirements.');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('Passwords do not match.');
            return;
        }

        const otpCode = otp.join('');
        const res = await resetPassword(email, otpCode, newPassword);
        if (res?.success) {
            navigate('/signin');
        }
    };

    return (
        <div className={styles['page-wrapper']}>
            {/* Left Brand Section */}
            <div className={styles['hero-section']}>
                <img 
                    src="/shrimple_brand_hero_image.png" 
                    alt="Shrimple Life" 
                    className={styles['hero-image']}
                />
                <div className={styles.branding}>
                    <h1 className={styles['logo-text']}>Shrimple</h1>
                    <p className={styles.tagline}>Socializing made simple.</p>
                </div>
            </div>

            {/* Right Authentication Section */}
            <div className={styles['auth-section']}>
                <div className={styles['form-container']}>
                    {/* Header Details based on step */}
                    {step === 1 && (
                        <>
                            <h2 className={styles.title}>Forgot Password?</h2>
                            <p className={styles.subtitle}>Enter your email to receive a 6-digit verification code.</p>
                        </>
                    )}
                    {step === 2 && (
                        <>
                            <h2 className={styles.title}>Enter OTP Code</h2>
                            <p className={styles.subtitle}>A 6-digit code has been sent to <strong>{email}</strong>.</p>
                        </>
                    )}
                    {step === 3 && (
                        <>
                            <h2 className={styles.title}>Reset Password</h2>
                            <p className={styles.subtitle}>Create a strong, new secure password for your Shrimple account.</p>
                        </>
                    )}

                    {/* Progress Step Dot Indicators */}
                    <div className={styles['step-indicator']}>
                        <div className={`${styles['step-dot']} ${step >= 1 ? styles.active : ''}`}></div>
                        <div className={`${styles['step-dot']} ${step >= 2 ? styles.active : ''}`}></div>
                        <div className={`${styles['step-dot']} ${step >= 3 ? styles.active : ''}`}></div>
                    </div>

                    {/* Form Layout rendering based on active step */}
                    {step === 1 && (
                        <form onSubmit={handleSendOtp}>
                            <div className={styles['form-group']}>
                                <label>Email Address</label>
                                <div className={styles['input-wrapper']}>
                                    <input
                                        type="email"
                                        placeholder="name@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <button type="submit" className={styles['submit-btn']} disabled={loading}>
                                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                                    <>
                                        <span>Send Verification Code</span>
                                        <Mail size={18} />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleVerifyOtp}>
                            <div className={styles['form-group']}>
                                <label>6-Digit Code</label>
                                <div className={styles['otp-box-container']}>
                                    {otp.map((digit, idx) => (
                                        <input
                                            key={idx}
                                            type="text"
                                            ref={(el) => (otpInputRefs.current[idx] = el)}
                                            value={digit}
                                            onChange={(e) => handleOtpChange(e.target.value, idx)}
                                            onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                                            onPaste={handleOtpPaste}
                                            className={styles['otp-input']}
                                            maxLength={1}
                                            required
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className={styles['timer-container']}>
                                <div>
                                    {isResendDisabled ? (
                                        <span>Resend code in: <strong className={styles['timer-text']}>{resendTimer}s</strong></span>
                                    ) : (
                                        <span>Didn't receive code?</span>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={handleResendOtp}
                                    disabled={isResendDisabled || loading}
                                    className={styles['resend-btn']}
                                >
                                    Resend OTP
                                </button>
                            </div>

                            <button type="submit" className={styles['submit-btn']} disabled={loading}>
                                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                                    <>
                                        <span>Verify OTP Code</span>
                                        <Key size={18} />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {step === 3 && (
                        <form onSubmit={handleResetPassword}>
                            {/* New Password field */}
                            <div className={styles['form-group']}>
                                <label>New Password</label>
                                <div className={styles['input-wrapper']}>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className={styles['eye-btn']}
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            {/* Confirm Password field */}
                            <div className={styles['form-group']}>
                                <label>Confirm New Password</label>
                                <div className={styles['input-wrapper']}>
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className={styles['eye-btn']}
                                    >
                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            {/* Password strength checklist display */}
                            <div className={styles['strength-container']}>
                                <div className={styles['strength-bar']}>
                                    <div className={`${styles['strength-segment']} ${newPassword ? styles[passwordStrength.class] : ''}`}></div>
                                    <div className={`${styles['strength-segment']} ${newPassword && ['fair', 'good', 'strong'].includes(passwordStrength.class) ? styles[passwordStrength.class] : ''}`}></div>
                                    <div className={`${styles['strength-segment']} ${newPassword && ['good', 'strong'].includes(passwordStrength.class) ? styles[passwordStrength.class] : ''}`}></div>
                                    <div className={`${styles['strength-segment']} ${newPassword && passwordStrength.class === 'strong' ? styles[passwordStrength.class] : ''}`}></div>
                                </div>
                                <div className={styles['strength-text']}>
                                    <span>Password Security: <strong>{passwordStrength.text}</strong></span>
                                </div>
                                
                                <ul className={styles['requirement-list']}>
                                    <li className={`${styles['requirement-item']} ${passwordRequirements.minLength ? styles.met : ''}`}>
                                        <span className={styles.bullet}></span>
                                        <span>At least 6 characters</span>
                                    </li>
                                    <li className={`${styles['requirement-item']} ${passwordRequirements.hasNumber ? styles.met : ''}`}>
                                        <span className={styles.bullet}></span>
                                        <span>Contains at least one number</span>
                                    </li>
                                    <li className={`${styles['requirement-item']} ${passwordRequirements.hasLetter ? styles.met : ''}`}>
                                        <span className={styles.bullet}></span>
                                        <span>Contains at least one letter</span>
                                    </li>
                                </ul>
                            </div>

                            <button type="submit" className={styles['submit-btn']} disabled={loading}>
                                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                                    <>
                                        <span>Reset Password</span>
                                        <Lock size={18} />
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    {/* Step Controls / Back Option */}
                    <p className={styles['footer-text']}>
                        {step > 1 ? (
                            <button 
                                onClick={() => {
                                    setStep(step - 1);
                                    if (step === 2) setOtp(Array(6).fill(''));
                                    if (step === 3) {
                                        setNewPassword('');
                                        setConfirmPassword('');
                                    }
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto', fontSize: '1.5rem', fontWeight: 700 }}
                            >
                                <ArrowLeft size={16} />
                                Back to previous step
                            </button>
                        ) : (
                            <Link to="/signin" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
                                <ArrowLeft size={16} />
                                Back to Sign In
                            </Link>
                        )}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
