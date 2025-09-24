import React from 'react';
import cardBgImage from '../assets/card_bg.png';

const CardBack = () => {
  return (
    <div 
      className="card-back"
      style={{
        backgroundImage: `url(${cardBgImage})`,
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
