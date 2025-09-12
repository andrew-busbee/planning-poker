import React from 'react';

const CardBack = () => {
  return (
    <div 
      className="card-back"
      style={{
        backgroundImage: `url('/card_bg.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: 'black'
      }}
    >
    </div>
  );
};

export default CardBack;
