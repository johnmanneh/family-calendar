/**
 * sendPush — sends an Expo push notification to one or more tokens.
 *
 * Expo's push service handles the APNs/FCM delivery layer, so no
 * platform credentials are needed here. We just POST to their API.
 *
 * @param {string|string[]} tokens  - One or more Expo push tokens
 * @param {string}          title   - Notification title
 * @param {string}          body    - Notification body text
 * @param {object}          [data]  - Optional extra data delivered to the app
 * @param {object}          [opts]  - { urgent: true } → Android 'urgent' channel
 *                                    (stronger vibration), e.g. "pickup needed"
 */
async function sendPush(tokens, title, body, data = {}, opts = {}) {
  const list = Array.isArray(tokens) ? tokens : [tokens];

  // Filter to valid Expo push tokens only
  const valid = list.filter(t => t && t.startsWith('ExponentPushToken'));
  if (valid.length === 0) return;

  // priority 'high' wakes the phone right away; channelId must match a channel
  // the app creates (mobile/src/utils/registerPushToken.js)
  const channelId = opts.urgent ? 'urgent' : 'default';
  const messages = valid.map(to => ({ to, title, body, data, sound: 'default', priority: 'high', channelId }));

  try {
    await fetch('https://exp.host/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Accept':        'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    // Push failures should never crash the API response
    console.error('sendPush error:', err.message);
  }
}

module.exports = sendPush;
