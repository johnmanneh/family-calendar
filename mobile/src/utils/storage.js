import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

// On iOS/Android: SecureStore (hardware-backed keychain)
// On web:         localStorage (browser, for development preview only)
//
// The Platform.OS check runs at import time so there is no runtime branch cost.

const storage = {
  getItem: (key) => {
    if (Platform.OS === 'web') return Promise.resolve(localStorage.getItem(key));
    return SecureStore.getItemAsync(key);
  },

  setItem: (key, value) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return Promise.resolve();
    }
    return SecureStore.setItemAsync(key, value);
  },

  deleteItem: (key) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return Promise.resolve();
    }
    return SecureStore.deleteItemAsync(key);
  },
};

export default storage;
