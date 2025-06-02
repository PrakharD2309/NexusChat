const config = {
  // API Configuration
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  apiVersion: process.env.REACT_APP_API_VERSION || 'v1',
  apiTimeout: parseInt(process.env.REACT_APP_API_TIMEOUT || '30000', 10),

  // Authentication
  authTokenKey: process.env.REACT_APP_AUTH_TOKEN_KEY || 'auth_token',
  refreshTokenKey: process.env.REACT_APP_REFRESH_TOKEN_KEY || 'refresh_token',
  tokenExpiryKey: process.env.REACT_APP_TOKEN_EXPIRY_KEY || 'token_expiry',

  // Google OAuth
  googleClientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,
  googleRedirectUri: process.env.REACT_APP_GOOGLE_REDIRECT_URI,

  // Feature Flags
  enableGoogleDrive: process.env.REACT_APP_ENABLE_GOOGLE_DRIVE === 'true',
  enableFileUploads: process.env.REACT_APP_ENABLE_FILE_UPLOADS === 'true',
  enableVoiceMessages: process.env.REACT_APP_ENABLE_VOICE_MESSAGES === 'true',
  enableVideoCalls: process.env.REACT_APP_ENABLE_VIDEO_CALLS === 'true',
  enableScreenSharing: process.env.REACT_APP_ENABLE_SCREEN_SHARING === 'true',
  enableMessageTranslation: process.env.REACT_APP_ENABLE_MESSAGE_TRANSLATION === 'true',
  enableMessageScheduling: process.env.REACT_APP_ENABLE_MESSAGE_SCHEDULING === 'true',
  enableMessageTemplates: process.env.REACT_APP_ENABLE_MESSAGE_TEMPLATES === 'true',
  enableMessagePolls: process.env.REACT_APP_ENABLE_MESSAGE_POLLS === 'true',
  enableMessageReactions: process.env.REACT_APP_ENABLE_MESSAGE_REACTIONS === 'true',
  enableMessageThreads: process.env.REACT_APP_ENABLE_MESSAGE_THREADS === 'true',
  enableMessageForwarding: process.env.REACT_APP_ENABLE_MESSAGE_FORWARDING === 'true',

  // UI Configuration
  theme: process.env.REACT_APP_THEME || 'light',
  primaryColor: process.env.REACT_APP_PRIMARY_COLOR || '#1976d2',
  secondaryColor: process.env.REACT_APP_SECONDARY_COLOR || '#dc004e',
  maxFileSize: parseInt(process.env.REACT_APP_MAX_FILE_SIZE || '5242880', 10), // 5MB

  // Socket.IO Configuration
  socketUrl: process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000',
  socketPath: process.env.REACT_APP_SOCKET_PATH || '/socket.io',
  socketReconnectAttempts: parseInt(process.env.REACT_APP_SOCKET_RECONNECT_ATTEMPTS || '5', 10),
  socketReconnectDelay: parseInt(process.env.REACT_APP_SOCKET_RECONNECT_DELAY || '1000', 10),

  // Analytics
  enableAnalytics: process.env.REACT_APP_ENABLE_ANALYTICS === 'true',
  analyticsId: process.env.REACT_APP_ANALYTICS_ID,

  // Error Tracking
  enableErrorTracking: process.env.REACT_APP_ENABLE_ERROR_TRACKING === 'true',
  errorTrackingId: process.env.REACT_APP_ERROR_TRACKING_ID,

  // Performance Monitoring
  enablePerformanceMonitoring: process.env.REACT_APP_ENABLE_PERFORMANCE_MONITORING === 'true',
  performanceMonitoringId: process.env.REACT_APP_PERFORMANCE_MONITORING_ID,

  // Cache Configuration
  cachePrefix: process.env.REACT_APP_CACHE_PREFIX || 'chat_app_',
  cacheExpiry: parseInt(process.env.REACT_APP_CACHE_EXPIRY || '3600000', 10), // 1 hour

  // Message Configuration
  maxMessageLength: parseInt(process.env.REACT_APP_MAX_MESSAGE_LENGTH || '1000', 10),
  enableMessageEncryption: process.env.REACT_APP_ENABLE_MESSAGE_ENCRYPTION === 'true',

  // Notification Configuration
  enablePushNotifications: process.env.REACT_APP_ENABLE_PUSH_NOTIFICATIONS === 'true',
  enableDesktopNotifications: process.env.REACT_APP_ENABLE_DESKTOP_NOTIFICATIONS === 'true',
  notificationSound: process.env.REACT_APP_NOTIFICATION_SOUND || 'default',

  // Media Configuration
  maxImageSize: parseInt(process.env.REACT_APP_MAX_IMAGE_SIZE || '2097152', 10), // 2MB
  maxVideoSize: parseInt(process.env.REACT_APP_MAX_VIDEO_SIZE || '10485760', 10), // 10MB
  maxAudioSize: parseInt(process.env.REACT_APP_MAX_AUDIO_SIZE || '5242880', 10), // 5MB

  // Localization
  defaultLanguage: process.env.REACT_APP_DEFAULT_LANGUAGE || 'en',
  availableLanguages: (process.env.REACT_APP_AVAILABLE_LANGUAGES || 'en,es,fr,de').split(','),

  // PWA Configuration
  enablePWA: process.env.REACT_APP_ENABLE_PWA === 'true',
  pwaName: process.env.REACT_APP_PWA_NAME || 'Chat Application',
  pwaShortName: process.env.REACT_APP_PWA_SHORT_NAME || 'Chat',
  pwaDescription: process.env.REACT_APP_PWA_DESCRIPTION || 'A modern chat application',

  // Development Tools
  enableDevTools: process.env.REACT_APP_ENABLE_DEV_TOOLS === 'true',
  enableReduxDevTools: process.env.REACT_APP_ENABLE_REDUX_DEV_TOOLS === 'true',

  // Testing
  enableTestMode: process.env.REACT_APP_ENABLE_TEST_MODE === 'true',
  mockApiUrl: process.env.REACT_APP_MOCK_API_URL || 'http://localhost:3001'
};

// Validate required configuration
const requiredConfig = [
  'apiUrl',
  'googleClientId',
  'googleRedirectUri'
];

const missingConfig = requiredConfig.filter(key => !config[key]);

if (missingConfig.length > 0) {
  throw new Error(`Missing required configuration: ${missingConfig.join(', ')}`);
}

export default config; 