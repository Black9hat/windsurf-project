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

// Debug current directory structure
console.log('===== DIRECTORY STRUCTURE =====');
const listDir = (dir, level = 0) => {
  const indent = '  '.repeat(level);
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    console.log(`${indent}- ${file} ${stats.isDirectory() ? '(dir)' : `(${stats.size} bytes)`}`);
    if (stats.isDirectory() && file !== 'node_modules') {
      listDir(filePath, level + 1);
    }
  });
};
listDir(__dirname);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/chat', chatRoutes);

// Serve static files from the React app
const buildPath = path.join(__dirname, 'client', 'build');
console.log('\n===== STATIC FILE SERVING =====');
console.log('Build directory path:', buildPath);

// Try multiple possible build locations
const possibleBuildPaths = [
  buildPath,
  path.join(__dirname, 'client', 'dist'),
  path.join(__dirname, 'build'),
  path.join(__dirname, 'dist'),
  path.join(__dirname, 'client')
];

let validBuildPath = null;
for (const testPath of possibleBuildPaths) {
  if (fs.existsSync(testPath)) {
    console.log(`Found valid path: ${testPath}`);
    try {
      const indexPath = path.join(testPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        console.log(`Found index.html in: ${testPath}`);
        validBuildPath = testPath;
        break;
      }
    } catch (err) {
      console.log(`Error checking ${testPath}:`, err);
    }
  }
}

if (validBuildPath) {
  console.log(`Serving static files from: ${validBuildPath}`);
  app.use(express.static(validBuildPath));
} else {
  console.log('No valid build path found!');
}

// Handle React routing
app.get('*', (req, res) => {
  console.log(`\n===== HANDLING REQUEST: ${req.path} =====`);
  
  if (!validBuildPath) {
    return res.status(404).json({
      error: 'No valid build directory found',
      searchedPaths: possibleBuildPaths,
      currentDirectory: __dirname,
      directoryContents: fs.readdirSync(__dirname)
    });
  }

  const indexPath = path.join(validBuildPath, 'index.html');
  console.log('Attempting to serve:', indexPath);
  
  if (fs.existsSync(indexPath)) {
    console.log('index.html found, serving file');
    res.sendFile(indexPath);
  } else {
    console.log('index.html not found!');
    res.status(404).json({
      error: 'index.html not found',
      buildPath: validBuildPath,
      indexPath,
      currentDirectory: __dirname,
      directoryContents: fs.readdirSync(validBuildPath)
    });
  }
});

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
