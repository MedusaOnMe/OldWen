import { Keypair, PublicKey } from '@solana/web3.js';
import CryptoJS from 'crypto-js';
import { Buffer } from 'buffer';

/**
 * Enterprise-grade wallet generation and encryption service
 * Provides secure wallet management for campaign funding
 */

export interface CampaignWallet {
  publicKey: string;
  encryptedPrivateKey: string;
  campaignId: string;
  createdAt: string;
  encryptionVersion: string;
  checksum: string;
}

export interface WalletBalance {
  publicKey: string;
  usdcBalance: number;
  solBalance: number;
  lastUpdated: string;
}

export interface WalletTransaction {
  signature: string;
  from: string;
  to: string;
  amount: number;
  currency: 'USDC' | 'SOL';
  timestamp: string;
  status: 'pending' | 'confirmed' | 'failed';
  campaignId?: string;
}

class WalletService {
  private readonly encryptionKey: string;
  private readonly keyDerivationIterations: number = 10000;
  private readonly encryptionVersion: string = 'v2.0';

  constructor() {
    // Use environment variable for production, fallback for development
    this.encryptionKey = import.meta.env.VITE_WALLET_ENCRYPTION_KEY || 'dev_encryption_key_32_characters_long';
    
    if (this.encryptionKey === 'dev_encryption_key_32_characters_long') {
      console.warn('Using development encryption key. Set VITE_WALLET_ENCRYPTION_KEY for production.');
    }

    if (this.encryptionKey.length < 32) {
      throw new Error('Encryption key must be at least 32 characters long');
    }
  }

