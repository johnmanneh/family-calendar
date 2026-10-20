const fs = require('fs');
const path = require('path');
const vm = require('vm');
const babel = require('@babel/core');

// Execute the real registration module, replacing only native/network IO.
// This avoids CRA's react-native -> react-native-web resolver mapping.
const source = fs.readFileSync(path.resolve(__dirname, '../../../mobile/src/utils/registerPushToken.js'), 'utf8');
const { code } = babel.transformSync(source, {
  configFile: false, babelrc: false,
  plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')],
});
let registerPushToken, Constants, Platform, Notifications, API;

beforeEach(() => {
  Constants = { appOwnership: 'standalone', expoConfig: { extra: { eas: { projectId: 'test-project' } } } };
  Platform = { OS: 'android' };
  Notifications = {
    AndroidImportance: { MAX: 5 },
    setNotificationHandler: jest.fn(),
    setNotificationChannelAsync: jest.fn().mockResolvedValue(undefined),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[test-device]' }),
  };
  API = { put: jest.fn().mockResolvedValue({}) };
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require: (id) => {
      if (id === 'expo-constants') return Constants;
      if (id === 'react-native') return { Platform };
      if (id === 'expo-notifications') return Notifications;
      if (id === '../api/axios') return API;
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  registerPushToken = module.exports.registerPushToken;
});

test('Android channels omit custom sound filenames to use the native default sound', async () => {
  await registerPushToken();

  expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledTimes(2);
  for (const id of ['default', 'urgent']) {
    const call = Notifications.setNotificationChannelAsync.mock.calls.find(([channel]) => channel === id);
    expect(call).toBeDefined();
    expect(call[1]).not.toHaveProperty('sound');
    expect(call[1].importance).toBe(Notifications.AndroidImportance.MAX);
  }
  expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('urgent', expect.objectContaining({
    vibrationPattern: [0, 600, 200, 600, 200, 600],
  }));
  expect(API.put).toHaveBeenCalledWith('/auth/push-token', { push_token: 'ExponentPushToken[test-device]' });
});

test('foreground notification handler still requests sound playback', async () => {
  await registerPushToken();
  const handler = Notifications.setNotificationHandler.mock.calls[0][0];
  await expect(handler.handleNotification()).resolves.toEqual(expect.objectContaining({ shouldPlaySound: true }));
});

test('iOS registration does not configure Android channels', async () => {
  Platform.OS = 'ios';
  await registerPushToken();
  expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
  expect(API.put).toHaveBeenCalledTimes(1);
});

test('registration durably records this device token before sending it', async () => {
  const onToken = jest.fn(async () => { expect(API.put).not.toHaveBeenCalled(); });
  await registerPushToken({ onToken });
  expect(onToken).toHaveBeenCalledWith('ExponentPushToken[test-device]');
  expect(API.put).toHaveBeenCalledTimes(1);
});

test('failed secure bookkeeping never sends an untrackable binding', async () => {
  const onToken = jest.fn().mockRejectedValue(new Error('storage unavailable'));
  await registerPushToken({ onToken });
  expect(API.put).not.toHaveBeenCalled();
});

test('logout while native token acquisition is pending cancels registration', async () => {
  let finish;
  Notifications.getExpoPushTokenAsync.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  let current = true;
  const onToken = jest.fn();
  const pending = registerPushToken({ isCurrent: () => current, onToken });
  while (!finish) await Promise.resolve();
  current = false;
  finish({ data: 'late-device-token' });
  await pending;
  expect(onToken).not.toHaveBeenCalled();
  expect(API.put).not.toHaveBeenCalled();
});

test('logout during secure token persistence cancels the network binding', async () => {
  let current = true;
  await registerPushToken({ isCurrent: () => current, onToken: async () => { current = false; } });
  expect(API.put).not.toHaveBeenCalled();
});

test('Expo Go skips native notification setup and token registration', async () => {
  Constants.appOwnership = 'expo';
  await registerPushToken();
  expect(Notifications.setNotificationHandler).not.toHaveBeenCalled();
  expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(API.put).not.toHaveBeenCalled();
});
