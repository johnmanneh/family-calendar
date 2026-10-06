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
 */
async function sendPush(tokens, title, body, data = {}) {
  const list = Array.isArray(tokens) ? tokens : [tokens];

  // Filter to valid Expo push tokens only
  const valid = list.filter(t => t && t.startsWith('ExponentPushToken'));
  if (valid.length === 0) return;

  const messages = valid.map(to => ({ to, title, body, data, sound: 'default' }));

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
