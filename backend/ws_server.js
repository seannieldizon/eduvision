// server.js
const express = require('express');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 8080; // Change to 8080 if React expects ws://localhost:8080

// Serve frontend static files (optional, adjust if using create-react-app dev server)
app.use(express.static(path.join(__dirname, '..', 'frontend', 'build')));

// Spawn Python recognizer worker
const py = spawn('python', [
  path.join(__dirname, '..', 'streaming-server', 'recognizer.py')
]);

py.stdout.on('data', (data) => {
  // Optional: debug Python output
  console.log('Python stdout:', data.toString());
});

py.stderr.on('data', (data) => {
  console.error('Python error:', data.toString());
});

// Keep track of connected clients
let clients = new Set();

// Broadcast detection JSON to all clients
function broadcastDetection(obj) {
  const msg = JSON.stringify({ type: 'detection', payload: obj });
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  }
}

// Read lines from Python stdout (JSON detections)
const readline = require('readline');
const rl = readline.createInterface({ input: py.stdout });
rl.on('line', (line) => {
  try {
    const detection = JSON.parse(line);
    broadcastDetection(detection);
  } catch (err) {
    console.error('Bad JSON from Python:', line, err);
  }
});

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('Client connected');
  clients.add(ws);

  // Spawn FFmpeg for MJPEG streaming
  const ffmpeg = spawn('ffmpeg', [
    '-i', 'rtsp://admin:Eduvision124@192.168.8.5:554/Streaming/Channels/101', // your RTSP URL
    '-f', 'image2pipe',
    '-vf', 'fps=10',
    '-q:v', '5',
    '-vcodec', 'mjpeg',
    '-'
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  console.log('FFmpeg started for client');

  let buffer = Buffer.alloc(0);

  ffmpeg.stdout.on('data', (chunk) => {
    // Send raw MJPEG to <img> in React
    if (ws.readyState === WebSocket.OPEN) ws.send(chunk);

    // Send frames to Python recognizer
    buffer = Buffer.concat([buffer, chunk]);
    let start = buffer.indexOf(Buffer.from([0xFF, 0xD8]));
    let end = buffer.indexOf(Buffer.from([0xFF, 0xD9]), start + 2);

    while (start !== -1 && end !== -1) {
      const jpg = buffer.slice(start, end + 2);
      const lenBuf = Buffer.alloc(4);
      lenBuf.writeUInt32BE(jpg.length, 0);
      py.stdin.write(Buffer.concat([lenBuf, jpg]));

      buffer = buffer.slice(end + 2);
      start = buffer.indexOf(Buffer.from([0xFF, 0xD8]));
      end = buffer.indexOf(Buffer.from([0xFF, 0xD9]), start + 2);
    }
  });

  ffmpeg.stderr.on('data', (data) => {
    // Optional: uncomment to debug FFmpeg
    // console.error('FFmpeg stderr:', data.toString());
  });

  ws.on('close', () => {
    console.log('Client disconnected, killing FFmpeg');
    try { ffmpeg.kill('SIGINT'); } catch (e) {}
    clients.delete(ws);
  });
});

// Start HTTP/WebSocket server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
