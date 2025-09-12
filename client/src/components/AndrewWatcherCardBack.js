import React from 'react';
import yukonImage from '../assets/yukon.jpeg';

const AndrewWatcherCardBack = () => {
  return (
    <div 
      className="card-back"
      style={{
        backgroundImage: `url(${yukonImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
    </div>
  );
};

export default AndrewWatcherCardBack;
