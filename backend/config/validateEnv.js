const { cleanEnv, str, port, url, bool, num } = require('envalid');

function validateEnv() {
  cleanEnv(process.env, {
    // Server Configuration
    NODE_ENV: str({ choices: ['development', 'test', 'production'] }),
    PORT: port({ default: 5000 }),

    // Database Configuration
    MONGODB_URI: url(),
    MONGODB_URI_TEST: url({ optional: true }),

    // JWT Configuration
    JWT_SECRET: str(),
    JWT_EXPIRES_IN: str(),
    JWT_REFRESH_SECRET: str(),
    JWT_REFRESH_EXPIRES_IN: str(),

    // Frontend URL
    FRONTEND_URL: url(),

    // File Upload Configuration
    MAX_FILE_SIZE: num(),
    UPLOAD_PATH: str(),
    ALLOWED_FILE_TYPES: str(),

    // Email Configuration
    SMTP_HOST: str(),
    SMTP_PORT: port(),
    SMTP_USER: str(),
    SMTP_PASS: str(),
    EMAIL_FROM: str(),

    // Google OAuth
    GOOGLE_CLIENT_ID: str(),
    GOOGLE_CLIENT_SECRET: str(),
    GOOGLE_REDIRECT_URI: url(),

    // Redis Configuration
    REDIS_HOST: str(),
    REDIS_PORT: port(),
    REDIS_PASSWORD: str({ optional: true }),

    // Socket.IO Configuration
    SOCKET_CORS_ORIGIN: str(),
    SOCKET_PING_TIMEOUT: num(),
    SOCKET_PING_INTERVAL: num(),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: num(),
    RATE_LIMIT_MAX_REQUESTS: num(),

    // Logging
    LOG_LEVEL: str({ choices: ['error', 'warn', 'info', 'debug'] }),
    LOG_FILE_PATH: str(),

    // Security
    BCRYPT_SALT_ROUNDS: num(),
    PASSWORD_MIN_LENGTH: num(),
    SESSION_SECRET: str(),

    // Feature Flags
    ENABLE_GOOGLE_DRIVE: bool(),
    ENABLE_EMAIL_NOTIFICATIONS: bool(),
    ENABLE_FILE_UPLOADS: bool(),
    ENABLE_USER_ACTIVITY_TRACKING: bool(),

    // Analytics
    ENABLE_ANALYTICS: bool(),
    ANALYTICS_RETENTION_DAYS: num(),

    // Backup Configuration
    BACKUP_FREQUENCY: str(),
    BACKUP_RETENTION_DAYS: num(),
    BACKUP_PATH: str(),

    // Mobile Push Notifications
    FIREBASE_PROJECT_ID: str(),
    FIREBASE_PRIVATE_KEY: str(),
    FIREBASE_CLIENT_EMAIL: str(),

    // Message Configuration
    MESSAGE_HISTORY_RETENTION_DAYS: num(),
    MAX_MESSAGE_LENGTH: num(),
    ENABLE_MESSAGE_ENCRYPTION: bool(),

    // Group Configuration
    MAX_GROUP_MEMBERS: num(),
    MAX_GROUPS_PER_USER: num(),

    // Cache Configuration
    CACHE_TTL: num(),
    CACHE_PREFIX: str()
  });
}

module.exports = validateEnv; 