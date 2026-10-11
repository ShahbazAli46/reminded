import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';
import { x25519 } from '@noble/curves/ed25519';
import { gcm } from '@noble/ciphers/webcrypto';
import { bytesToHex, hexToBytes, utf8ToBytes, bytesToUtf8 } from '@noble/ciphers/utils';
import { Platform } from 'react-native';

const randomBytes = (length: number): Uint8Array => Crypto.getRandomBytes(length);

const PRIVATE_KEY_STORAGE_KEY = 'reminder_e2ee_private_key_v1';
const PUBLIC_KEY_STORAGE_KEY = 'reminder_e2ee_public_key_v1';

// Web localStorage fallback for web platform development
const webStorage = {
  getItem: (k: string) => (typeof localStorage !== 'undefined' ? localStorage.getItem(k) : null),
  setItem: (k: string, v: string) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(k, v);
  },
};

export class CryptoService {
  private static cachedPrivateKey: Uint8Array | null = null;
  private static cachedPublicKey: string | null = null;

  /**
   * Initializes or loads the device's Curve25519 Identity Keypair
   */
  static async getOrCreateIdentityKeypair(): Promise<{ publicKey: string; privateKey: Uint8Array }> {
    if (this.cachedPublicKey && this.cachedPrivateKey) {
      return { publicKey: this.cachedPublicKey, privateKey: this.cachedPrivateKey };
    }

    try {
      let storedPrivateKeyHex: string | null = null;

      if (Platform.OS === 'web') {
        storedPrivateKeyHex = webStorage.getItem(PRIVATE_KEY_STORAGE_KEY);
      } else {
        storedPrivateKeyHex = await SecureStore.getItemAsync(PRIVATE_KEY_STORAGE_KEY);
      }

      if (storedPrivateKeyHex) {
        const privateKey = hexToBytes(storedPrivateKeyHex);
        const publicKey = bytesToHex(x25519.getPublicKey(privateKey));
        this.cachedPrivateKey = privateKey;
        this.cachedPublicKey = publicKey;
        return { publicKey, privateKey };
      }
    } catch (e) {
      console.warn('Could not read existing secure keys, generating fresh keypair...');
    }

    // Generate fresh 32-byte private key
    const privateKey = x25519.utils.randomPrivateKey();
    const publicKeyBytes = x25519.getPublicKey(privateKey);
    const publicKeyHex = bytesToHex(publicKeyBytes);
    const privateKeyHex = bytesToHex(privateKey);

    // Save in hardware secure store
    try {
      if (Platform.OS === 'web') {
        webStorage.setItem(PRIVATE_KEY_STORAGE_KEY, privateKeyHex);
        webStorage.setItem(PUBLIC_KEY_STORAGE_KEY, publicKeyHex);
      } else {
        await SecureStore.setItemAsync(PRIVATE_KEY_STORAGE_KEY, privateKeyHex);
        await SecureStore.setItemAsync(PUBLIC_KEY_STORAGE_KEY, publicKeyHex);
      }
    } catch (e) {
      console.warn('Secure store write warning:', e);
    }

    this.cachedPrivateKey = privateKey;
    this.cachedPublicKey = publicKeyHex;

    return { publicKey: publicKeyHex, privateKey };
  }

  /**
   * Encrypts plaintext string using AES-GCM-256 with a given 32-byte key
   */
  static async encryptText(
    plaintext: string,
    keyBytes: Uint8Array
  ): Promise<{ ciphertext: string; iv: string }> {
    const iv = randomBytes(12); // standard 96-bit IV for AES-GCM
    const cipher = gcm(keyBytes, iv);
    const plaintextBytes = utf8ToBytes(plaintext);
    const ciphertextBytes = await cipher.encrypt(plaintextBytes);

    return {
      ciphertext: bytesToHex(ciphertextBytes),
      iv: bytesToHex(iv),
    };
  }

  /**
   * Decrypts ciphertext string using AES-GCM-256 with a given 32-byte key
   */
  static async decryptText(
    ciphertextHex: string,
    ivHex: string,
    keyBytes: Uint8Array
  ): Promise<string> {
    const iv = hexToBytes(ivHex);
    const ciphertextBytes = hexToBytes(ciphertextHex);
    const cipher = gcm(keyBytes, iv);
    const decryptedBytes = await cipher.decrypt(ciphertextBytes);

    return bytesToUtf8(decryptedBytes);
  }

  /**
   * Generates a random 32-byte Task Key
   */
  static generateTaskKey(): Uint8Array {
    return randomBytes(32);
  }

  /**
   * Converts byte array to hex string
   */
  static toHex(bytes: Uint8Array): string {
    return bytesToHex(bytes);
  }

  /**
   * Converts hex string to byte array
   */
  static fromHex(hex: string): Uint8Array {
    return hexToBytes(hex);
  }
}
