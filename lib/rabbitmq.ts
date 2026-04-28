import amqp from "amqplib";

export interface AppNotification {
  userId: string;
  title: string;
  message: string;
  type: "PAYMENT" | "SHIPPING" | "PROMO";
}

export const sendToRabbitMQ = async (queue: string, data: AppNotification) => {
  try {
    const connection = process.env.CLOUDAMQP_URL
      ? await amqp.connect(process.env.CLOUDAMQP_URL)
      : await amqp.connect({
          protocol: "amqp",
          hostname: "localhost",
          port: 5672,
        });
    const channel = await connection.createChannel();

    await channel.assertQueue(queue, { durable: true });

    channel.sendToQueue(queue, Buffer.from(JSON.stringify(data)), {
      persistent: true,
    });

    console.log(`[RabbitMQ] Pesan terkirim ke antrean: ${queue}`);

    setTimeout(() => {
      connection.close();
    }, 500);
  } catch (error) {
    console.error("[RabbitMQ] Gagal kirim pesan:", error);
  }
};
