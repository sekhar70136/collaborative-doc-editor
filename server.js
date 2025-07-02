const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: { origin: "*" }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// Document Schema
const Document = require('./models/Document');

// Routes
app.get("/", (req, res) => {
  res.send("Server running");
});

// Real-time socket events
io.on('connection', (socket) => {
  console.log("User connected: " + socket.id);

  socket.on('join-document', async (documentId) => {
    socket.join(documentId);
    const document = await findOrCreateDocument(documentId);
    socket.emit('load-document', document.data);

    socket.on('send-changes', (delta) => {
      socket.broadcast.to(documentId).emit('receive-changes', delta);
    });

    socket.on('save-document', async (data) => {
      await Document.findByIdAndUpdate(documentId, { data });
    });
  });
});

async function findOrCreateDocument(id) {
  if (!id) return;
  const document = await Document.findById(id);
  if (document) return document;
  return await Document.create({ _id: id, data: "" });
}

server.listen(process.env.PORT, () => {
  console.log("Server listening on port " + process.env.PORT);
});
