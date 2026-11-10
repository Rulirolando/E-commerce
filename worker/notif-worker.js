import amqp from "amqplib";
import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

const connectionString = process.env.DATABASE_URL;
const rabbitUrl = process.env.CLOUDAMQP_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL belum dikonfigurasi.");
}

const pool = new pg.Pool({
  connectionString,
  max: 5,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const QUEUE = "app_notification_queue_v2";
const DEAD_QUEUE = `${QUEUE}.dead`;

function validateNotification(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error("Format pesan harus berupa objek JSON.");
  }

  if (
    typeof data.userId !== "string" ||
    data.userId.trim().length === 0 ||
    data.userId.length > 100
  ) {
    throw new Error("userId tidak valid.");
  }

  if (
    typeof data.title !== "string" ||
    data.title.trim().length === 0 ||
    data.title.length > 200
  ) {
    throw new Error("title tidak valid.");
  }

  if (
    typeof data.message !== "string" ||
    data.message.trim().length === 0 ||
    data.message.length > 5000
  ) {
    throw new Error("message tidak valid.");
  }

  if (
    data.orderId != null &&
    (!Number.isSafeInteger(data.orderId) || data.orderId <= 0)
  ) {
    throw new Error("orderId harus berupa integer positif atau null.");
  }

  return {
    userId: data.userId.trim(),
    orderId: data.orderId ?? null,
    title: data.title.trim(),
    message: data.message.trim(),
  };
}

async function startWorker() {
  let connection;

  try {
    connection = rabbitUrl
      ? await amqp.connect(rabbitUrl)
      : await amqp.connect({
          protocol: "amqp",
          hostname: "localhost",
          port: 5672,
        });

    connection.on("error", (error) => {
      console.error("[Worker] Koneksi RabbitMQ bermasalah:", error.message);
    });

    connection.on("close", () => {
      console.error(
        "[Worker] Koneksi RabbitMQ terputus. Worker perlu dijalankan ulang.",
      );
    });

    const channel = await connection.createChannel();

    // Antrean untuk pesan gagal.
    await channel.assertQueue(DEAD_QUEUE, {
      durable: true,
    });

    // Pesan yang ditolak tanpa requeue akan diarahkan ke DEAD_QUEUE.
    await channel.assertQueue(QUEUE, {
      durable: true,
      arguments: {
        "x-dead-letter-exchange": "",
        "x-dead-letter-routing-key": DEAD_QUEUE,
      },
    });

    channel.prefetch(1);

    // console.log("[Worker] Worker notifikasi aktif.");
    // console.log(`[Worker] Antrean utama: ${QUEUE}`);
    // console.log(`[Worker] Antrean pesan gagal: ${DEAD_QUEUE}`);

    await channel.consume(
      QUEUE,
      async (msg) => {
        if (msg === null) return;

        try {
          const rawData = JSON.parse(msg.content.toString("utf8"));
          const data = validateNotification(rawData);

          await prisma.notification.create({
            data: {
              userId: data.userId,
              orderId: data.orderId,
              title: data.title,
              message: data.message,
            },
          });

          channel.ack(msg);
          // console.log("[Worker] Notifikasi berhasil disimpan.");
        } catch (error) {
          console.error("[Worker] Pesan gagal diproses:", error.message);

          channel.nack(msg, false, false);
        }
      },
      { noAck: false },
    );
  } catch (error) {
    console.error("[Worker] Gagal memulai worker:", error.message);

    if (connection) {
      try {
        await connection.close();
      } catch {
        // Koneksi mungkin sudah terputus.
      }
    }

    await prisma.$disconnect().catch(() => {});
    await pool.end().catch(() => {});
    process.exitCode = 1;
  }
}

async function shutdown() {
  // console.log("[Worker] Menghentikan worker...");

  try {
    await prisma.$disconnect();
    await pool.end();
  } catch (error) {
    console.error("[Worker] Gagal menutup koneksi:", error.message);
  }

  process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

startWorker();
