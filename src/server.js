require('dotenv').config();

const { validateEnv } = require('./config/env');
validateEnv();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const { corsOptions } = require('./config/cors');
const { errorHandler } = require('./middleware/errorHandler');
const { requestLogger } = require('./middleware/requestLogger');
const { authenticate } = require('./middleware/auth');
const { pool } = require('./config/database');
const routes = require('./routes');

const app = express();
const server = http.createServer(app);

// Configure Socket.IO with CORS
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Make io available globally for other modules
global.io = io;

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`[socket] User connected: ${socket.id}`);

  // Handle user joining their personal room (for targeted updates)
  socket.on('join-user-room', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`[socket] User ${userId} joined their room`);
  });

  // Handle admin joining admin room (for admin-specific events)
  socket.on('join-admin-room', () => {
    socket.join('admin-room');
    console.log(`[socket] Admin joined admin room`);
  });

  socket.on('disconnect', () => {
    console.log(`[socket] User disconnected: ${socket.id}`);
  });
});

if (process.env.TRUST_PROXY === 'true') {
  app.set('trust proxy', 1);
}

app.use(cors(corsOptions));
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '1mb' }));
app.use(express.urlencoded({ extended: true, limit: process.env.URLENCODED_LIMIT || '1mb' }));
app.use(requestLogger);

// Serve uploaded files publicly (no authentication required for images)
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  setHeaders: (res, path) => {
    // Set security headers for uploaded files
    res.set({
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
    });
  }
}));

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use(errorHandler);

const PORT = Number(process.env.PORT || 5001);

server.listen(PORT, () => {
  console.log(`API listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  console.log(`Socket.IO server ready for real-time connections`);
});

function shutdown(signal) {
  console.log(`[server] ${signal} received, closing...`);
  io.close(() => {
    server.close(() => {
      pool.end(() => {
        console.log('[server] HTTP server, Socket.IO, and DB pool closed');
        process.exit(0);
      });
    });
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = { app, server, io };
