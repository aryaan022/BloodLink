require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const http = require('http');
const socketIO = require('socket.io');

// Import routes
const authRoutes = require('./routes/authRoutes');
const hospitalRoutes = require('./routes/hospitalRoutes');
const donorRoutes = require('./routes/donorRoutes');
const publicRoutes = require('./routes/publicRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const badgeRoutes = require('./routes/badgeRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

// Import database
const connectDB = require('../config/database');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5000',
    methods: ['GET', 'POST']
  }
});

// Connect to Database
connectDB();

// =============== MIDDLEWARE ===============

// Parse request body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5000',
  credentials: true
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', './views');

// Static files
app.use(express.static('public'));

// =============== ROUTES ===============

// API: Get Mapbox token (for frontend)
app.get('/api/mapbox-token', (req, res) => {
  res.json({
    token: process.env.MAPBOX_ACCESS_TOKEN
  });
});

// Home route - Landing page
app.get('/', (req, res) => {
  res.render('landing');
});

// Auth pages
app.get('/auth/login', (req, res) => {
  res.render('login');
});

app.get('/auth/signup', (req, res) => {
  res.render('signup');
});

// Dashboard pages
app.get('/donor/dashboard', (req, res) => {
  res.render('donor-dashboard');
});

app.get('/hospital/dashboard', (req, res) => {
  res.render('hospital-dashboard');
});

app.get('/admin/dashboard', (req, res) => {
  res.render('admin-dashboard');
});

// Health check
app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/hospital', hospitalRoutes);
app.use('/api/donor', donorRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/certificate', certificateRoutes);
app.use('/api/badges', badgeRoutes);
app.use('/api/admin', adminRoutes);

// Make io globally accessible
global.io = io;

// =============== SOCKET.IO ===============

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.id}`);

  // Listen for user joining a room (hospital or donor)
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`✅ User ${userId} joined room`);
  });

  // Listen for urgent request alert
  socket.on('urgentRequest', (data) => {
    io.to(data.targetUserId).emit('urgentRequestAlert', data);
    console.log(`🚨 Urgent request sent to ${data.targetUserId}`);
  });

  // Listen for disconnection
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.id}`);
  });
});

// =============== ERROR HANDLING ===============

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

// =============== START SERVER ===============

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║          🩸 BLOODLINK SERVER 🩸       ║
║                                       ║
║  🚀 Server running on port ${PORT}     ║
║  🌐 Environment: ${process.env.NODE_ENV}        ║
║                                       ║
╚═══════════════════════════════════════╝
  `);
});

module.exports = { app, io };
