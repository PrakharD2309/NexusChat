// Simple profanity filter implementation
const profanityList = [
  'bad', 'inappropriate', 'offensive', // Add more words as needed
];

class ContentFilter {
  constructor() {
    this.profanityList = new Set(profanityList);
  }

  isClean(text) {
    if (!text) return true;
    
    const words = text.toLowerCase().split(/\s+/);
    return !words.some(word => this.profanityList.has(word));
  }

  filter(text) {
    if (!text) return text;
    
    const words = text.split(/\s+/);
    return words.map(word => 
      this.profanityList.has(word.toLowerCase()) ? '*'.repeat(word.length) : word
    ).join(' ');
  }
}

module.exports = new ContentFilter(); 