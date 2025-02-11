require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const socketio = require('socket.io');
const http = require('http');
const fs = require('fs');

// Route imports
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const paymentRoutes = require('./routes/payments');
const chatRoutes = require('./routes/chat');

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: '*',
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chat', chatRoutes);

// Function to find the build directory
const findBuildDir = () => {
  const possiblePaths = [
    path.join(__dirname, 'client', 'build'),
    path.join(__dirname, 'build'),
    path.join(__dirname, 'client', 'dist'),
    path.join(__dirname, 'dist')
  ];

  console.log('Searching for build directory...');
  for (const dir of possiblePaths) {
    console.log(`Checking ${dir}...`);
    try {
      if (fs.existsSync(dir) && fs.existsSync(path.join(dir, 'index.html'))) {
        console.log(`Found valid build directory at: ${dir}`);
        return dir;
      }
    } catch (err) {
      console.error(`Error checking directory ${dir}:`, err);
    }
  }
  console.log('No valid build directory found');
  return null;
};

// Serve static files
const buildDir = findBuildDir();
if (buildDir) {
  console.log(`Serving static files from: ${buildDir}`);
  app.use(express.static(buildDir));

  // Handle React routing
  app.get('*', (req, res) => {
    res.sendFile(path.join(buildDir, 'index.html'));
  });
} else {
  console.error('Build directory not found. Available directories:');
  try {
    const dirs = fs.readdirSync(__dirname);
    console.log('Root directory contents:', dirs);
    if (dirs.includes('client')) {
      console.log('Client directory contents:', fs.readdirSync(path.join(__dirname, 'client')));
    }
  } catch (err) {
    console.error('Error listing directories:', err);
  }
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    message: 'Something went wrong!', 
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Database connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Socket.io chat handling
io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('join_chat', (roomId) => {
        socket.join(roomId);
        console.log(`Client joined room: ${roomId}`);
    });

    socket.on('send_message', (data) => {
        io.to(data.roomId).emit('receive_message', data);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
