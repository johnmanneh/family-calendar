const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const eventRoutes = require('./routes/events');
const familyRoutes = require('./routes/family');
const taskRoutes = require('./routes/tasks');


const app = express();

app.use(cors());
app.use(express.json());

// Routes

app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/family', familyRoutes);
app.use('/api/tasks', taskRoutes);


// Health check
app.get('/', (req, res) => {
  res.json({ message: 'Family Calendar API is running' });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});