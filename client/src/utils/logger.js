/**
 * Client-side logger utility with environment variable support
 * Supports DEBUG, INFO, WARN, ERROR, SILENT levels
 */

const LOG_LEVELS = {
  SILENT: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4
};

// Get log level from environment variable, default to DEBUG in development
const getLogLevel = () => {
  const envLevel = process.env.REACT_APP_LOG_LEVEL || process.env.NODE_ENV === 'production' ? 'INFO' : 'DEBUG';
  return LOG_LEVELS[envLevel.toUpperCase()] || LOG_LEVELS.DEBUG;
};

const currentLogLevel = getLogLevel();

const shouldLog = (level) => {
  return level <= currentLogLevel;
};

const formatMessage = (level, message, ...args) => {
  const timestamp = new Date().toISOString();
  const levelName = Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === level);
  return [`[${timestamp}] [${levelName}]`, message, ...args];
};

const logger = {
  debug: (message, ...args) => {
    if (shouldLog(LOG_LEVELS.DEBUG)) {
      console.log(...formatMessage(LOG_LEVELS.DEBUG, message, ...args));
    }
  },

  info: (message, ...args) => {
    if (shouldLog(LOG_LEVELS.INFO)) {
      console.log(...formatMessage(LOG_LEVELS.INFO, message, ...args));
    }
  },

  warn: (message, ...args) => {
    if (shouldLog(LOG_LEVELS.WARN)) {
      console.warn(...formatMessage(LOG_LEVELS.WARN, message, ...args));
    }
  },

  error: (message, ...args) => {
    if (shouldLog(LOG_LEVELS.ERROR)) {
      console.error(...formatMessage(LOG_LEVELS.ERROR, message, ...args));
    }
  },

  // Legacy support for existing console.log calls
  log: (message, ...args) => {
    if (shouldLog(LOG_LEVELS.INFO)) {
      console.log(...formatMessage(LOG_LEVELS.INFO, message, ...args));
    }
  }
};

export default logger;
