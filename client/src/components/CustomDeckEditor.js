import React, { useState, useEffect } from 'react';

const CustomDeckEditor = ({ game, socket, onClose, isEditing = false }) => {
  const [deckName, setDeckName] = useState('');
  const [cards, setCards] = useState(['', '', '', '', '']); // Start with 5 empty slots
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEditing && game.customDeck) {
      setDeckName(game.customDeck.name);
      setCards([...game.customDeck.cards, '']); // Add empty slot for new cards
    }
  }, [isEditing, game.customDeck]);

  const addCardSlot = () => {
    setCards([...cards, '']);
  };

  const removeCardSlot = (index) => {
    if (cards.length > 1) {
      const newCards = cards.filter((_, i) => i !== index);
      setCards(newCards);
    }
  };

  const updateCard = (index, value) => {
    const newCards = [...cards];
    newCards[index] = value;
    setCards(newCards);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!deckName.trim()) {
      newErrors.deckName = 'Deck name is required';
    }
    
    const validCards = cards.filter(card => card.trim() !== '');
    if (validCards.length < 2) {
      newErrors.cards = 'At least 2 cards are required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const validCards = cards.filter(card => card.trim() !== '');
    
    if (isEditing) {
      socket.emit('edit-custom-deck', {
        gameId: game.id,
        name: deckName.trim(),
        cards: validCards
      });
    } else {
      socket.emit('create-custom-deck', {
        gameId: game.id,
        name: deckName.trim(),
        cards: validCards
      });
    }
    
    onClose();
  };

  const handleCancel = () => {
    setDeckName('');
    setCards(['', '', '', '', '']);
    setErrors({});
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditing ? 'Edit Custom Deck' : 'Create Custom Deck'}</h3>
          <button className="modal-close" onClick={handleCancel}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="deckName">Deck Name:</label>
            <input
              type="text"
              id="deckName"
              className="input"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder="Enter deck name"
              required
            />
            {errors.deckName && <span className="error-text">{errors.deckName}</span>}
          </div>

          <div className="form-group">
            <label>Cards:</label>
            {errors.cards && <span className="error-text">{errors.cards}</span>}
            <div className="cards-input-container">
              {cards.map((card, index) => (
                <div key={index} className="card-input-row">
                  <input
                    type="text"
                    className="input card-input"
                    value={card}
                    onChange={(e) => updateCard(index, e.target.value)}
                    placeholder={`Card ${index + 1}`}
                  />
                  {cards.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => removeCardSlot(index)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={addCardSlot}
              >
                Add Card
              </button>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={handleCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              {isEditing ? 'Update Deck' : 'Create Deck'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomDeckEditor;
