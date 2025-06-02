const User = require('../models/User');
const Settings = require('../models/Settings');

class AccessibilityService {
  // Get user's accessibility settings
  async getAccessibilitySettings(userId) {
    const settings = await Settings.findOne({ user: userId });
    return settings?.accessibility || this.getDefaultSettings();
  }

  // Update user's accessibility settings
  async updateAccessibilitySettings(userId, settings) {
    const userSettings = await Settings.findOneAndUpdate(
      { user: userId },
      { $set: { accessibility: settings } },
      { upsert: true, new: true }
    );
    return userSettings.accessibility;
  }

  // Get default accessibility settings
  getDefaultSettings() {
    return {
      screenReader: {
        enabled: false,
        voice: 'default',
        speed: 1.0
      },
      highContrast: {
        enabled: false,
        theme: 'default'
      },
      keyboardNavigation: {
        enabled: true,
        shortcuts: this.getDefaultShortcuts()
      },
      fontSize: {
        base: 16,
        scale: 1.0
      },
      colorBlindness: {
        enabled: false,
        type: 'none'
      },
      motionReduction: {
        enabled: false,
        reduceAnimations: false
      },
      soundEffects: {
        enabled: true,
        volume: 0.5
      }
    };
  }

  // Get default keyboard shortcuts
  getDefaultShortcuts() {
    return {
      newMessage: 'Ctrl+N',
      search: 'Ctrl+F',
      settings: 'Ctrl+,',
      help: 'F1',
      nextChat: 'Ctrl+Tab',
      previousChat: 'Ctrl+Shift+Tab',
      sendMessage: 'Enter',
      markAsRead: 'Ctrl+Enter',
      muteChat: 'Ctrl+M',
      archiveChat: 'Ctrl+E',
      deleteChat: 'Ctrl+Delete'
    };
  }

  // Generate ARIA labels for UI elements
  generateAriaLabels(element) {
    const labels = {
      chatList: 'Chat list',
      messageInput: 'Message input field',
      sendButton: 'Send message',
      attachmentButton: 'Attach file',
      emojiButton: 'Add emoji',
      searchInput: 'Search messages',
      settingsButton: 'Open settings',
      profileButton: 'Open profile',
      groupButton: 'Create new group',
      callButton: 'Start call',
      videoButton: 'Start video call',
      screenShareButton: 'Share screen',
      muteButton: 'Mute microphone',
      cameraButton: 'Toggle camera',
      endCallButton: 'End call'
    };

    return labels[element] || element;
  }

  // Generate high contrast theme
  generateHighContrastTheme(type) {
    const themes = {
      dark: {
        background: '#000000',
        text: '#FFFFFF',
        primary: '#FFFF00',
        secondary: '#00FFFF',
        accent: '#FF00FF',
        error: '#FF0000',
        success: '#00FF00',
        warning: '#FFFF00'
      },
      light: {
        background: '#FFFFFF',
        text: '#000000',
        primary: '#0000FF',
        secondary: '#008000',
        accent: '#800080',
        error: '#FF0000',
        success: '#008000',
        warning: '#FFA500'
      }
    };

    return themes[type] || themes.light;
  }

  // Generate color blind friendly theme
  generateColorBlindTheme(type) {
    const themes = {
      protanopia: {
        primary: '#0077BB',
        secondary: '#EE7733',
        accent: '#009988',
        error: '#CC3311',
        success: '#009988',
        warning: '#EE7733'
      },
      deuteranopia: {
        primary: '#0077BB',
        secondary: '#EE7733',
        accent: '#009988',
        error: '#CC3311',
        success: '#009988',
        warning: '#EE7733'
      },
      tritanopia: {
        primary: '#0077BB',
        secondary: '#EE7733',
        accent: '#009988',
        error: '#CC3311',
        success: '#009988',
        warning: '#EE7733'
      }
    };

    return themes[type] || themes.protanopia;
  }

  // Generate keyboard navigation focus styles
  generateFocusStyles() {
    return {
      outline: '2px solid #0077BB',
      outlineOffset: '2px',
      borderRadius: '4px',
      transition: 'outline 0.2s ease-in-out'
    };
  }

  // Generate screen reader text
  generateScreenReaderText(element, context) {
    const templates = {
      message: (message) => `${message.sender} says: ${message.content}`,
      notification: (notification) => `New notification: ${notification.content}`,
      call: (call) => `Incoming call from ${call.caller}`,
      group: (group) => `Group: ${group.name} with ${group.memberCount} members`,
      file: (file) => `File: ${file.name}, ${file.size} bytes`,
      emoji: (emoji) => `Emoji: ${emoji.name}`,
      button: (button) => `${button.label} button`,
      link: (link) => `${link.text} link`
    };

    return templates[element]?.(context) || context;
  }

  // Generate motion reduced styles
  generateMotionReducedStyles() {
    return {
      transition: 'none',
      animation: 'none',
      transform: 'none'
    };
  }

  // Generate sound effect settings
  generateSoundEffectSettings() {
    return {
      message: {
        enabled: true,
        volume: 0.5,
        sound: 'message.mp3'
      },
      notification: {
        enabled: true,
        volume: 0.5,
        sound: 'notification.mp3'
      },
      call: {
        enabled: true,
        volume: 0.5,
        sound: 'call.mp3'
      },
      error: {
        enabled: true,
        volume: 0.5,
        sound: 'error.mp3'
      }
    };
  }

  // Validate accessibility settings
  validateSettings(settings) {
    const required = ['screenReader', 'highContrast', 'keyboardNavigation', 'fontSize'];
    const missing = required.filter(key => !settings[key]);

    if (missing.length > 0) {
      throw new Error(`Missing required settings: ${missing.join(', ')}`);
    }

    return true;
  }

  // Reset accessibility settings to default
  async resetSettings(userId) {
    const defaultSettings = this.getDefaultSettings();
    return this.updateAccessibilitySettings(userId, defaultSettings);
  }
}

module.exports = new AccessibilityService(); 