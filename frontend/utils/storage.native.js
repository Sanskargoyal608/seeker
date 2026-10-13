// Native: Use expo-secure-store (encrypted storage)
import * as SecureStore from 'expo-secure-store';

export const storage = {
  getItemAsync: SecureStore.getItemAsync,
  setItemAsync: SecureStore.setItemAsync,
  deleteItemAsync: SecureStore.deleteItemAsync,
};
