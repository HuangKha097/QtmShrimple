import React from 'react';
import classNames from 'classnames/bind';
import styles from '../../assets/css/PostsContainer.module.scss';
import { MoreHorizontal } from 'lucide-react';

const cx = classNames.bind(styles);

const TRENDS_DATA = [
    { category: 'Công nghệ · Xu hướng', topic: '#Shrimple2026', posts: '18.4K bài viết' },
    { category: 'Đời sống sinh viên', topic: '#HocKyMoi', posts: '12.1K bài viết' },
    { category: 'Lập trình · Thịnh hành', topic: '#React19', posts: '9,520 bài viết' },
    { category: 'Khám phá', topic: '#DeepLearning', posts: '7,230 bài viết' },
    { category: 'Âm nhạc · Xu hướng', topic: '#ChillHopShrimple', posts: '4,180 bài viết' }
];

const TrendsWidget = () => {
    return (
        <div className={cx('x-widget-card')}>
            <h3 className={cx('widget-title')}>Xu hướng cho bạn</h3>

            <div className={cx('trends-list')}>
                {TRENDS_DATA.map((trend, index) => (
                    <div key={index} className={cx('trend-item')}>
                        <div className={cx('trend-meta')}>
                            <span className={cx('trend-category')}>{trend.category}</span>
                            <span className={cx('trend-topic')}>{trend.topic}</span>
                            <span className={cx('trend-posts-count')}>{trend.posts}</span>
                        </div>
                        <button type="button" className={cx('trend-more-btn')} title="Tùy chọn">
                            <MoreHorizontal size={16} />
                        </button>
                    </div>
                ))}
            </div>

            <div className={cx('widget-footer-links')}>
                <span>Điều khoản dịch vụ</span>
                <span>Chính sách quyền riêng tư</span>
                <span>Trợ năng</span>
                <span>© 2026 Shrimple Corp.</span>
            </div>
        </div>
    );
};

export default TrendsWidget;
