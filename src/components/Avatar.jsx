import React from 'react';

// A function to get the initials from a name
const getInitials = (name) => {
  if (!name) return '?';
  const nameParts = name.split(' ');
  const initials = nameParts.map(part => part.charAt(0)).join('');
  return initials.toUpperCase();
};

const Avatar = ({ url, name }) => {
  const initials = getInitials(name);

  // Define a style object for consistent appearance
  const avatarStyle = {
    container: {
      borderRadius: '50%',
      width: '50px',
      height: '50px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      backgroundColor: '#e0e0e0', // Light gray background for fallback
      color: '#555',
      fontWeight: 'bold',
      fontSize: '1.2em'
    },
    image: {
      width: '100%',
      height: '100%',
      objectFit: 'cover' // Ensures image fills the container without distortion
    },
    initials: {}
  };

  return (
    <div style={avatarStyle.container}>
      {url ? (
        <img src={url} alt={name} style={avatarStyle.image} />
      ) : (
        <span style={avatarStyle.initials}>
          {initials}
        </span>
      )}
    </div>
  );
};

export default Avatar;