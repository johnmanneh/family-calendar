process.env.TZ = 'UTC';

const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const familyRoutes = require('./routes/family');
const taskRoutes = require('./routes/tasks');
const groupRoutes = require('./routes/groups');
const streamRoutes = require('./routes/stream');
const notificationRoutes = require('./routes/notifications');
const scanRoutes = require('./routes/scan');
const chatRoutes = require('./routes/chat');
const pickupRoutes = require('./routes/pickups');
const joinRoutes = require('./routes/join');
const publicRoutes = require('./routes/public');

function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(cors({
    origin: ['https://its4us.app', 'https://www.its4us.app', 'http://localhost:3000'],
    credentials: true,
  }));
  app.use(express.json());
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  app.use('/api/auth', authRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/family', familyRoutes);
  app.use('/api/tasks', taskRoutes);
  app.use('/api/groups', groupRoutes);
  app.use('/api/stream', streamRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/join', joinRoutes);
  app.use('/api/scan', scanRoutes);
  app.use('/api/pickups', pickupRoutes);
  app.use('/api/public', publicRoutes);

  app.get('/', (req, res) => res.json({ message: 'Family Calendar API is running' }));

  app.get('/privacy', (req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Privacy Policy — It's for us</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 720px; margin: 40px auto; padding: 0 20px; color: #222; line-height: 1.7; }
    h1 { color: #1a8fa8; }
    h2 { margin-top: 32px; color: #333; }
    p, li { font-size: 15px; }
    footer { margin-top: 48px; font-size: 13px; color: #888; }
  </style>
</head>
<body>
  <h1>Privacy Policy</h1>
  <p><strong>App:</strong> It's for us<br />
  <strong>Package:</strong> com.songsanchaun.whenapp<br />
  <strong>Last updated:</strong> October 2026</p>

  <p>This Privacy Policy explains how <strong>It's for us</strong> ("we", "our", or "the app") collects, uses, and protects your information when you use our family calendar application.</p>

  <h2>1. Information We Collect</h2>
  <ul>
    <li><strong>Account information:</strong> Your name and email address when you register.</li>
    <li><strong>Family data:</strong> Family member names and relationships you add to the app.</li>
    <li><strong>Calendar data:</strong> Events, tasks, and schedules you create or share.</li>
    <li><strong>Device information:</strong> Basic device data for push notifications (via Expo/FCM).</li>
  </ul>

  <h2>2. How We Use Your Information</h2>
  <ul>
    <li>To provide and operate the family calendar service.</li>
    <li>To share events and tasks between family members you invite.</li>
    <li>To send push notifications for events and task updates.</li>
    <li>To authenticate your account securely.</li>
  </ul>

  <h2>3. Data Sharing</h2>
  <p>We do not sell or share your personal data with third parties. Your data is only shared with family members within your family group, as directed by you.</p>

  <h2>4. Data Storage</h2>
  <p>Your data is stored securely on servers hosted by <strong>Railway</strong> (railway.app). Data is encrypted in transit using HTTPS/TLS.</p>

  <h2>5. Push Notifications</h2>
  <p>We use <strong>Expo Notifications</strong> (powered by Firebase Cloud Messaging) to send push notifications. You can disable notifications at any time in your device settings.</p>

  <h2>6. Data Retention</h2>
  <p>Your data is retained for as long as your account is active. You may request deletion of your account and all associated data by contacting us.</p>

  <h2>7. Children's Privacy</h2>
  <p>The app is designed for family use. We do not knowingly collect personal information from children under 13 without parental consent.</p>

  <h2>8. Your Rights</h2>
  <ul>
    <li>Access the data we hold about you.</li>
    <li>Request correction or deletion of your data.</li>
    <li>Withdraw consent at any time by deleting your account.</li>
  </ul>

  <h2>9. Contact</h2>
  <p>For any privacy questions or data requests, contact us at:<br />
  <strong>songsanchuan@hotmail.com</strong></p>

  <footer>© 2026 It's for us. All rights reserved.</footer>
</body>
</html>`);
  });

  return app;
}

module.exports = createApp;
