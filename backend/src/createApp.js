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
const joinRoutes = require('./routes/join');

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

  app.get('/', (req, res) => res.json({ message: 'Family Calendar API is running' }));

  return app;
}

module.exports = createApp;
