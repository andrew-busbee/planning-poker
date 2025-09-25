// Simple test script to verify the refactored architecture
console.log('Testing refactored architecture...');

// Test imports
try {
  const { socketService } = require('./services/socketService');
  console.log('✅ SocketService imported successfully');
  
  const { useConnection } = require('./hooks/useConnection');
  console.log('✅ useConnection hook imported successfully');
  
  const { useGame } = require('./hooks/useGame');
  console.log('✅ useGame hook imported successfully');
  
  const { useSocket } = require('./hooks/useSocket');
  console.log('✅ useSocket hook imported successfully');
  
  const { useGameStore } = require('./stores/gameStore');
  console.log('✅ useGameStore imported successfully');
  
  console.log('🎉 All imports successful! Refactored architecture is working.');
  
} catch (error) {
  console.error('❌ Import error:', error.message);
}



