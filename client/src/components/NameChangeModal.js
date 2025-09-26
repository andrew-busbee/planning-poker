import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { socketService } from '../services/socketService';
import ModalPortal from './ModalPortal';
import logger from '../utils/logger';

const NameChangeModal = ({ game, currentPlayer, onClose }) => {
  const [newName, setNewName] = useState(currentPlayer?.name || '');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeoutId, setTimeoutId] = useState(null);

  useEffect(() => {
    setNewName(currentPlayer?.name || '');
    setErrors({});
  }, [currentPlayer]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
      // Clear any pending timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  // Clear timeout when player name changes (indicating success)
  useEffect(() => {
    if (timeoutId && currentPlayer?.name && currentPlayer.name !== newName.trim()) {
      logger.debug('[MODAL] Player name changed, clearing timeout');
      clearTimeout(timeoutId);
      setTimeoutId(null);
      setIsSubmitting(false);
      onClose();
    }
  }, [currentPlayer?.name, timeoutId, newName, onClose]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!newName.trim()) {
      newErrors.name = 'Name is required';
    } else if (newName.trim().length > 20) {
      newErrors.name = 'Name must be 20 characters or less';
    } else if (newName.trim().length < 1) {
      newErrors.name = 'Name must be at least 1 character';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    const trimmedName = newName.trim();
    
    // Don't submit if the name hasn't changed
    if (trimmedName === currentPlayer?.name) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    
    try {
      logger.info(`[MODAL] Attempting to change player name from "${currentPlayer?.name}" to "${trimmedName}"`);
      socketService.changePlayerName(game.id, trimmedName);
        logger.debug('[MODAL] Socket event sent successfully');
      
      // Set a timeout fallback in case the server doesn't respond
      const timeout = setTimeout(() => {
        logger.warn('[MODAL] Timeout waiting for server response, closing modal');
        setIsSubmitting(false);
        onClose();
      }, 5000); // 5 second timeout
      
      setTimeoutId(timeout);
    } catch (error) {
      logger.error('Error changing player name:', error);
      setErrors({ name: 'Failed to change name. Please try again.' });
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setNewName(currentPlayer?.name || '');
    setErrors({});
    onClose();
  };

  // Prevent modal from closing when clicking inside the modal content
  const handleModalContentClick = (e) => {
    e.stopPropagation();
    // Don't prevent default - we need form submissions to work
  };


  // Prevent any mouse events from affecting the modal
  const handleMouseEvents = (e) => {
    e.stopPropagation();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <ModalPortal>
      <div 
        className="modal-overlay"
        onMouseMove={handleMouseEvents}
        onMouseEnter={handleMouseEvents}
        onMouseLeave={handleMouseEvents}
      >
        <div 
          className="modal-content" 
          onClick={handleModalContentClick}
          onMouseMove={handleMouseEvents}
          onMouseEnter={handleMouseEvents}
          onMouseLeave={handleMouseEvents}
        >
          <div className="modal-header">
            <h3>Edit Name</h3>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="playerName">Player Name</label>
              <input
                type="text"
                id="playerName"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter your name"
                maxLength={20}
                required
                autoFocus
                disabled={isSubmitting}
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={isSubmitting || newName.trim() === currentPlayer?.name}
              >
                {isSubmitting ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
};

export default NameChangeModal;
