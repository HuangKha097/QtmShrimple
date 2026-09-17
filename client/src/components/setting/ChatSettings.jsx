import React, { useRef } from 'react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/SettingContainer.module.scss';
import {useThemeStore} from "../../stores/useThemeStore.js";

const cx = classNames.bind(styles);

const PRESET_COLORS = [
    "#e56d32", // Default Orange
    "#3b82f6", // Blue
    "#10b981", // Emerald
    "#8b5cf6", // Violet
    "#ec4899", // Pink
    "#f59e0b", // Amber
];

const ChatSettings = () => {
    const { isLight, toggleTheme, primaryColor, setPrimaryColor } = useThemeStore();
    const colorInputRef = useRef(null);

    return (
        <>
            <h3>Chat Settings</h3>

            <div className={cx('section')}>
                <h4>Theme</h4>
                <div className={cx('form-group', 'row-layout')}>
                    <label htmlFor="light-mode">Light Mode</label>
                    <label className={cx('switch')}>
                        <input
                            id="light-mode"
                            type="checkbox"
                            checked={isLight}
                            onChange={toggleTheme}
                        />
                        <span className={cx('slider')}></span>
                    </label>
                </div>
            </div>

            <div className={cx('section')}>
                <h4>Primary Color</h4>
                <div className={cx('color-picker-container')}>
                    <div className={cx('preset-colors')}>
                        {PRESET_COLORS.map(color => (
                            <button type="button" aria-label={"Use accent " + color} aria-pressed={primaryColor === color}
                                key={color}
                                className={cx('color-swatch', { active: primaryColor === color })}
                                style={{ backgroundColor: color }}
                                onClick={() => setPrimaryColor(color)}
                            />
                        ))}
                         <div 
                            className={cx('color-swatch', 'custom-color')}
                            onClick={() => colorInputRef.current.click()}
                            style={{ background: `conic-gradient(red, yellow, lime, aqua, blue, magenta, red)` }}
                        >
                            <input 
                                aria-label="Custom accent color"
                                type="color" 
                                ref={colorInputRef}
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ChatSettings;