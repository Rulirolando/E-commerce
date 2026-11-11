"use client";

import { io } from "socket.io-client";

export const socket = io("https://rulshop.tech/", {
  autoConnect: true,
  auth: {
    serverOffset: 0,
  },
});
