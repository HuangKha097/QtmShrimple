import React, { useState } from 'react';
import styles from '../assets/css/SignUpPage.module.scss';
import { useAuthStore } from '../stores/useAuthStore';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import GoogleOtpDialog from '../components/auth/GoogleOtpDialog';

const SignUpPage = () => {
    const navigate = useNavigate();
    const { signUp, googleLogin, loading } = useAuthStore();
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [googleVerification, setGoogleVerification] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const validateForm = () => {
        if (!formData.fullName.trim()) return toast.error('Full name is required');
        if (!formData.email.trim()) return toast.error('Email is required');
        if (!/\S+@\S+\.\S+/.test(formData.email)) return toast.error('Invalid email format');
        if (formData.password.length < 6) return toast.error('Password must be at least 6 characters');
        if (formData.password !== formData.confirmPassword) return toast.error('Passwords do not match');
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const isValid = validateForm();
        if (isValid !== true) return;

        try {
            const result = await signUp({
                fullName: formData.fullName,
                email: formData.email,
                password: formData.password
            });
            if (result.success) {
                toast.success('Account created!');
                navigate('/complete-profile');
            }
        } catch {
            // Handled in store
        }
    };

    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            const result = await googleLogin(credentialResponse.credential);
            if (result.success) {
                if (result.requiresOtp) {
                    setGoogleVerification({ pendingToken: result.pendingToken, email: result.email });
                    return;
                }
                const user = useAuthStore.getState().user;
                if (user?.isProfileComplete) {
                    navigate('/');
                } else {
                    navigate('/complete-profile');
                }
            }
        } catch {
            toast.error('Google signup failed');
        }
    };

    return (
        <div className={styles['page-wrapper']}>
            <GoogleOtpDialog
                open={Boolean(googleVerification)}
                email={googleVerification?.email || ''}
                pendingToken={googleVerification?.pendingToken || ''}
                onCancel={() => setGoogleVerification(null)}
                onVerified={() => {
                    setGoogleVerification(null);
                    navigate('/complete-profile');
                }}
            />
            {/* Left Section: Static Brand Image */}
            <div className={styles['hero-section']}>
                <img 
                    src="/shrimple_brand_hero_image.png" 
                    alt="Shrimple Life" 
                    className={styles['hero-image']}
                />
                <div className={styles.branding}>
                    <h1 className={styles['logo-text']}>Shrimple</h1>
                    <p className={styles.tagline}>The simple way to connect.</p>
                </div>
            </div>

            {/* Right Section: Auth Form */}
            <div className={styles['auth-section']}>
                <div className={styles['form-container']}>
                    <h2 className={styles.title}>Join Us</h2>
                    <p className={styles.subtitle}>Create an account to get started.</p>

                    <form onSubmit={handleSubmit}>
                        <div className={styles['form-group']}>
                            <label htmlFor="signup-full-name">Full Name</label>
                            <div className={styles['input-wrapper']}>
                                <input
                                    type="text"
                                    id="signup-full-name"
                                    name="fullName"
                                    autoComplete="name"
                                    placeholder="John Doe"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles['form-group']}>
                            <label htmlFor="signup-email">Email Address</label>
                            <div className={styles['input-wrapper']}>
                                <input
                                    type="email"
                                    id="signup-email"
                                    name="email"
                                    autoComplete="email"
                                    placeholder="name@example.com"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <div className={styles['form-group']}>
                            <label htmlFor="signup-password">Password</label>
                            <div className={styles['input-wrapper']}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="signup-password"
                                    name="password"
                                    autoComplete="new-password"
                                    placeholder="At least 6 characters"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                />
                                <button 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className={styles['eye-btn']}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div className={styles['form-group']}>
                            <label htmlFor="signup-confirm-password">Confirm Password</label>
                            <div className={styles['input-wrapper']}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="signup-confirm-password"
                                    name="confirmPassword"
                                    autoComplete="new-password"
                                    placeholder="Repeat your password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className={styles['submit-btn']} disabled={loading}>
                            {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Create Account'}
                        </button>
                    </form>

                    <div className={styles.divider}>
                        <span>or join with</span>
                    </div>

                    <div className={styles['social-actions']}>
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => toast.error('Google Signup Failed')}
                            theme="filled_black"
                            shape="pill"
                            width="350"
                        />
                    </div>

                    <p className={styles['footer-text']}>
                        Already have an account? 
                        <Link to="/signin">Sign In</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SignUpPage;
