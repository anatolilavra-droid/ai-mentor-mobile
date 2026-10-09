import AsyncStorage from '@react-native-async-storage/async-storage';
import * as aesjs from 'aes-js';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Storage adapter for the Supabase session on Android/iOS.
 *
 * The session (access + refresh token, a few KB of JSON) is encrypted with
 * AES-256-CTR and kept in AsyncStorage. A fresh random key is generated on
 * every write and kept in SecureStore (Android Keystore), which is meant
 * for small values. If anything cannot be decrypted (e.g. data restored on
 * a new device without its key), the entry is cleared and the user simply
 * signs in again.
 */
export type SessionStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

const KEY_BYTES = 32;

function encrypt(value: string): { cipherHex: string; keyHex: string } {
  const key = Crypto.getRandomBytes(KEY_BYTES);
  const cipher = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(1));
  const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
  return {
    cipherHex: aesjs.utils.hex.fromBytes(encrypted),
    keyHex: aesjs.utils.hex.fromBytes(key),
  };
}

function decrypt(cipherHex: string, keyHex: string): string {
  const cipher = new aesjs.ModeOfOperation.ctr(
    aesjs.utils.hex.toBytes(keyHex),
    new aesjs.Counter(1),
  );
  return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(cipherHex)));
}

export const secureSessionStorage: SessionStorage = {
  async getItem(key) {
    const [cipherHex, keyHex] = await Promise.all([
      AsyncStorage.getItem(key),
      SecureStore.getItemAsync(key),
    ]);
    if (!cipherHex || !keyHex) {
      if (cipherHex || keyHex) await secureSessionStorage.removeItem(key);
      return null;
    }
    try {
      const value = decrypt(cipherHex, keyHex);
      JSON.parse(value); // Supabase stores JSON; anything else means corruption.
      return value;
    } catch {
      await secureSessionStorage.removeItem(key);
      return null;
    }
  },

  async setItem(key, value) {
    const { cipherHex, keyHex } = encrypt(value);
    await SecureStore.setItemAsync(key, keyHex);
    await AsyncStorage.setItem(key, cipherHex);
  },

  async removeItem(key) {
    await Promise.all([AsyncStorage.removeItem(key), SecureStore.deleteItemAsync(key)]);
  },
};

/** Browser storage for the web preview, where SecureStore does not exist. */
const webStorage: SessionStorage = {
  getItem: async (key) => globalThis.localStorage?.getItem(key) ?? null,
  setItem: async (key, value) => globalThis.localStorage?.setItem(key, value),
  removeItem: async (key) => globalThis.localStorage?.removeItem(key),
};

export const sessionStorage: SessionStorage =
  Platform.OS === 'web' ? webStorage : secureSessionStorage;
