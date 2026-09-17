import { useEffect, useLayoutEffect, useRef, useState } from "react";
import classNames from "classnames/bind";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";
import { gsap } from "gsap";
import {
    ArrowLeft, ArrowRight, Camera, Check, Compass, Loader2,
    LocateFixed, MapPin, Sparkles, UserRound, UsersRound
} from "lucide-react";
import { toast } from "sonner";
import styles from "../assets/css/CompleteProfile.module.scss";
import { useAuthStore } from "../stores/useAuthStore";
import { useChatStore } from "../stores/useChatStore";
import { ASSET_BASE_URL } from "../config/env";

const cx = classNames.bind(styles);
const steps = [
    { title: "About you", caption: "The essentials", icon: UserRound, optional: false },
    { title: "Your photo", caption: "Make it yours", icon: Camera, optional: true },
    { title: "Your area", caption: "Find people nearby", icon: MapPin, optional: true },
    { title: "Find friends", caption: "Start your circle", icon: UsersRound, optional: true },
];

const profileSchema = z.object({
    displayName: z.string().trim().min(2, "Enter at least 2 characters").max(100),
    birthday: z.string()
        .min(1, "Choose your birthday")
        .refine((value) => {
            const date = new Date(value);
            return !Number.isNaN(date.getTime()) && date <= new Date();
        }, "Choose a valid birthday"),
    username: z.string()
        .trim()
        .min(3, "Use at least 3 characters")
        .max(20, "Use at most 20 characters")
        .regex(/^[a-zA-Z0-9_]+$/, "Use only letters, numbers and underscores"),
    gender: z.enum(["male", "female", "other"]),
});

const avatarSource = (value) => {
    if (!value) return "";
    return value.startsWith("http") || value.startsWith("blob:") ? value : `${ASSET_BASE_URL}${value}`;
};

