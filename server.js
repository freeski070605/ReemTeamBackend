const  express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const connectDB = require('./config/db');
const auth = require('./middleware/auth');

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Define routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/games', require('./routes/games'));
app.use('/api/tables', require('./routes/tables'));
app.use('/api/withdrawals', require('./routes/withdrawals'));

// Root route for API check
app.get('/', (req, res) => {
  res.json({ message: 'Reem Team API is running' });
});

// Create HTTP server
const server = http.createServer(app);

// Set up Socket.IO
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Socket.IO middleware for authentication
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.userId;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Join lobby room
  socket.on('joinLobby', () => {
    socket.join('lobby');
  });
  
  // Join game room
  socket.on('joinGame', (gameId) => {
    socket.join(`game-${gameId}`);
  });
  
  // Leave game room
  socket.on('leaveGame', (gameId) => {
    socket.leave(`game-${gameId}`);
  });
  
  // Disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Define port
const PORT = process.env.PORT || 5000;

// Start server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Function to emit lobby updates
const updateLobby = async () => {
  try {
    // Get current player count
    const Game = mongoose.model('Game');
    const activeGames = await Game.find({ status: { $ne: 'ended' } });
    
    // Count unique human players
    const playerSet = new Set();
    
    activeGames.forEach(game => {
      game.players.forEach(player => {
        if (!player.isAI) {
          playerSet.add(player.id);
        }
      });
    });
    
    // Emit player count update
    io.to('lobby').emit('lobbyUpdate', {
      type: 'playerCount',
      count: playerSet.size
    });
    
    // Get updated tables
    const Table = mongoose.model('Table');
    const tables = await Table.find();
    
    // Emit table updates
    tables.forEach(table => {
      io.to('lobby').emit('lobbyUpdate', {
        type: 'tableUpdate',
        table: {
          id: table.tableId,
          amount: table.amount,
          maxPlayers: table.maxPlayers,
          currentPlayers: table.currentPlayers
        }
      });
    });
  } catch (error) {
    console.error('Error updating lobby:', error);
  }
};

// Set up interval for updating lobby
setInterval(updateLobby, 10000);

// Export for testing
module.exports = server;
 