process.env.TZ = 'UTC';

const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const rateLimit = require('express-rate-limit');

const authRoutes         = require('./routes/auth');
const eventRoutes        = require('./routes/events');
const familyRoutes       = require('./routes/family');
const taskRoutes         = require('./routes/tasks');
const groupRoutes        = require('./routes/groups');
const streamRoutes       = require('./routes/stream');
const notificationRoutes = require('./routes/notifications');
const scanRoutes         = require('./routes/scan');
const voiceRoutes        = require('./routes/voice');
const chatRoutes         = require('./routes/chat');
const pickupRoutes       = require('./routes/pickups');
const joinRoutes         = require('./routes/join');
const publicRoutes       = require('./routes/public');

// Allowed CORS origins — localhost:3000 only outside production
const ALLOWED_ORIGINS = ['https://its4us.app', 'https://www.its4us.app'];
if (process.env.NODE_ENV !== 'production') {
  ALLOWED_ORIGINS.push('http://localhost:3000');
}

function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  // ── Security headers (Helmet) ──────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ──────────────────────────────────────────────────────────────────
  app.use(cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
  }));

  app.use(express.json());

  // NOTE: /uploads static mount removed — unauthenticated file serving for
  // avatar images was a privacy risk.  Serve via authenticated API endpoint or
  // move to Cloudinary (TODO: Cloudinary authenticated upload — out of scope
  // for security pass 1).

  app.use('/api/auth',          authRoutes);
  app.use('/api/events',        eventRoutes);
  app.use('/api/family',        familyRoutes);
  app.use('/api/tasks',         taskRoutes);
  app.use('/api/groups',        groupRoutes);
  app.use('/api/stream',        streamRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/chat',          chatRoutes);
  app.use('/api/join',          joinRoutes);
  app.use('/api/scan',          scanRoutes);
  app.use('/api/voice',         voiceRoutes);
  app.use('/api/pickups',       pickupRoutes);
  app.use('/api/public',        publicRoutes);

  app.get('/', (req, res) => res.json({ message: 'Family Calendar API is running' }));

  // ── Privacy policy ─────────────────────────────────────────────────────────
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

  <p>This Privacy Policy explains how <strong>It's for us</strong> ("we", "our", or "the app")
  collects, uses, and shares your information when you use our family calendar application.</p>

  <h2>1. Information We Collect</h2>
  <ul>
    <li><strong>Account information:</strong> Your name and email address when you register.</li>
    <li><strong>Family data:</strong> Family member names, relationships, and child profiles you add to the app. Child profiles are distinct data subjects managed by a parent or guardian.</li>
    <li><strong>Calendar data:</strong> Events, tasks, and schedules you create or share, including event notes, locations, and video call links.</li>
    <li><strong>Chat messages:</strong> Text messages sent within the family chat feature, stored on our servers.</li>
    <li><strong>Photos:</strong> Profile photos and images you upload are stored with our cloud image provider (Cloudinary).</li>
    <li><strong>Device information:</strong> A push-notification token for your device (via Expo / Firebase Cloud Messaging or Apple Push Notification service), used only to deliver app notifications.</li>
    <li><strong>Voice/speech input:</strong> If you use the voice capture feature, audio is sent to Groq (a third-party AI service) for transcription. We do not store audio recordings after transcription is complete.</li>
  </ul>

  <h2>2. How We Use Your Information</h2>
  <ul>
    <li>To provide and operate the family calendar service.</li>
    <li>To share events, tasks, and chat messages between family members you invite.</li>
    <li>To send push notifications for events, tasks, and updates.</li>
    <li>To authenticate your account securely.</li>
    <li>To process AI-assisted event scanning (photo → event suggestions via Groq).</li>
  </ul>

  <h2>3. Third-Party Service Providers</h2>
  <p>We use the following third-party services to operate the app. Each acts as a data processor
  on our behalf under a data processing agreement or equivalent terms:</p>
  <ul>
    <li><strong>Railway</strong> (railway.app) — cloud hosting for the backend server and PostgreSQL database.</li>
    <li><strong>Cloudinary</strong> — cloud storage and delivery for profile photos and uploaded images.</li>
    <li><strong>Groq</strong> — AI inference API used to extract event details from scanned images or text, and to transcribe voice audio recordings.</li>
    <li><strong>Resend</strong> — transactional email delivery (e.g. password reset emails).</li>
    <li><strong>Expo / Firebase Cloud Messaging (FCM) / Apple Push Notification service (APNs)</strong> — push notification delivery to Android and iOS devices.</li>
  </ul>
  <p>Your data is transmitted to these providers only to the extent necessary to deliver the
  features described above. We do not sell your data.</p>

  <h2>4. Family Chat</h2>
  <p>Messages sent in the family chat are stored on our servers and visible to all family members
  in your group. Do not share sensitive information (passwords, financial details) in the chat.</p>

  <h2>5. Child Profiles</h2>
  <p>Child profiles (managed accounts without login credentials) are created and managed by a
  parent or guardian. The child's name and associated calendar data are stored as part of the
  family record. We do not knowingly collect personal information from children under 13 without
  verifiable parental consent through a managing adult account.</p>

  <h2>6. Data Storage and Security</h2>
  <p>Your data is stored on servers hosted by <strong>Railway</strong>. All data is encrypted
  in transit using HTTPS/TLS. Photos are stored by <strong>Cloudinary</strong> under their
  security controls.</p>

  <h2>7. Data Retention and Deletion</h2>
  <p>Your data is retained for as long as your account is active. You can delete your account
  and all associated data from within the app (Settings → Delete Account). We will process
  the deletion promptly. Push tokens and sessions are revoked at deletion time. If you have
  managed child profiles, their data will also be removed or transferred to another authorized
  guardian per your instruction before your account is fully deleted.</p>

  <h2>8. Push Notifications</h2>
  <p>We use <strong>Expo Notifications</strong>, powered by Firebase Cloud Messaging (Android)
  and Apple Push Notification service (iOS), to send push notifications. You can disable
  notifications at any time in your device settings.</p>

  <h2>9. Your Rights</h2>
  <ul>
    <li>Access the data we hold about you.</li>
    <li>Request correction or deletion of your data.</li>
    <li>Withdraw consent at any time by deleting your account.</li>
    <li>For EU/EEA residents: right to data portability and to lodge a complaint with your
    supervisory authority.</li>
  </ul>

  <h2>10. Contact</h2>
  <p>For any privacy questions or data requests, contact us at:<br />
  <strong>songsanchuan@hotmail.com</strong></p>

  <footer>© 2026 It's for us. All rights reserved.</footer>
</body>
</html>`);
  });

  return app;
}

module.exports = createApp;
