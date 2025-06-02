import config from '../config/config';

// Get a configuration value
export const getConfig = (key) => {
  if (!(key in config)) {
    throw new Error(`Configuration key "${key}" not found`);
  }
  return config[key];
};

// Check if a feature is enabled
export const isFeatureEnabled = (feature) => {
  const featureKey = `enable${feature.charAt(0).toUpperCase() + feature.slice(1)}`;
  return config[featureKey] === true;
};

// Get API URL with version
export const getApiUrl = (endpoint = '') => {
  const baseUrl = config.apiUrl.replace(/\/$/, '');
  const version = config.apiVersion.replace(/^v/, '');
  const path = endpoint.replace(/^\//, '');
  return `${baseUrl}/api/v${version}/${path}`;
};

// Get socket configuration
export const getSocketConfig = () => ({
  url: config.socketUrl,
  path: config.socketPath,
  reconnectionAttempts: config.socketReconnectAttempts,
  reconnectionDelay: config.socketReconnectDelay
});

// Get file size limits
export const getFileSizeLimits = () => ({
  maxFileSize: config.maxFileSize,
  maxImageSize: config.maxImageSize,
  maxVideoSize: config.maxVideoSize,
  maxAudioSize: config.maxAudioSize
});

// Get notification configuration
export const getNotificationConfig = () => ({
  enablePush: config.enablePushNotifications,
  enableDesktop: config.enableDesktopNotifications,
  sound: config.notificationSound
});

// Get theme configuration
export const getThemeConfig = () => ({
  theme: config.theme,
  primaryColor: config.primaryColor,
  secondaryColor: config.secondaryColor
});

// Get localization configuration
export const getLocalizationConfig = () => ({
  defaultLanguage: config.defaultLanguage,
  availableLanguages: config.availableLanguages
});

// Get PWA configuration
export const getPWAConfig = () => ({
  enabled: config.enablePWA,
  name: config.pwaName,
  shortName: config.pwaShortName,
  description: config.pwaDescription
});

// Get development tools configuration
export const getDevToolsConfig = () => ({
  enabled: config.enableDevTools,
  reduxEnabled: config.enableReduxDevTools
});

// Get testing configuration
export const getTestingConfig = () => ({
  enabled: config.enableTestMode,
  mockApiUrl: config.mockApiUrl
});

// Get cache configuration
export const getCacheConfig = () => ({
  prefix: config.cachePrefix,
  expiry: config.cacheExpiry
});

// Get message configuration
export const getMessageConfig = () => ({
  maxLength: config.maxMessageLength,
  encryptionEnabled: config.enableMessageEncryption
});

// Get analytics configuration
export const getAnalyticsConfig = () => ({
  enabled: config.enableAnalytics,
  id: config.analyticsId
});

// Get error tracking configuration
export const getErrorTrackingConfig = () => ({
  enabled: config.enableErrorTracking,
  id: config.errorTrackingId
});

// Get performance monitoring configuration
export const getPerformanceMonitoringConfig = () => ({
  enabled: config.enablePerformanceMonitoring,
  id: config.performanceMonitoringId
}); 