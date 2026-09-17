import React from 'react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/SettingContainer.module.scss';

const cx = classNames.bind(styles);

const Application = () => {
    return (
        <>
            <h3>Application</h3>
            <div className={cx('section')}>
                <h4>About</h4>
                <div className={cx('form-group')}>
                    <label>Version</label>
                    <p style={{fontSize: '1.4rem', color: 'var(--text-muted)'}}>Beta</p>
                </div>
                <div className={cx('form-group')}>
                    <label>Developer</label>
                    <p style={{fontSize: '1.4rem', color: 'var(--text-muted)'}}>Quach Hoang Kha</p>
                </div>
            </div>
            
             <div className={cx('section')}>
                <h4>Help</h4>
                <div className={cx('form-group')}>
                     <p style={{fontSize: '1.4rem', color: 'var(--text-muted)'}}>Contact support: quachhoangkha097@gmail.com</p>
                </div>
            </div>
        </>
    );
};

export default Application;
