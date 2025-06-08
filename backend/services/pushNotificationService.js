const admin = require('firebase-admin');

class PushNotificationService {
  constructor() {
    // Initialize Firebase Admin if credentials are available
    if (process.env.FIREBASE_PROJECT_ID && 
        process.env.FIREBASE_PRIVATE_KEY && 
        process.env.FIREBASE_CLIENT_EMAIL) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL
        })
      });
    }
  }

  async sendNotification(token, title, body, data = {}) {
    try {
      if (!admin.apps.length) {
        console.warn('Firebase Admin not initialized. Push notifications disabled.');
        return null;
      }

      const message = {
        notification: {
          title,
          body
        },
        data,
        token
      };

      const response = await admin.messaging().send(message);
      console.log('Successfully sent notification:', response);
      return response;
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  async sendMultipleNotifications(tokens, title, body, data = {}) {
    try {
      if (!admin.apps.length) {
        console.warn('Firebase Admin not initialized. Push notifications disabled.');
        return null;
      }

      const message = {
        notification: {
          title,
          body
        },
        data,
        tokens
      };

      const response = await admin.messaging().sendMulticast(message);
      console.log('Successfully sent notifications:', response);
      return response;
    } catch (error) {
      console.error('Error sending notifications:', error);
      throw error;
    }
  }

  async sendTopicNotification(topic, title, body, data = {}) {
    try {
      if (!admin.apps.length) {
        console.warn('Firebase Admin not initialized. Push notifications disabled.');
        return null;
      }

      const message = {
        notification: {
          title,
          body
        },
        data,
        topic
      };

      const response = await admin.messaging().send(message);
      console.log('Successfully sent topic notification:', response);
      return response;
    } catch (error) {
      console.error('Error sending topic notification:', error);
      throw error;
    }
  }
}

module.exports = new PushNotificationService(); 