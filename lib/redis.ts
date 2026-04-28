import Redis from "ioredis";

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL)
  : new Redis({
      host: "localhost",
      port: 6379,
    });

redis.on("error", (err) => {
  console.error("Redis Error: ", err.message);
});

export default redis;
