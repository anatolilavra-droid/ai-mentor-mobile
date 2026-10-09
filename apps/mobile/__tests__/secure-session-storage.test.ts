import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { secureSessionStorage } from '@/lib/supabase/secure-session-storage';

const KEY = 'sb-test-auth-token';
const SESSION = JSON.stringify({ access_token: 'access', refresh_token: 'refresh' });

describe('secureSessionStorage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await secureSessionStorage.removeItem(KEY);
  });

  it('stores only ciphertext in AsyncStorage and reads the session back', async () => {
    await secureSessionStorage.setItem(KEY, SESSION);

    const stored = await AsyncStorage.getItem(KEY);
    expect(stored).not.toBeNull();
    expect(stored).not.toContain('refresh');
    expect(await SecureStore.getItemAsync(KEY)).toMatch(/^[0-9a-f]{64}$/);

    expect(await secureSessionStorage.getItem(KEY)).toBe(SESSION);
  });

  it('uses a new key for every write', async () => {
    await secureSessionStorage.setItem(KEY, SESSION);
    const firstKey = await SecureStore.getItemAsync(KEY);
    await secureSessionStorage.setItem(KEY, SESSION);
    expect(await SecureStore.getItemAsync(KEY)).not.toBe(firstKey);
  });

  it('returns null and cleans up when the key is missing (e.g. restored backup)', async () => {
    await secureSessionStorage.setItem(KEY, SESSION);
    await SecureStore.deleteItemAsync(KEY);

    expect(await secureSessionStorage.getItem(KEY)).toBeNull();
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
  });

  it('returns null and cleans up when data cannot be decrypted', async () => {
    await secureSessionStorage.setItem(KEY, SESSION);
    await SecureStore.setItemAsync(KEY, 'ab'.repeat(32)); // wrong key

    expect(await secureSessionStorage.getItem(KEY)).toBeNull();
    expect(await AsyncStorage.getItem(KEY)).toBeNull();
    expect(await SecureStore.getItemAsync(KEY)).toBeNull();
  });

  it('removes both parts on sign out', async () => {
    await secureSessionStorage.setItem(KEY, SESSION);
    await secureSessionStorage.removeItem(KEY);
    expect(await secureSessionStorage.getItem(KEY)).toBeNull();
  });
});
