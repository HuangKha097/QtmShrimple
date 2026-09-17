import { useEffect, useRef, useState } from "react";
import { Loader2, MailCheck, X } from "lucide-react";
import MotionPresence from "../common/MotionPresence";
import { useAuthStore } from "../../stores/useAuthStore";
import styles from "../../assets/css/GoogleOtpDialog.module.scss";

const CODE_LENGTH = 6;

const GoogleOtpDialog = ({ open, email, pendingToken, onVerified, onCancel }) => {
    const verifyGoogleOtp = useAuthStore((state) => state.verifyGoogleOtp);
    const resendGoogleOtp = useAuthStore((state) => state.resendGoogleOtp);
    const loading = useAuthStore((state) => state.loading);
    const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(""));
    const [resendIn, setResendIn] = useState(45);
    const inputRefs = useRef([]);

    useEffect(() => {
        if (!open) return;
        setDigits(Array(CODE_LENGTH).fill(""));
        setResendIn(45);
        const focusTimer = window.setTimeout(() => inputRefs.current[0]?.focus(), 250);
        return () => window.clearTimeout(focusTimer);
    }, [open, pendingToken]);

    useEffect(() => {
        if (!open || resendIn <= 0) return;
        const timer = window.setTimeout(() => setResendIn((value) => value - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [open, resendIn]);

    const fillCode = (value, startIndex = 0) => {
        const numbers = value.replace(/\D/g, "").slice(0, CODE_LENGTH);
        if (!numbers) return;
        setDigits((current) => {
            const next = [...current];
            [...numbers].forEach((number, offset) => {
                if (startIndex + offset < CODE_LENGTH) next[startIndex + offset] = number;
            });
            return next;
        });
        inputRefs.current[Math.min(startIndex + numbers.length, CODE_LENGTH - 1)]?.focus();
    };

    const handleChange = (index, event) => {
        const value = event.target.value;
        if (value.length > 1) {
            fillCode(value, index);
            return;
        }
        if (value && !/^\d$/.test(value)) return;
        setDigits((current) => current.map((digit, position) => position === index ? value : digit));
        if (value && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    };

    const handleKeyDown = (index, event) => {
        if (event.key === "Backspace" && !digits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        if (event.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
        if (event.key === "ArrowRight" && index < CODE_LENGTH - 1) inputRefs.current[index + 1]?.focus();
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const code = digits.join("");
        if (code.length !== CODE_LENGTH) {
            inputRefs.current[digits.findIndex((digit) => !digit)]?.focus();
            return;
        }
        const result = await verifyGoogleOtp(pendingToken, code);
        if (result.success) onVerified(result.user);
    };

    const handleResend = async () => {
        if (resendIn > 0) return;
        const result = await resendGoogleOtp(pendingToken);
        if (result.success) {
            setDigits(Array(CODE_LENGTH).fill(""));
            setResendIn(45);
            inputRefs.current[0]?.focus();
        }
    };

    return (
        <MotionPresence open={open} className={styles.overlay} role="presentation">
            <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="google-otp-title">
                <button className={styles.closeButton} type="button" onClick={onCancel} aria-label="Cancel verification">
                    <X size={20} />
                </button>
                <div className={styles.icon} aria-hidden="true"><MailCheck size={28} /></div>
                <p className={styles.eyebrow}>One quick check</p>
                <h2 id="google-otp-title">Verify your email</h2>
                <p className={styles.description}>
                    We sent a six-digit code to <strong>{email}</strong>. Enter it below before creating your account.
                </p>
                <form onSubmit={handleSubmit}>
                    <div className={styles.codeRow} onPaste={(event) => {
                        event.preventDefault();
                        fillCode(event.clipboardData.getData("text"));
                    }}>
                        {digits.map((digit, index) => (
                            <input
                                key={index}
                                ref={(node) => { inputRefs.current[index] = node; }}
                                value={digit}
                                onChange={(event) => handleChange(index, event)}
                                onKeyDown={(event) => handleKeyDown(index, event)}
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
                <button
                    type="button"
                    className={styles.resendButton}
                    onClick={handleResend}
                    disabled={resendIn > 0}
                >
                    {resendIn > 0 ? `Send another code in ${resendIn}s` : "Send another code"}
                </button>
            </section>
        </MotionPresence>
    );
};

export default GoogleOtpDialog;
