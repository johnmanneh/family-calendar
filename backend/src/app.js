// All times are stored in UTC. Make Node read them as UTC regardless of the
// machine's timezone (Railway is UTC already; a dev Mac is not).
process.env.TZ = 'UTC';

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const familyRoutes = require('./routes/family');
const taskRoutes = require('./routes/tasks');
const groupRoutes = require('./routes/groups');
const streamRoutes = require('./routes/stream');
const notificationRoutes = require('./routes/notifications');
const chatRoutes         = require('./routes/chat');
const joinRoutes         = require('./routes/join');

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploaded avatars
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/stream', streamRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/chat',          chatRoutes);
app.use('/api/join',          joinRoutes);


// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Family Calendar API is running' });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});