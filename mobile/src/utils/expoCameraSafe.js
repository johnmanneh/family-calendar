import { requireOptionalNativeModule } from 'expo-modules-core';

export function hasExpoCamera() {
  try {
    return !!requireOptionalNativeModule('ExpoCamera');
  } catch {
    return false;
  }
}

export function loadExpoCamera() {
  if (!hasExpoCamera()) return null;
  return require('expo-camera');
}
