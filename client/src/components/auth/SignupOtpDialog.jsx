import { useEffect, useRef, useState } from "react";
import { Loader2, MailCheck, X } from "lucide-react";
import MotionPresence from "../common/MotionPresence";
import { useAuthStore } from "../../stores/useAuthStore";
import styles from "../../assets/css/GoogleOtpDialog.module.scss";

const SignupOtpDialog = ({ open, email, pendingToken, onVerified, onCancel }) => {
    const verifyEmailSignupOtp = useAuthStore((state) => state.verifyEmailSignupOtp);
    const resendEmailSignupOtp = useAuthStore((state) => state.resendEmailSignupOtp);
    const loading = useAuthStore((state) => state.loading);
    const [digits, setDigits] = useState(Array(6).fill(""));
    const [resendIn, setResendIn] = useState(45);
    const inputRefs = useRef([]);

    useEffect(() => {
        if (!open) return;
        setDigits(Array(6).fill(""));
        setResendIn(45);
        const timer = window.setTimeout(() => inputRefs.current[0]?.focus(), 250);
        return () => window.clearTimeout(timer);
    }, [open, pendingToken]);

    useEffect(() => {
        if (!open || resendIn <= 0) return;
        const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [open, resendIn]);

    const fillCode = (value, start = 0) => {
        const numbers = value.replace(/\D/g, "").slice(0, 6);
        setDigits((current) => {
            const next = [...current];
            [...numbers].forEach((number, offset) => {
                if (start + offset < 6) next[start + offset] = number;
            });
            return next;
        });
        inputRefs.current[Math.min(start + numbers.length, 5)]?.focus();
    };

    const submit = async (event) => {
        event.preventDefault();
        const result = await verifyEmailSignupOtp(pendingToken, digits.join(""));
        if (result.success) onVerified(result.user);
    };

    const resend = async () => {
        if (resendIn > 0) return;
        const result = await resendEmailSignupOtp(pendingToken);
        if (result.success) {
            setDigits(Array(6).fill(""));
            setResendIn(45);
            inputRefs.current[0]?.focus();
        }
    };

    return (
        <MotionPresence open={open} className={styles.overlay}>
            <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="signup-otp-title">
                <button className={styles.closeButton} type="button" onClick={onCancel} aria-label="Cancel verification"><X size={20} /></button>
                <div className={styles.icon} aria-hidden="true"><MailCheck size={28} /></div>
                <p className={styles.eyebrow}>One quick check</p>
                <h2 id="signup-otp-title">Verify your email</h2>
                <p className={styles.description}>We sent a six-digit code to <strong>{email}</strong>. Enter it before creating your account.</p>
                <form onSubmit={submit}>
                    <div className={styles.codeRow} onPaste={(event) => { event.preventDefault(); fillCode(event.clipboardData.getData("text")); }}>
                        {digits.map((digit, index) => (
                            <input
                                key={index}
                                ref={(node) => { inputRefs.current[index] = node; }}
                                value={digit}
                                onChange={(event) => {
                                    if (event.target.value.length > 1) return fillCode(event.target.value, index);
                                    if (event.target.value && !/^\d$/.test(event.target.value)) return;
                                    setDigits((current) => current.map((item, position) => position === index ? event.target.value : item));
                                    if (event.target.value && index < 5) inputRefs.current[index + 1]?.focus();
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === "Backspace" && !digits[index] && index > 0) inputRefs.current[index - 1]?.focus();
                                }}
                                inputMode="numeric"
                                autoComplete={index === 0 ? "one-time-code" : "off"}
                                maxLength={1}
                                aria-label={`Verification digit ${index + 1}`}
                            />
                        ))}
                    </div>
                    <button className={styles.verifyButton} type="submit" disabled={loading || digits.some((digit) => !digit)}>
                        {loading ? <Loader2 className={styles.spinner} size={19} /> : "Verify and continue"}
                    </button>
                </form>
                <button type="button" className={styles.resendButton} onClick={resend} disabled={resendIn > 0}>
                    {resendIn > 0 ? `Send another code in ${resendIn}s` : "Send another code"}
                </button>
            </section>
        </MotionPresence>
    );
};

export default SignupOtpDialog;
