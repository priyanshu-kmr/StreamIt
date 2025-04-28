const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const fs = require('fs');

const VIDEO_DIR = path.join(__dirname, 'videos');
const liveStreamers = new Set();

function getVideoList() {
  try {
    return fs.readdirSync(VIDEO_DIR).filter(file =>
      file.endsWith('.mp4') || file.endsWith('.webm') || file.endsWith('.mkv')
    );
  } catch (err) {
    console.error('Error reading video directory:', err);
    return [];
  }
}

require('dotenv').config({ path: path.join(__dirname, '../.env') });

const app = express();
const server = http.createServer(app);

// Serve static thumbnails from the videos directory
app.use('/thumbnails', express.static(VIDEO_DIR));

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e7,    // 10MB buffer size
  transports: ['websocket', 'polling']
});

let ClientCount = 0;

// Data caches per room:
// - lastInitSegment: the most recent init segment (Uint8Array)
// - recentChunks: sliding window of recent media chunks
const lastInitSegment = new Map();
const recentChunks     = new Map();
const MAX_CACHED_CHUNKS = 10;

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  ClientCount++;
  console.log(`Number of clients: ${ClientCount}`);
  const CHUNK_SIZE = 1024 * 1024; // 1MB per chunk

  socket.on('joinRoom', (room) => {
    console.log(`Socket ${socket.id} joining room: ${room}`);
    socket.join(room);

    if (lastInitSegment.has(room)) {
      console.log(`Sending cached init segment to ${socket.id} for room: ${room}`);
      socket.emit('videoInitSegment', lastInitSegment.get(room));
    }

    if (recentChunks.has(room)) {
      recentChunks.get(room).forEach((chunk) => {
        socket.emit('videoChunk', chunk);
      });
    }

    socket.join(room);
    const participants = io.sockets.adapter.rooms.get(room)?.size || 0;
    io.to(room).emit('roomUpdate', { participants });
  });

  socket.on('videoInitSegment', ({ room, data }) => {
    if (!room || !data) {
      console.error('Invalid videoInitSegment payload');
      return;
    }
    console.log(`Init segment received for room: ${room}, size: ${data.byteLength || data.length} bytes`);

    lastInitSegment.set(room, data);

    socket.to(room).emit('videoInitSegment', data);
  });

  socket.on('videoChunk', ({ room, data }) => {
    if (!room || !data) {
      console.error('Invalid videoChunk payload');
      return;
    }
    const size = data.byteLength || data.length;
    console.log(`VideoChunk received for room: ${room}, size: ${size} bytes`);

    // Cache chunk for late-joiners
    if (!recentChunks.has(room)) {
      recentChunks.set(room, []);
    }
    const buffer = recentChunks.get(room);
    buffer.push(data);
    if (buffer.length > MAX_CACHED_CHUNKS) buffer.shift();

    // Broadcast to other viewers
    socket.to(room).emit('videoChunk', data);
    console.log(`Broadcasted chunk to room: ${room}`);
  });
  
  socket.on('streamEnd', (username , room) => {
    lastInitSegment.delete(room);
    recentChunks.delete(room);
  });

  socket.on('requestVideoList', () => {
    const videoList = getVideoList().map(video => {
      const base = path.parse(video).name;
      let thumb = `${base}.png`;
      let thumbData = null;

      const thumbPath = path.join(VIDEO_DIR, thumb);
      if (fs.existsSync(thumbPath)) {
        const fileBuffer = fs.readFileSync(thumbPath);
        thumbData = `data:image/png;base64,${fileBuffer.toString('base64')}`;
      } else {
        thumb = null;
      }

      return {
        name: video,
        thumbnail: thumb ? `/thumbnails/${thumb}` : null,
        pngData: thumbData
      };
    });
    socket.emit('videoList', videoList);
    console.log(`sent video list to client ${socket.id}`)
  });

  socket.on('watch', ({ videoName }) => {
    console.log(`Client ${socket.id} requested to watch video: ${videoName}`);
    const videoPath = path.join(VIDEO_DIR, videoName);
    if (!fs.existsSync(videoPath)) {
      socket.emit('videoError', { message: 'Video not found.' });
      return;
    }
  
    const stat = fs.statSync(videoPath);
    const totalSize = stat.size;
  
    const readStream = fs.createReadStream(videoPath, { highWaterMark: CHUNK_SIZE });
  
    socket.emit('videoMeta', { size: totalSize, name: videoName });
  
    readStream.on('data', (chunk) => {
      socket.emit('videoChunk', chunk);
    });
  
    readStream.on('end', () => {
      socket.emit('videoEnd');
      console.log(`Finished streaming ${videoName} to ${socket.id}`);
    });
  
    readStream.on('error', (err) => {
      socket.emit('videoError', { message: 'Error reading video.' });
      console.error('Stream error:', err);
    });
  
    socket.on('disconnect', () => {
      readStream.destroy();
    });
  });

  // Cleanup on disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    ClientCount--;
    console.log(`Number of clients: ${ClientCount}`);
    console.log('ending stream');
    io.sockets.sockets.forEach((s) => {
    });
  });

  socket.on('joinRoom', (username) => {
    liveStreamers.add(username);
  });

  socket.on('streamEnd', ({ room }) => {
    liveStreamers.delete(room);
  });

  socket.on('getLiveStreamers', () => {
    socket.emit('liveStreamers', Array.from(liveStreamers));
  });
});

const PORT = process.env.SERVER_PORT || 4040;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
