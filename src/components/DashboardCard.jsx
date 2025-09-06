import React from 'react';
import styles from './DashboardCard.module.css';

const DashboardCard = ({ title, description, icon, color, onClick, userType, requiredUserType, count }) => {
    const shouldRender = Array.isArray(requiredUserType) 
        ? requiredUserType.includes(userType)
        : userType === requiredUserType;

    if (!shouldRender) {
        return null;
    }

    return (
        <div 
            onClick={onClick}
            className={styles['card-container']}
            style={{ border: `1px solid ${color}55` }}
        >
            <div className={styles['card-header']}>
                <h3 className={styles['card-title']} style={{ color: color }}>{title}</h3>
                <span className={styles['card-icon']} style={{ color: color }}>{icon}</span>
                {count > 0 && (
                    <span className={styles['badge']}>
                        {count}
                    </span>
                )}
            </div>
            <p className={styles['card-description']}>{description}</p>
        </div>
    );
};

export default DashboardCard;