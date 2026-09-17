import React, { useState } from 'react';
import styles from '../assets/css/SignInPage.module.scss';
import { useAuthStore } from '../stores/useAuthStore';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import GoogleOtpDialog from '../components/auth/GoogleOtpDialog';

const SignInPage = () => {
    const navigate = useNavigate();
    const { signIn, googleLogin, loading } = useAuthStore();
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [googleVerification, setGoogleVerification] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const result = await signIn(formData.email, formData.password);
            if (result.success) {
                const user = useAuthStore.getState().user;
                if (user?.isProfileComplete) {
                    navigate('/');
                } else {
                    navigate('/complete-profile');
                }
            }
        } catch {
            // Error handled in store
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
            toast.error('Google login failed');
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
                    <p className={styles.tagline}>Socializing made simple.</p>
                </div>
            </div>

            {/* Right Section: Auth Form */}
            <div className={styles['auth-section']}>
                <div className={styles['form-container']}>
                    <h2 className={styles.title}>Sign In</h2>
                    <p className={styles.subtitle}>Welcome back to the community.</p>

                    <form onSubmit={handleSubmit}>
                        <div className={styles['form-group']}>
                            <label htmlFor="signin-email">Email Address</label>
                            <div className={styles['input-wrapper']}>
                                <input
                                    type="email"
                                    id="signin-email"
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
                            <label htmlFor="signin-password">Password</label>
                            <div className={styles['input-wrapper']}>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="signin-password"
                                    name="password"
                                    autoComplete="current-password"
                                    placeholder="••••••••"
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

                        <div className={styles.actions}>
                            <label className={styles['checkbox-container']}>
                                <input 
                                    type="checkbox" 
                                    checked={rememberMe}
                                    onChange={() => setRememberMe(!rememberMe)}
                                />
                                <div className={`${styles['custom-checkbox']} ${rememberMe ? styles.checked : ''}`}></div>
                                Remember me
                            </label>
                            <Link to="/forgot-password" className={styles['forgot-password']}>Forgot password?</Link>
                        </div>

                        <button type="submit" className={styles['submit-btn']} disabled={loading}>
                            {loading ? <Loader2 className="animate-spin mx-auto" /> : 'Sign In'}
                        </button>
                    </form>

                    <div className={styles.divider}>
                        <span>or continue with</span>
                    </div>

                    <div className={styles['social-actions']}>
                        <GoogleLogin
                            onSuccess={handleGoogleSuccess}
                            onError={() => toast.error('Google Login Failed')}
                            theme="filled_black"
                            shape="pill"
                            width="350"
                        />
                    </div>

                    <p className={styles['footer-text']}>
                        Don't have an account? 
                        <Link to="/signup">Sign Up</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default SignInPage;
