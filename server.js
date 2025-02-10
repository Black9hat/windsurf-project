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

// Serve static files from the React app
const buildPath = path.join(__dirname, 'client', 'build');
console.log('Build directory path:', buildPath);

// Check if build directory exists
if (fs.existsSync(buildPath)) {
  console.log('Build directory exists. Contents:');
  fs.readdirSync(buildPath).forEach(file => {
    console.log(' -', file);
  });
} else {
  console.log('Build directory does not exist!');
}

// Serve static files
app.use(express.static(buildPath));

// Handle React routing
app.get('*', (req, res) => {
  const indexPath = path.join(buildPath, 'index.html');
  console.log('Request path:', req.path);
  console.log('Attempting to serve:', indexPath);
  
  if (fs.existsSync(indexPath)) {
    console.log('index.html exists, serving file');
    res.sendFile(indexPath);
  } else {
    console.log('index.html not found!');
    res.status(404).send({
      error: 'Build files not found',
      buildPath,
      indexPath,
      currentDirectory: __dirname,
      directoryContents: fs.readdirSync(__dirname)
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
