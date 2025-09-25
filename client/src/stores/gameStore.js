import { useState, useCallback } from 'react';
import { socketService } from '../services/socketService';

// Simple React hook-based game store
export const useGameStore = () => {
  // UI state
  const [selectedCard, setSelectedCard] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [consensusPulse, setConsensusPulse] = useState(false);

  // Game actions
  const castVote = useCallback((gameId, card) => {
    socketService.castVote(gameId, card);
  }, []);

  const revealVotes = useCallback((gameId) => {
    socketService.revealVotes(gameId);
  }, []);

  const resetGame = useCallback((gameId) => {
    socketService.resetGame(gameId);
    setSelectedCard(null);
  }, []);

  const changeDeck = useCallback((gameId, deckType) => {
    socketService.changeDeck(gameId, deckType);
  }, []);

  const toggleRole = useCallback((gameId) => {
    socketService.toggleRole(gameId);
  }, []);


  const createCustomDeck = useCallback((gameId, deckData) => {
    socketService.createCustomDeck(gameId, deckData);
  }, []);

  const editCustomDeck = useCallback((gameId, deckData) => {
    socketService.editCustomDeck(gameId, deckData);
  }, []);

  // Utility actions
  const resetGameState = useCallback(() => {
    setSelectedCard(null);
    setShowConfetti(false);
    setConsensusPulse(false);
  }, []);

  return {
    // State
    selectedCard,
    showConfetti,
    consensusPulse,
    
    // State setters
    setSelectedCard,
    setShowConfetti,
    setConsensusPulse,
    
    // Actions
    castVote,
    revealVotes,
    resetGame,
    changeDeck,
    toggleRole,
    createCustomDeck,
    editCustomDeck,
    resetGameState
  };
};
