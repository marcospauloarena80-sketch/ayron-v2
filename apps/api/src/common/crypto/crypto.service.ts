import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const ALGO = 'aes-256-cbc';
const IV_LENGTH = 16;
const SEPARATOR = ':';

@Injectable()
export class CryptoService implements OnModuleInit {
  private readonly logger = new Logger(CryptoService.name);
  private key!: Buffer;
  private enabled = false;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    const raw = this.config.get<string>('APP_FIELD_ENCRYPTION_KEY');
    if (!raw) {
      this.logger.warn('[CryptoService] APP_FIELD_ENCRYPTION_KEY not set — field encryption DISABLED');
      return;
    }
    this.key = Buffer.from(raw, 'hex').slice(0, 32);
    if (this.key.length !== 32) {
      this.logger.warn('[CryptoService] Key must be 64 hex chars (32 bytes). Encryption DISABLED.');
      return;
    }
    this.enabled = true;
    this.logger.log('[CryptoService] Field encryption ENABLED');
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  encrypt(plaintext: string): string {
    if (!this.enabled || !plaintext) return plaintext;
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGO, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return iv.toString('hex') + SEPARATOR + encrypted.toString('hex');
  }

  decrypt(ciphertext: string): string {
    if (!this.enabled || !ciphertext) return ciphertext;
    if (!ciphertext.includes(SEPARATOR)) return ciphertext;
    const [ivHex, encHex] = ciphertext.split(SEPARATOR);
    const iv = Buffer.from(ivHex, 'hex');
    const enc = Buffer.from(encHex, 'hex');
    const decipher = createDecipheriv(ALGO, this.key, iv);
    return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
  }

  hashForSearch(plaintext: string): string {
    if (!plaintext) return '';
    const normalized = plaintext.replace(/\D/g, '');
    return createHash('sha256').update(normalized).digest('hex');
  }
}
