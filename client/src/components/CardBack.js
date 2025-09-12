import React from 'react';

const CardBack = () => {
  return (
    <div 
      className="card-back"
      style={{
        backgroundImage: `url('/drivelink.jpg')`,
        backgroundSize: 'contain',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: 'black'
      }}
    >
    </div>
  );
};

export default CardBack;
