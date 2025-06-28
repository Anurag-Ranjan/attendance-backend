import { createClient } from "redis";

const client = createClient({
  username: "default",
  password: process.env.REDIS_CLOUD_PASSWORD,
  socket: {
    host: process.env.REDIS_CLOUD_HOST,
    port: process.env.REDIS_CLOUD_PORT,
  },
});

client.on("error", (err) => console.log("Redis Client Error", err));

await client.connect();

export default client;
