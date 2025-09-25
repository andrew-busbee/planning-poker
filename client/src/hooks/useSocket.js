import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../services/socketService';

export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [socketId, setSocketId] = useState(null);

  useEffect(() => {
    // Initialize socket connection
    const newSocket = socketService.connect();
    setSocket(newSocket);
    setIsConnected(newSocket.connected);
    setSocketId(newSocket.id);

    const handleConnect = () => {
      setIsConnected(true);
      setSocketId(newSocket.id);
      console.log(`[${new Date().toISOString()}] [SOCKET] Connected with ID: ${newSocket.id}`);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setSocketId(null);
      console.log(`[${new Date().toISOString()}] [SOCKET] Disconnected`);
    };

    const handleReconnect = () => {
      setIsConnected(true);
      setSocketId(newSocket.id);
      console.log(`[${new Date().toISOString()}] [SOCKET] Reconnected with ID: ${newSocket.id}`);
    };

    // Add event listeners
    newSocket.on('connect', handleConnect);
    newSocket.on('disconnect', handleDisconnect);
    newSocket.on('reconnect', handleReconnect);

    // Cleanup
    return () => {
      newSocket.off('connect', handleConnect);
      newSocket.off('disconnect', handleDisconnect);
      newSocket.off('reconnect', handleReconnect);
    };
  }, []);

  const connect = useCallback(() => {
    socketService.connect();
  }, []);

  const disconnect = useCallback(() => {
    socketService.disconnect();
    setSocket(null);
    setIsConnected(false);
    setSocketId(null);
  }, []);

  return {
    socket,
    isConnected,
    socketId,
    connect,
    disconnect
  };
};



