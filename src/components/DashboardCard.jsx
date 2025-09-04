import React from 'react';

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
            style={{
                backgroundColor: '#1e1e1e',
                padding: '25px',
                borderRadius: '12px',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                cursor: 'pointer',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '160px',
                border: `1px solid ${color}55`,
                position: 'relative'
            }}
            onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)';
                e.currentTarget.style.boxShadow = `0 8px 16px ${color}44`;
            }}
            onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ margin: 0, fontSize: '1.4em', color: color }}>{title}</h3>
                <span style={{ fontSize: '2em', color: color }}>{icon}</span>
                {count > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '15px',
                        right: '15px',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        borderRadius: '50%',
                        padding: '2px 8px',
                        fontSize: '0.8em',
                        fontWeight: 'bold',
                        minWidth: '20px',
                        textAlign: 'center',
                        boxShadow: '0 0 5px rgba(220,53,69,0.5)'
                    }}>
                        {count}
                    </span>
                )}
            </div>
            <p style={{ fontSize: '0.9em', color: '#bbb', lineHeight: '1.4' }}>{description}</p>
        </div>
    );
};

export default DashboardCard;