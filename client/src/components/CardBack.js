import React from 'react';

const CardBack = () => {
  return (
    <div 
      className="card-back"
      style={{
        backgroundImage: `url('/card_bg.png')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: 'white'
      }}
    >
    </div>
  );
};

export default CardBack;
