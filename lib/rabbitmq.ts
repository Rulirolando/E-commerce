import amqp from "amqplib";

export interface AppNotification {
  userId: string;
  title: string;
  orderId?: number | null;
  message: string;
  type: "PAYMENT" | "SHIPPING" | "PROMO";
}

const QUEUE_WITH_DEAD_LETTER = "app_notification_queue_v2";

export async function sendToRabbitMQ(
  queue: string,
  data: AppNotification,
): Promise<void> {
  let connection: Awaited<ReturnType<typeof amqp.connect>> | undefined;
  let channel:
    | Awaited<
        ReturnType<
          Awaited<ReturnType<typeof amqp.connect>>["createConfirmChannel"]
        >
      >
    | undefined;

  try {
    connection = process.env.CLOUDAMQP_URL
      ? await amqp.connect(process.env.CLOUDAMQP_URL)
      : await amqp.connect({
          protocol: "amqp",
          hostname: "localhost",
          port: 5672,
        });

    // Gunakan ConfirmChannel agar waitForConfirms() tersedia.
    channel = await connection.createConfirmChannel();

    if (queue === QUEUE_WITH_DEAD_LETTER) {
      const deadQueue = `${queue}.dead`;

      await channel.assertQueue(deadQueue, {
        durable: true,
      });

      await channel.assertQueue(queue, {
        durable: true,
        arguments: {
          "x-dead-letter-exchange": "",
          "x-dead-letter-routing-key": deadQueue,
        },
      });
    } else {
      await channel.assertQueue(queue, {
        durable: true,
      });
    }

    channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), {
      persistent: true,
      contentType: "application/json",
    });

    // Tunggu konfirmasi dari RabbitMQ.
    await channel.waitForConfirms();

    // console.log(`[RabbitMQ] Pesan terkonfirmasi pada antrean: ${queue}`);
  } catch (error) {
    console.error("[RabbitMQ] Gagal mengirim pesan:", error);
    throw error;
  } finally {
    try {
      await channel?.close();
    } catch {
      // Abaikan error ketika menutup channel.
    }

    try {
      await connection?.close();
    } catch {
      // Abaikan error ketika menutup koneksi.
    }
  }
}
