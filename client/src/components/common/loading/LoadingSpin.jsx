import React from 'react';
import classNames from 'classnames/bind';
import styles from '../../../assets/css/LoadingSpin.module.scss';

const cx = classNames.bind(styles);

const LoadingSpin = ({ size = 30, fullHeight = false }) => {
    return (
        <div className={cx('loading-wrapper', { 'full-height': fullHeight })}>
            <div
                className={cx('spinner')}
                style={{ width: size, height: size }}
            ></div>
        </div>
    );
};

export default LoadingSpin;