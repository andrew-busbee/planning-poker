import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../services/socketService';
import logger from '../utils/logger';

export const useConnection = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState(null);
  const [socketId, setSocketId] = useState(null);

  useEffect(() => {
    const socket = socketService.getSocket() || socketService.connect();

    const handleConnect = () => {
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionError(null);
      setSocketId(socket.id);
      logger.info(`[CONNECTION] Connected with ID: ${socket.id}`);
    };

    const handleDisconnect = (reason) => {
      setIsConnected(false);
      setIsConnecting(false);
      setSocketId(null);
      logger.info(`[CONNECTION] Disconnected, reason: ${reason}`);
    };

    const handleReconnecting = (attemptNumber) => {
      setIsConnecting(true);
      setIsConnected(false);
      logger.info(`[CONNECTION] Reconnecting... attempt ${attemptNumber}`);
    };

    const handleReconnect = (attemptNumber) => {
      setIsConnected(true);
      setIsConnecting(false);
      setConnectionError(null);
      setSocketId(socket.id);
      logger.info(`[CONNECTION] Reconnected after ${attemptNumber} attempts`);
    };

    const handleConnectError = (error) => {
      setIsConnected(false);
      setIsConnecting(false);
      setConnectionError(error.message || 'Connection failed');
      logger.error(`[CONNECTION] Connection error:`, error);
    };

    // Set initial state
    setIsConnected(socket.connected);
    setIsConnecting(!socket.connected);
    setSocketId(socket.id);

    // Add event listeners
    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('reconnecting', handleReconnecting);
    socket.on('reconnect', handleReconnect);
    socket.on('connect_error', handleConnectError);

    // Cleanup
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('reconnecting', handleReconnecting);
      socket.off('reconnect', handleReconnect);
      socket.off('connect_error', handleConnectError);
    };
  }, []);

  const reconnect = useCallback(() => {
    if (socketService.isConnected()) {
      return;
    }
    
    setIsConnecting(true);
    setConnectionError(null);
    socketService.getSocket()?.connect();
  }, []);

  const disconnect = useCallback(() => {
    socketService.disconnect();
    setIsConnected(false);
    setIsConnecting(false);
    setSocketId(null);
  }, []);

  return {
    isConnected,
    isConnecting,
    connectionError,
    socketId,
    reconnect,
    disconnect
  };
};