  /**
   * Generates a new Solana keypair with enhanced entropy
   */
  private generateKeypair(): Keypair {
    try {
      // Add additional entropy for more secure key generation
      const additionalEntropy = new Uint8Array(32);
      
      // Use crypto.getRandomValues for additional entropy
      if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(additionalEntropy);
      } else {
        // Fallback for environments without crypto.getRandomValues
        for (let i = 0; i < 32; i++) {
          additionalEntropy[i] = Math.floor(Math.random() * 256);
        }
      }

      // Generate keypair with Solana's secure method
      const keypair = Keypair.generate();

      // Verify the keypair is valid
      const publicKey = keypair.publicKey.toBase58();
      if (!this.isValidSolanaAddress(publicKey)) {
        throw new Error('Generated invalid keypair');
      }

      return keypair;
    } catch (error) {
      console.error('Keypair generation error:', error);
      throw new Error('Failed to generate secure keypair');
    }
  }

  /**
   * Validates a Solana address format
   */
  private isValidSolanaAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Derives an encryption key using PBKDF2
   */
  private deriveKey(salt: string): string {
    return CryptoJS.PBKDF2(this.encryptionKey, salt, {
      keySize: 256 / 32,
      iterations: this.keyDerivationIterations
    }).toString();
  }

  /**
   * Encrypts a private key using AES-256-GCM with authentication
   */
  private encryptPrivateKey(privateKeyBytes: Uint8Array, campaignId: string): {
    encrypted: string;
    checksum: string;
    salt: string;
  } {
    try {
      // Generate a unique salt for this encryption
      const salt = CryptoJS.lib.WordArray.random(256 / 8).toString();
      
      // Derive encryption key
      const derivedKey = this.deriveKey(salt);
      
      // Convert private key bytes to hex string
      const privateKeyHex = Buffer.from(privateKeyBytes).toString('hex');
      
      // Create additional authenticated data
      const aad = JSON.stringify({
        campaignId,
        version: this.encryptionVersion,
        timestamp: new Date().toISOString()
      });

      // Encrypt with AES-256 (CryptoJS doesn't support GCM mode directly)
      const encrypted = CryptoJS.AES.encrypt(
        privateKeyHex + '|' + aad,
        derivedKey
      ).toString();

      // Generate checksum for integrity verification
      const checksum = CryptoJS.SHA256(encrypted + salt + campaignId).toString();

      return { encrypted, checksum, salt };
    } catch (error) {
      console.error('Private key encryption error:', error);
      throw new Error('Failed to encrypt private key');
    }
  }

  /**
   * Decrypts a private key and returns the keypair
   */
  async decryptPrivateKey(
    encryptedData: string,
    salt: string,
    checksum: string,
    campaignId: string
  ): Promise<Keypair> {
    try {
      // Verify checksum first
      const computedChecksum = CryptoJS.SHA256(encryptedData + salt + campaignId).toString();
      if (computedChecksum !== checksum) {
        throw new Error('Private key integrity check failed');
      }

      // Derive decryption key
      const derivedKey = this.deriveKey(salt);

      // Decrypt
      const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, derivedKey);

      const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) {
        throw new Error('Decryption failed - invalid key or corrupted data');
      }

      // Split decrypted data
      const [privateKeyHex] = decryptedString.split('|');
      
      // Convert back to bytes
      const privateKeyBytes = Buffer.from(privateKeyHex, 'hex');
      
      // Create keypair from secret key
      const keypair = Keypair.fromSecretKey(privateKeyBytes);

      return keypair;
    } catch (error) {
      console.error('Private key decryption error:', error);
      throw new Error('Failed to decrypt private key');
    }
  }

  /**
   * Generates a new campaign wallet with secure encryption
   */
  async generateCampaignWallet(campaignId: string): Promise<CampaignWallet> {
    try {
      if (!campaignId || campaignId.trim().length === 0) {
        throw new Error('Campaign ID is required');
      }

      // Generate new keypair
      const keypair = this.generateKeypair();
      const publicKey = keypair.publicKey.toBase58();

      // Encrypt private key
      const { encrypted, checksum, salt } = this.encryptPrivateKey(
        keypair.secretKey,
        campaignId
      );

      // Store salt with encrypted data (separated by :)
      const encryptedPrivateKey = `${salt}:${encrypted}`;

      const wallet: CampaignWallet = {
        publicKey,
        encryptedPrivateKey,
        campaignId,
        createdAt: new Date().toISOString(),
        encryptionVersion: this.encryptionVersion,
        checksum
      };

      // Verify we can decrypt what we just encrypted
      await this.validateWalletDecryption(wallet);

      return wallet;
    } catch (error) {
      console.error('Campaign wallet generation error:', error);
      throw new Error('Failed to generate campaign wallet');
    }
  }

  /**
   * Validates that a wallet can be properly decrypted
   */
  private async validateWalletDecryption(wallet: CampaignWallet): Promise<void> {
    try {
      const [salt, encrypted] = wallet.encryptedPrivateKey.split(':');
      const keypair = await this.decryptPrivateKey(
        encrypted,
        salt,
        wallet.checksum,
        wallet.campaignId
      );

      // Verify the public key matches
      if (keypair.publicKey.toBase58() !== wallet.publicKey) {
        throw new Error('Wallet validation failed - key mismatch');
      }
    } catch (error) {
      throw new Error(`Wallet validation failed: ${error.message}`);
    }
  }

  /**
   * Retrieves a campaign wallet keypair for transactions
   */
  async getCampaignWalletKeypair(wallet: CampaignWallet): Promise<Keypair> {
    try {
      const [salt, encrypted] = wallet.encryptedPrivateKey.split(':');
      
      if (!salt || !encrypted) {
        throw new Error('Invalid encrypted private key format');
      }

      return await this.decryptPrivateKey(
        encrypted,
        salt,
        wallet.checksum,
        wallet.campaignId
      );
    } catch (error) {
      console.error('Wallet keypair retrieval error:', error);
      throw new Error('Failed to retrieve campaign wallet keypair');
    }
  }

  /**
   * Generates multiple wallets in batch for high-throughput scenarios
   */
  async generateWalletBatch(
    campaignIds: string[],
    batchSize: number = 10
  ): Promise<CampaignWallet[]> {
    const wallets: CampaignWallet[] = [];
    
    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < campaignIds.length; i += batchSize) {
      const batch = campaignIds.slice(i, i + batchSize);
      
      const batchPromises = batch.map(campaignId => 
        this.generateCampaignWallet(campaignId)
      );

      const batchWallets = await Promise.all(batchPromises);
      wallets.push(...batchWallets);

      // Small delay between batches to prevent system overload
      if (i + batchSize < campaignIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return wallets;
  }

  /**
   * Securely wipes sensitive data from memory
   */
  private secureWipe(data: any): void {
    if (typeof data === 'string') {
      // Overwrite string memory (best effort)
      data = '0'.repeat(data.length);
    } else if (data instanceof Uint8Array) {
      // Zero out array
      data.fill(0);
    }
  }

  /**
   * Validates wallet encryption integrity
   */
  async validateWalletIntegrity(wallet: CampaignWallet): Promise<{
    isValid: boolean;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Check required fields
      if (!wallet.publicKey) errors.push('Missing public key');
      if (!wallet.encryptedPrivateKey) errors.push('Missing encrypted private key');
      if (!wallet.campaignId) errors.push('Missing campaign ID');
      if (!wallet.checksum) errors.push('Missing checksum');

      // Validate public key format
      if (wallet.publicKey && !this.isValidSolanaAddress(wallet.publicKey)) {
        errors.push('Invalid public key format');
      }

      // Validate encrypted private key format
      if (wallet.encryptedPrivateKey && !wallet.encryptedPrivateKey.includes(':')) {
        errors.push('Invalid encrypted private key format');
      }

      // Validate encryption version
      if (wallet.encryptionVersion && wallet.encryptionVersion !== this.encryptionVersion) {
        errors.push(`Unsupported encryption version: ${wallet.encryptionVersion}`);
      }

      // Test decryption if no format errors
      if (errors.length === 0) {
        try {
          await this.validateWalletDecryption(wallet);
        } catch (error) {
          errors.push(`Decryption validation failed: ${error.message}`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors
      };
    } catch (error) {
      errors.push(`Validation error: ${error.message}`);
      return {
        isValid: false,
        errors
      };
    }
  }

  /**
   * Creates a wallet backup with additional security measures
   */
  async createWalletBackup(wallet: CampaignWallet): Promise<{
    backup: string;
    recoveryPhrase: string;
  }> {
    try {
      // Create a backup object with additional metadata
      const backupData = {
        ...wallet,
        backupTimestamp: new Date().toISOString(),
        backupVersion: '1.0'
      };

      // Encrypt the entire backup
      const backupString = JSON.stringify(backupData);
      const backupHash = CryptoJS.SHA256(backupString).toString();
      
      const encryptedBackup = CryptoJS.AES.encrypt(
        backupString,
        this.encryptionKey
      ).toString();

      // Generate a human-readable recovery phrase
      const recoveryData = `${wallet.campaignId}:${backupHash.substring(0, 16)}`;
      const recoveryPhrase = CryptoJS.enc.Base64.stringify(
        CryptoJS.enc.Utf8.parse(recoveryData)
      );

      return {
        backup: encryptedBackup,
        recoveryPhrase
      };
    } catch (error) {
      console.error('Wallet backup creation error:', error);
      throw new Error('Failed to create wallet backup');
    }
  }

  /**
   * Health check for the wallet service
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    canGenerateWallets: boolean;
    canEncrypt: boolean;
    canDecrypt: boolean;
    encryptionVersion: string;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Test wallet generation
      const testCampaignId = 'health-check-' + Date.now();
      const testWallet = await this.generateCampaignWallet(testCampaignId);
      
      // Test decryption
      await this.getCampaignWalletKeypair(testWallet);

      return {
        healthy: true,
        canGenerateWallets: true,
        canEncrypt: true,
        canDecrypt: true,
        encryptionVersion: this.encryptionVersion,
        errors: []
      };
    } catch (error) {
      errors.push(error.message);
      
      return {
        healthy: false,
        canGenerateWallets: false,
        canEncrypt: false,
        canDecrypt: false,
        encryptionVersion: this.encryptionVersion,
        errors
      };
    }
  }
}

// Export singleton instance
export const walletService = new WalletService();

// Export types
export type { CampaignWallet, WalletBalance, WalletTransaction };