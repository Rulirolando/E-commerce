import amqp from "amqplib";
import "dotenv/config";

import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../generated/prisma/client.ts";

// 1. Setup Database Connection
const connectionString = `${process.env.DATABASE_URL}`;

const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function startWorker() {
  try {
    const connection = process.env.CLOUDAMQP_URL
      ? await amqp.connect(process.env.CLOUDAMQP_URL)
      : await amqp.connect({
          protocol: "amqp",
          hostname: "localhost",
          port: 5672,
        });
    const channel = await connection.createChannel();
    const queue = "app_notification_queue";

    await channel.assertQueue(queue, { durable: true });
    channel.prefetch(1);

    console.log("=========================================");
    console.log(" [*] WORKER NOTIFIKASI AKTIF");
    console.log(" [*] Menunggu pesan dari RabbitMQ...");
    console.log("=========================================");

    channel.consume(queue, async (msg) => {
      if (msg !== null) {
        const data = JSON.parse(msg.content.toString());

        try {
          console.log(`[Worker] Memproses notif untuk User: ${data.userId}`);

          // PROSES SIMPAN KE DATABASE
          await prisma.notification.create({
            data: {
              userId: data.userId,
              title: data.title,
              message: data.message,
            },
          });

          console.log(`[Worker] Berhasil simpan notifikasi ke Database.`);

          // Konfirmasi ke RabbitMQ bahwa tugas selesai
          channel.ack(msg);
        } catch (dbError) {
          console.error("[Worker] Gagal simpan ke DB:", dbError);
          // Jika gagal, pesan akan dikirim balik ke antrean untuk dicoba lagi
          channel.nack(msg);
        }
      }
    });
  } catch (error) {
    console.error("[Worker] Koneksi RabbitMQ Gagal:", error);
  }
}

startWorker();
