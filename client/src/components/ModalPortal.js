import React from 'react';
import { createPortal } from 'react-dom';

const ModalPortal = ({ children }) => {
  return createPortal(children, document.body);
};

export default ModalPortal;
