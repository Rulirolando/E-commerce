import { NextApiRequest, NextApiResponse } from "next";
import { Server as NetServer } from "http";
import { Server as SocketIOServer } from "socket.io";
export interface ServerToClientEvents {
  "receive-message": (message: string) => void;
  "user-joined": (message: string) => void;
}

export interface ClientToServerEvents {
  "join-room": (room: string) => void;
  "send-message": (data: { room: string; message: string }) => void;
}

export interface InterServerEvents {
  ping: () => void;
}

export interface SocketData {
  username: string;
}

type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: SocketIOServer<
        ClientToServerEvents,
        ServerToClientEvents,
        InterServerEvents,
        SocketData
      >;
    };
  };
};

export default function SocketHandler(
  req: NextApiRequest,
  res: NextApiResponseWithSocket,
) {
  if (res.socket.server.io) {
    console.log("Socket server already running");
    res.end();
    return;
  }

  const io = new SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(res.socket.server);

  res.socket.server.io = io;

  io.on("connection", (socket) => {
    socket.on("join-room", (room) => {
      socket.join(room);
      console.log(`User ${socket.id} joined room: ${room}`);
    });

    socket.on("send-message", ({ room, message }) => {
      // Mengirim hanya ke room tertentu dengan tipe data string
      io.to(room).emit("receive-message", message);
    });
  });

  console.log("Socket server initialized");
  res.end();
}
