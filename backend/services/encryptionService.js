const crypto = require('crypto');

class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32;
    this.ivLength = 16;
    this.saltLength = 64;
    this.tagLength = 16;
  }

  generateKey() {
    return crypto.randomBytes(this.keyLength);
  }

  generateIV() {
    return crypto.randomBytes(this.ivLength);
  }

  generateSalt() {
    return crypto.randomBytes(this.saltLength);
  }

  deriveKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha512');
  }

  encrypt(text, key) {
    const iv = this.generateIV();
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  decrypt(encryptedData, key) {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      key,
      Buffer.from(encryptedData.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  generateKeyPair() {
    return crypto.generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });
  }

  signMessage(message, privateKey) {
    const sign = crypto.createSign('SHA256');
    sign.update(message);
    return sign.sign(privateKey, 'hex');
  }

  verifySignature(message, signature, publicKey) {
    const verify = crypto.createVerify('SHA256');
    verify.update(message);
    return verify.verify(publicKey, signature, 'hex');
  }

  hashPassword(password) {
    const salt = this.generateSalt();
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512');
    return {
      hash: hash.toString('hex'),
      salt: salt.toString('hex')
    };
  }

  verifyPassword(password, hash, salt) {
    const verifyHash = crypto.pbkdf2Sync(
      password,
      Buffer.from(salt, 'hex'),
      100000,
      64,
      'sha512'
    );
    return verifyHash.toString('hex') === hash;
  }
}

module.exports = new EncryptionService(); 