const CompleteProfile = () => {
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);
    const completeProfile = useAuthStore((state) => state.completeProfile);
    const updateProfile = useAuthStore((state) => state.updateProfile);
    const loading = useAuthStore((state) => state.loading);
    const suggestedFriends = useChatStore((state) => state.suggestedFriends);
    const fetchSuggestedFriends = useChatStore((state) => state.fetchSuggestedFriends);
    const sendRequestAction = useChatStore((state) => state.sendRequestAction);
    const [step, setStep] = useState(user?.isProfileComplete ? 1 : 0);
    const [avatarFile, setAvatarFile] = useState(null);
    const [avatarPreview, setAvatarPreview] = useState(avatarSource(user?.avatarURL));
    const [location, setLocation] = useState({
        city: user?.location?.city || "",
        country: user?.location?.country || "",
        latitude: user?.location?.latitude,
        longitude: user?.location?.longitude,
    });
    const [locating, setLocating] = useState(false);
    const [sentRequests, setSentRequests] = useState(() => new Set());
    const [isSuccess, setIsSuccess] = useState(false);
    const sceneRef = useRef(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            displayName: user?.displayName || "",
            birthday: user?.birthday ? new Date(user.birthday).toISOString().split("T")[0] : "",
            username: user?.username || "",
            gender: user?.gender || "other",
        },
    });

    useLayoutEffect(() => {
        const media = gsap.matchMedia();
        media.add({ reduce: "(prefers-reduced-motion: reduce)", move: "(prefers-reduced-motion: no-preference)" }, (context) => {
            if (context.conditions.reduce || !sceneRef.current) return;
            gsap.fromTo(sceneRef.current, { opacity: 0, x: 28, scale: .985 }, {
                opacity: 1, x: 0, scale: 1, duration: .38, ease: "power3.out", clearProps: "transform,opacity"
            });
        });
        return () => media.revert();
    }, [step]);

    useEffect(() => {
        if (step === 3) fetchSuggestedFriends();
    }, [step, fetchSuggestedFriends]);

    useEffect(() => () => {
        if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
    }, [avatarPreview]);

    const goToStep = (nextStep) => setStep(Math.max(0, Math.min(steps.length - 1, nextStep)));

    const saveBasics = async (data) => {
        if (user?.isProfileComplete) {
            goToStep(1);
            return;
        }
        const result = await completeProfile(data);
        if (result.success) goToStep(1);
    };

    const chooseAvatar = (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            toast.error("Choose an image file.");
            return;
        }
        if (file.size > 8 * 1024 * 1024) {
            toast.error("Choose an image smaller than 8 MB.");
            return;
        }
        if (avatarPreview?.startsWith("blob:")) URL.revokeObjectURL(avatarPreview);
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    };

    const saveAvatar = async () => {
        if (avatarFile) {
            const data = new FormData();
            data.append("avatar", avatarFile);
            const result = await updateProfile(data);
            if (!result.success) return;
        }
        goToStep(2);
    };

    const useCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Location is not supported by this browser.");
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                setLocation((current) => ({
                    ...current,
                    latitude: Number(coords.latitude.toFixed(6)),
                    longitude: Number(coords.longitude.toFixed(6)),
                }));
                setLocating(false);
                toast.success("Current location added.");
            },
            () => {
                setLocating(false);
                toast.error("We could not access your location. You can enter a city or skip.");
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
        );
    };

    const saveLocation = async () => {
        const hasLocation = location.city.trim() || location.country.trim()
            || location.latitude !== undefined || location.longitude !== undefined;
        if (hasLocation) {
            const data = new FormData();
            data.append("location", JSON.stringify(location));
            const result = await updateProfile(data);
            if (!result.success) return;
        }
        goToStep(3);
    };

    const sendFriendRequest = async (friendId) => {
        try {
            await sendRequestAction(friendId);
            setSentRequests((current) => new Set([...current, friendId]));
            toast.success("Friend request sent.");
        } catch (error) {
            toast.error(error.response?.data?.message || "Could not send friend request.");
        }
    };

    const finishOnboarding = () => {
        setIsSuccess(true);
        window.setTimeout(() => navigate("/feed"), 900);
    };

    const StepIcon = steps[step].icon;

    return (
        <main className={cx("page-wrapper")}>
            {isSuccess && (
                <div className={cx("success-overlay")} role="status">
                    <div className={cx("success-icon")}><Check size={36} /></div>
                    <h2>You're ready</h2>
                    <p>Opening your Shrimple feed…</p>
                </div>
            )}

            <aside className={cx("journey-panel")}>
                <div>
                    <p className={cx("brand")}>Shrimple</p>
                    <h1>Make this space feel like yours.</h1>
                    <p className={cx("journey-copy")}>A few small choices help us shape a friendlier first experience.</p>
                </div>
                <ol className={cx("step-list")}>
                    {steps.map((item, index) => {
                        const Icon = item.icon;
                        return (
                            <li key={item.title} className={cx({ active: step === index, done: step > index })}>
                                <span className={cx("step-icon")}>{step > index ? <Check size={18} /> : <Icon size={18} />}</span>
                                <span><strong>{item.title}</strong><small>{item.caption}</small></span>
                            </li>
                        );
                    })}
                </ol>
                <p className={cx("privacy-note")}>You control what you share. Optional details can be skipped and changed later.</p>
            </aside>

            <section className={cx("content-panel")}>
                <div className={cx("mobile-progress")}>
                    <span>Step {step + 1} of {steps.length}</span>
                    <div><i style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
                </div>

                <div ref={sceneRef} className={cx("step-card")}>
                    <div className={cx("step-heading")}>
                        <span className={cx("heading-icon")}><StepIcon size={24} /></span>
                        <div>
                            <p>{steps[step].optional ? "Optional step" : "Required details"}</p>
                            <h2>{steps[step].title}</h2>
                        </div>
                    </div>

                    {step === 0 && (
                        <form className={cx("form")} onSubmit={handleSubmit(saveBasics)}>
                            <p className={cx("intro")}>Choose how people will recognize you. Your birthday stays private unless you change that later.</p>
                            <label htmlFor="profile-display-name">
                                <span>Name</span>
                                <input id="profile-display-name" {...register("displayName")} placeholder="How should we call you?" autoComplete="name" />
                                {errors.displayName && <small className={cx("error")}>{errors.displayName.message}</small>}
                            </label>
                            <div className={cx("two-columns")}>
                                <label htmlFor="profile-birthday">
                                    <span>Birthday</span>
                                    <input id="profile-birthday" {...register("birthday")} type="date" />
                                    {errors.birthday && <small className={cx("error")}>{errors.birthday.message}</small>}
                                </label>
                                <label htmlFor="profile-username">
                                    <span>Username</span>
                                    <div className={cx("username-input")}><b aria-hidden="true">@</b><input id="profile-username" {...register("username")} aria-label="Username" placeholder="your_handle" autoCapitalize="none" /></div>
                                    {errors.username && <small className={cx("error")}>{errors.username.message}</small>}
                                </label>
                            </div>
                            <label htmlFor="profile-gender">
                                <span>Gender <em>optional</em></span>
                                <select id="profile-gender" {...register("gender")}>
                                    <option value="other">Prefer not to say</option>
                                    <option value="female">Female</option>
                                    <option value="male">Male</option>
                                </select>
                            </label>
                            <div className={cx("actions", "end")}>
                                <button className={cx("primary-button")} type="submit" disabled={isSubmitting || loading}>
                                    {isSubmitting || loading ? <Loader2 className={cx("spinner")} size={18} /> : <>Continue <ArrowRight size={18} /></>}
                                </button>
                            </div>
                        </form>
                    )}

                    {step === 1 && (
                        <div className={cx("optional-content")}>
                            <p className={cx("intro")}>A clear photo makes it easier for friends to find you.</p>
                            <div className={cx("avatar-picker")}>
                                <div className={cx("avatar-preview")}>
                                    {avatarPreview ? <img src={avatarPreview} alt="Avatar preview" /> : <UserRound size={46} />}
                                </div>
                                <div>
                                    <label className={cx("upload-button")}>
                                        <Camera size={18} /> Choose a photo
                                        <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={chooseAvatar} />
                                    </label>
                                    <small>JPG, PNG, WebP or GIF · up to 8 MB</small>
                                </div>
                            </div>
                            <div className={cx("actions")}>
                                <button className={cx("back-button")} type="button" onClick={() => goToStep(0)}><ArrowLeft size={18} /> Back</button>
                                <div>
                                    <button className={cx("skip-button")} type="button" onClick={() => goToStep(2)}>Skip</button>
                                    <button className={cx("primary-button")} type="button" onClick={saveAvatar} disabled={loading}>
                                        {loading ? <Loader2 className={cx("spinner")} size={18} /> : <>Continue <ArrowRight size={18} /></>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className={cx("optional-content")}>
                            <p className={cx("intro")}>Add as much as you're comfortable sharing. Coordinates are used only when you choose “Use current location”.</p>
                            <button className={cx("location-button")} type="button" onClick={useCurrentLocation} disabled={locating}>
                                {locating ? <Loader2 className={cx("spinner")} size={20} /> : <LocateFixed size={20} />}
                                {locating ? "Finding your location…" : "Use current location"}
                            </button>
                            {location.latitude !== undefined && (
                                <p className={cx("coordinates")}><Compass size={16} /> Location added · {location.latitude}, {location.longitude}</p>
                            )}
                            <div className={cx("divider")}><span>or enter an area</span></div>
                            <div className={cx("two-columns")}>
                                <label htmlFor="profile-city"><span>City</span><input id="profile-city" value={location.city} onChange={(event) => setLocation({ ...location, city: event.target.value })} placeholder="Ho Chi Minh City" /></label>
                                <label htmlFor="profile-country"><span>Country</span><input id="profile-country" value={location.country} onChange={(event) => setLocation({ ...location, country: event.target.value })} placeholder="Vietnam" /></label>
                            </div>
                            <div className={cx("actions")}>
                                <button className={cx("back-button")} type="button" onClick={() => goToStep(1)}><ArrowLeft size={18} /> Back</button>
                                <div>
                                    <button className={cx("skip-button")} type="button" onClick={() => goToStep(3)}>Skip</button>
                                    <button className={cx("primary-button")} type="button" onClick={saveLocation} disabled={loading}>Continue <ArrowRight size={18} /></button>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className={cx("optional-content")}>
                            <p className={cx("intro")}>Start with a few familiar faces. You can always find more people from the Friends page.</p>
                            <div className={cx("suggestions")}>
                                {suggestedFriends.length === 0 ? (
                                    <div className={cx("empty-state")}><UsersRound size={30} /><p>No suggestions yet. You can continue to the feed.</p></div>
                                ) : suggestedFriends.slice(0, 6).map((friend) => (
                                    <article key={friend._id}>
                                        <div className={cx("friend-avatar")}>
                                            {friend.avatarURL ? <img src={avatarSource(friend.avatarURL)} alt="" /> : <UserRound size={20} />}
                                        </div>
                                        <span><strong>{friend.displayName}</strong><small>@{friend.username || "new_member"}</small></span>
                                        <button type="button" disabled={sentRequests.has(friend._id)} onClick={() => sendFriendRequest(friend._id)}>
                                            {sentRequests.has(friend._id) ? <><Check size={16} /> Sent</> : "Add"}
                                        </button>
                                    </article>
                                ))}
                            </div>
                            <div className={cx("actions")}>
                                <button className={cx("back-button")} type="button" onClick={() => goToStep(2)}><ArrowLeft size={18} /> Back</button>
                                <button className={cx("primary-button")} type="button" onClick={finishOnboarding}><Sparkles size={18} /> Open Shrimple</button>
                            </div>
                        </div>
                    )}
                </div>
            </section>
        </main>
    );
};

export default CompleteProfile;
