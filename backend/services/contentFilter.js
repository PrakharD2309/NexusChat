const Filter = require('bad-words');
const natural = require('natural');
const tokenizer = new natural.WordTokenizer();
const classifier = new natural.BayesClassifier();

class ContentFilterService {
  constructor() {
    this.filter = new Filter();
    this.classifier = classifier;
    this.initializeClassifier();
  }

  // Initialize the classifier with training data
  initializeClassifier() {
    // Add training data for different categories
    this.classifier.addDocument('bad word 1', 'inappropriate');
    this.classifier.addDocument('bad word 2', 'inappropriate');
    this.classifier.addDocument('normal message', 'appropriate');
    this.classifier.addDocument('hello world', 'appropriate');
    this.classifier.train();
  }

  // Check text for inappropriate content
  async checkText(text) {
    const result = {
      isAppropriate: true,
      issues: [],
      score: 0
    };

    // Check for profanity
    if (this.filter.isProfane(text)) {
      result.isAppropriate = false;
      result.issues.push('profanity');
      result.score += 0.5;
    }

    // Check for inappropriate content using classifier
    const classification = this.classifier.classify(text);
    if (classification === 'inappropriate') {
      result.isAppropriate = false;
      result.issues.push('inappropriate_content');
      result.score += 0.3;
    }

    // Check for spam patterns
    if (this.isSpam(text)) {
      result.isAppropriate = false;
      result.issues.push('spam');
      result.score += 0.2;
    }

    // Check for personal information
    if (this.containsPersonalInfo(text)) {
      result.isAppropriate = false;
      result.issues.push('personal_information');
      result.score += 0.4;
    }

    return result;
  }

  // Check if text contains spam patterns
  isSpam(text) {
    const spamPatterns = [
      /(.)\1{4,}/, // Repeated characters
      /[A-Z]{5,}/, // All caps
      /(.)\1{2,}/, // Repeated words
      /(https?:\/\/[^\s]+)/, // URLs
      /(\d{10,})/ // Long numbers
    ];

    return spamPatterns.some(pattern => pattern.test(text));
  }

  // Check if text contains personal information
  containsPersonalInfo(text) {
    const personalInfoPatterns = [
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone number
      /\b\d{16}\b/, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/ // Social security
    ];

    return personalInfoPatterns.some(pattern => pattern.test(text));
  }

  // Filter text by replacing inappropriate content
  filterText(text) {
    return this.filter.clean(text);
  }

  // Add new training data to the classifier
  addTrainingData(text, category) {
    this.classifier.addDocument(text, category);
    this.classifier.train();
  }

  // Get filter statistics
  getStats() {
    return {
      totalWords: this.filter.wordlist.length,
      categories: this.classifier.getLabels(),
      lastTraining: new Date()
    };
  }
}

module.exports = new ContentFilterService(); 