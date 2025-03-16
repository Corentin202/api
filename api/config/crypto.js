import { randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export function generateUuid() {
    return uuidv4();
}

export function encryptPassword(password, key) {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + encrypted;
}

export function decryptPassword(encrypted, key) {
    const iv = Buffer.from(encrypted.slice(0, 32), 'hex');
    const encryptedData = encrypted.slice(32);
    const decipher = createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), iv);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

export function hashPassword(password, salt = null) {
    const newSalt = salt || randomBytes(16).toString('hex');
    const hash = pbkdf2Sync(password, newSalt, 1000, 64, 'sha512').toString('hex');
    return { hash, newSalt };
}

export function verifyPassword(storedHash, storedSalt, inputPassword) {
    const { hash } = hashPassword(inputPassword, storedSalt);
    return hash === storedHash;
}

