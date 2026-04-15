import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

// Inisialisasi Next.js
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  // Inisialisasi Socket.IO
  const io = new Server(httpServer, {
    connectionStateRecovery: {},
  });

  io.on("connection", (socket) => {
    console.log("User terhubung:", socket.id);
    const offset = socket.handshake.auth.serverOffset;

    if (offset) {
      console.log(`User kembali online. Mengirim pesan setelah ID: ${offset}`);
    }
    socket.on("join-room", (room) => {
      socket.join(room);
      console.log(`User ${socket.id} joined room: ${room}`);
    });

    socket.on("sendMessage", ({ room, message }) => {
      console.log(
        `Pesan diterima di server: ${message.content} untuk room: ${room}`,
      );
      io.to(room).emit("newMessage", message, message.id);
    });

    socket.on("disconnect", () => {
      console.log("User terputus");
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
