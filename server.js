import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import redis from "./lib/redis.ts";
import { createAdapter } from "@socket.io/redis-adapter";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

// Inisialisasi Next.js
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const pubClient = redis;
  const subClient = redis.duplicate();

  // Inisialisasi Socket.IO
  const io = new Server(httpServer, {
    connectionStateRecovery: {},
    adapter: createAdapter(pubClient, subClient),
    cors: {
      origin: "http://localhost:3000",
    },
  });

  io.on("connection", (socket) => {
    // console.log("User terhubung:", socket.id);
    const offset = socket.handshake.auth.serverOffset;

    if (offset) {
      // console.log(`User kembali online. Mengirim pesan setelah ID: ${offset}`);
    }
    socket.on("join-personal-room", (userId) => {
      socket.join(userId);
      // console.log(`Socket ${socket.id} bergabung ke personal room: ${userId}`);
    });
    socket.on("join-room", (room) => {
      socket.join(room);
      // console.log(`User ${socket.id} joined room: ${room}`);
    });

    socket.on("sendMessage", ({ room, message, receiverId }) => {
      console.log(
        `Pesan diterima di server: ${message.content} untuk room: ${room}`,
      );
      io.to(room).emit("newMessage", message);
      const updatePayload = {
        roomId: room,
        lastMessage: message.content,
        updatedAt: message.createdAt,
      };

      io.to(message.senderId).emit("update-chat-list", updatePayload);
      if (receiverId) {
        io.to(receiverId).emit("update-chat-list", updatePayload);
      }
    });

    socket.on("disconnect", () => {
      // console.log("User terputus");
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    });
});
