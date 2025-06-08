const { cleanEnv, str, port, url, bool, num } = require('envalid');

function validateEnv() {
  cleanEnv(process.env, {
    // Server Configuration
    NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),
    PORT: port({ default: 5000 }),

    // Database Configuration
    MONGODB_URI: str({ default: 'mongodb://localhost:27017/chat-app' }),
    MONGODB_URI_TEST: url({ optional: true }),

    // JWT Configuration
    JWT_SECRET: str({ default: 'your-secret-key' }),
    JWT_EXPIRES_IN: str({ default: '7d' }),
    JWT_REFRESH_SECRET: str(),
    JWT_REFRESH_EXPIRES_IN: str(),

    // Frontend URL
    FRONTEND_URL: str({ default: 'http://localhost:5173' }),

    // File Upload Configuration
    MAX_FILE_SIZE: num({ default: 5242880 }), // 5MB
    UPLOAD_PATH: str({ default: 'uploads' }),
    ALLOWED_FILE_TYPES: str({ default: 'image/*,video/*,audio/*,application/pdf' }),

    // Email Configuration (optional)
    SMTP_HOST: str({ optional: true }),
    SMTP_PORT: port({ optional: true }),
    SMTP_USER: str({ optional: true }),
    SMTP_PASS: str({ optional: true }),
    EMAIL_FROM: str({ optional: true }),

    // Google OAuth (optional)
    GOOGLE_CLIENT_ID: str({ optional: true }),
    GOOGLE_CLIENT_SECRET: str({ optional: true }),
    GOOGLE_REDIRECT_URI: str({ optional: true }),

    // Redis Configuration (optional)
    REDIS_HOST: str({ optional: true }),
    REDIS_PORT: port({ optional: true }),
    REDIS_PASSWORD: str({ optional: true }),

    // Socket.IO Configuration
    SOCKET_CORS_ORIGIN: str({ default: 'http://localhost:5173' }),
    SOCKET_PING_TIMEOUT: num({ default: 60000 }),
    SOCKET_PING_INTERVAL: num({ default: 25000 }),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: num({ default: 900000 }), // 15 minutes
    RATE_LIMIT_MAX_REQUESTS: num({ default: 100 }),

    // Logging
    LOG_LEVEL: str({ choices: ['error', 'warn', 'info', 'debug'], default: 'info' }),
    LOG_FILE_PATH: str({ default: 'logs/app.log' }),

    // Security
    BCRYPT_SALT_ROUNDS: num({ default: 10 }),
    PASSWORD_MIN_LENGTH: num({ default: 8 }),
    SESSION_SECRET: str({ default: 'your-session-secret' }),

    // Feature Flags
    ENABLE_GOOGLE_DRIVE: bool({ default: false }),
    ENABLE_EMAIL_NOTIFICATIONS: bool({ default: false }),
    ENABLE_FILE_UPLOADS: bool({ default: true }),
    ENABLE_USER_ACTIVITY_TRACKING: bool({ default: true }),

    // Analytics
    ENABLE_ANALYTICS: bool({ default: false }),
    ANALYTICS_RETENTION_DAYS: num({ default: 30 }),

    // Backup Configuration
    BACKUP_FREQUENCY: str({ default: 'daily' }),
    BACKUP_RETENTION_DAYS: num({ default: 7 }),
    BACKUP_PATH: str({ default: 'backups' }),

    // Mobile Push Notifications (optional)
    FIREBASE_PROJECT_ID: str({ optional: true }),
    FIREBASE_PRIVATE_KEY: str({ optional: true }),
    FIREBASE_CLIENT_EMAIL: str({ optional: true }),

    // Message Configuration
    MESSAGE_HISTORY_RETENTION_DAYS: num({ default: 30 }),
    MAX_MESSAGE_LENGTH: num({ default: 1000 }),
    ENABLE_MESSAGE_ENCRYPTION: bool({ default: false }),

    // Group Configuration
    MAX_GROUP_MEMBERS: num({ default: 100 }),
    MAX_GROUPS_PER_USER: num({ default: 10 }),

    // Cache Configuration
    CACHE_TTL: num({ default: 3600 }), // 1 hour
    CACHE_PREFIX: str({ default: 'chat-app:' }),

    // Cloudinary Configuration (optional)
    CLOUDINARY_CLOUD_NAME: str({ optional: true }),
    CLOUDINARY_API_KEY: str({ optional: true }),
    CLOUDINARY_API_SECRET: str({ optional: true })
  });
}

module.exports = validateEnv; 