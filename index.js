// bot/index.js
import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const NEXT_API_URL = process.env.NEXT_API_URL;
const POST_SECRET = process.env.DISCORD_POST_SECRET;
const CHANNEL_ID = process.env.CHANNEL_ID;

if (!process.env.DISCORD_TOKEN) {
  console.error("❌ DISCORD_TOKEN not set. Exiting.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

function processMessage(m) {
  let stockData = m.content ?? "";

  if (m.embeds?.length) {
    stockData = m.embeds
      .map((e) => {
        let desc = e.description ?? "";
        if (e.fields?.length) {
          desc += "\n" + e.fields.map((f) => `${f.name}: ${f.value}`).join("\n");
        }
        if (e.title) desc = `${e.title}\n${desc}`;
        return desc;
      })
      .join("\n");
  }

  stockData = stockData
    .replace(
      /<:([a-zA-Z0-9_]+):(\d+)>/g,
      (_, name, id) =>
        `<img src="https://cdn.discordapp.com/emojis/${id}.png" alt="${name}" style="width:20px;height:20px;vertical-align:middle;" />`
    )
    .replace(/<t:(\d+):R>/g, (_, ts) => new Date(Number(ts) * 1000).toLocaleTimeString())
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  return {
    id: m.id,
    author: m.author?.username || "Unknown",
    content: stockData,
    createdAt: m.createdTimestamp,
  };
}

async function postToNextBatch(messagesArray) {
  if (!NEXT_API_URL || !POST_SECRET) {
    console.warn("NEXT_API_URL or POST_SECRET not set. Skipping POST.");
    return;
  }

  try {
    const res = await fetch(`${NEXT_API_URL.replace(/\/$/, "")}/api/discord`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-secret": POST_SECRET,
      },
      body: JSON.stringify({ messages: messagesArray }),
    });
    console.log("🟢 POST to Next.js:", res.status, res.statusText);
  } catch (err) {
    console.error("❌ Failed to POST to Next.js:", err);
  }
}

client.once("ready", async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  if (!CHANNEL_ID) {
    console.warn("CHANNEL_ID not set. Skipping initial sync.");
    return;
  }

  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    console.log("Channel fetched:", channel?.name || "(unknown)");

    // Fetch latest 2 messages (newest -> oldest), then reverse to oldest -> newest
    const messagesCol = await channel.messages.fetch({ limit: 2 });
    const msgs = Array.from(messagesCol.values()).reverse().map(processMessage);

    if (msgs.length > 0) {
      console.log("Initial batch to Next.js:", msgs);
      await postToNextBatch(msgs);
    }
  } catch (err) {
    console.error("❌ Error during initial fetch:", err);
  }
});

client.on("messageCreate", async (message) => {
  // Prevent the bot from processing other bots (avoid loops)
  if (message.author?.bot) return;
  if (CHANNEL_ID && message.channel?.id !== CHANNEL_ID) return;

  try {
    // Fetch latest 2 messages each time a new message arrives
    const messagesCol = await message.channel.messages.fetch({ limit: 2 });
    // convert to array oldest -> newest
    const msgs = Array.from(messagesCol.values()).reverse().map(processMessage);

    if (msgs.length > 0) {
      console.log("Posting batch (prev + current) to Next.js:", msgs);
      await postToNextBatch(msgs); // single POST containing both messages
    }
  } catch (err) {
    console.error("❌ Error fetching or posting messages:", err);
  }
});

console.log("Attempting to log in Discord bot...");
client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error("❌ Failed to login:", err);
  process.exit(1);
});


//  import { Client, GatewayIntentBits } from "discord.js";
// import dotenv from "dotenv";

// dotenv.config();

// const NEXT_API_URL = process.env.NEXT_API_URL;
// const POST_SECRET = process.env.DISCORD_POST_SECRET;
// const CHANNEL_ID = process.env.CHANNEL_ID;

// if (!process.env.DISCORD_TOKEN) {
//   console.error("❌ DISCORD_TOKEN not set. Exiting.");
//   process.exit(1);
// }

// // Create Discord client with proper intents
// const client = new Client({
//   intents: [
//     GatewayIntentBits.Guilds,
//     GatewayIntentBits.GuildMessages,
//     GatewayIntentBits.MessageContent,
//   ],
// });

// // === POST to Next.js API ===
// async function postToNext(payload) {
//   console.log("=== POST to Next.js API ===");
//   console.log("Payload:", JSON.stringify(payload, null, 2));

//   if (!NEXT_API_URL || !POST_SECRET) {
//     console.warn("NEXT_API_URL or POST_SECRET not set. Skipping POST.");
//     return;
//   }

//   try {
//     const res = await fetch(`${NEXT_API_URL}/api/discord`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "x-bot-secret": POST_SECRET,
//       },
//       body: JSON.stringify(payload),
//     });
//     console.log("🟢 Response from Next.js:", res.status, res.statusText);
//   } catch (err) {
//     console.error("❌ Failed to POST to Next.js:", err.message || err);
//   }
// }

// // === Process Discord message ===
// function processMessage(m) {
//   let stockData = m.content || "";

//   if (m.embeds?.length) {
//     stockData = m.embeds
//       .map((e) => {
//         let desc = e.description ?? "";
//         if (e.fields?.length) {
//           desc += "\n" + e.fields.map((f) => `${f.name}: ${f.value}`).join("\n");
//         }
//         if (e.title) desc = `${e.title}\n${desc}`;
//         return desc;
//       })
//       .join("\n");
//   }

//   stockData = stockData
//     .replace(
//       /<:([a-zA-Z0-9_]+):(\d+)>/g,
//       (_, name, id) =>
//         `<img src="https://cdn.discordapp.com/emojis/${id}.png" alt="${name}" style="width:20px;height:20px;vertical-align:middle;" />`
//     )
//     .replace(/<t:(\d+):R>/g, (_, ts) => new Date(ts * 1000).toLocaleTimeString())
//     .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

//   return {
//     id: m.id,
//     author: m.author?.username || "Unknown",
//     content: stockData,
//     createdAt: m.createdTimestamp,
//   };
// }

// // === On bot ready ===
// client.once("ready", async () => {
//   console.log(`🤖 Logged in as ${client.user.tag}`);

//   if (!CHANNEL_ID) {
//     console.warn("CHANNEL_ID not set. Exiting.");
//     return;
//   }

//   try {
//     const channel = await client.channels.fetch(CHANNEL_ID);
//     console.log("Channel fetched:", channel.name);

//     const messages = await channel.messages.fetch({ limit: 2 });
//     console.log("Fetched latest 2 messages:");
//     messages.forEach((m) => console.log(`[${m.createdTimestamp}] ${m.author.username}: ${m.content}`));

//     for (const msg of messages.map(processMessage)) {
//       console.log("Sending message to Next.js API:", msg);
//       await postToNext(msg);
//     }
//   } catch (err) {
//     console.error("❌ Error fetching messages:", err);
//   }
// });

// // === On new message ===
// client.on("messageCreate", async (message) => {
//   console.log("💬 New message received");
//   console.log("Channel ID:", message.channel.id, "Expected:", CHANNEL_ID);
//   console.log("Author:", message.author?.username, "Bot?", message.author?.bot);
//   console.log("Content:", message.content);

//   // if (message.author?.bot) return;
//   if (CHANNEL_ID && message.channel?.id !== CHANNEL_ID) return;

//   const processed = processMessage(message);
//   console.log("Sending new message to Next.js API:", processed);
//   await postToNext(processed);
// });

// // === Login ===
// console.log("Attempting to log in Discord bot...");
// client.login(process.env.DISCORD_TOKEN).catch((err) => {
//   console.error("❌ Failed to login:", err);
//   process.exit(1);
// });















// import { Client, GatewayIntentBits } from "discord.js";
// import dotenv from "dotenv";

// dotenv.config();

// const NEXT_API_URL = process.env.NEXT_API_URL;
// const POST_SECRET = process.env.DISCORD_POST_SECRET;
// const CHANNEL_ID = process.env.CHANNEL_ID;

// if (!process.env.DISCORD_TOKEN) {
//   console.error("DISCORD_TOKEN not set. Exiting.");
//   process.exit(1);
// }

// const client = new Client({
//   intents: [
//     GatewayIntentBits.Guilds,
//     GatewayIntentBits.GuildMessages,
//     GatewayIntentBits.MessageContent,
//   ],
// });

// // === POST data to Next.js ===
// async function postToNext(payload) {
//   console.log("=== postToNext called ===");
//   console.log("Payload:", JSON.stringify(payload, null, 2));
//   if (!NEXT_API_URL || !POST_SECRET) {
//     console.warn("NEXT_API_URL or POST_SECRET not set, skipping POST");
//     return;
//   }

//   try {
//     console.log("Posting to Next API at:", `${NEXT_API_URL}/api/discord`);
//     const res = await fetch(`${NEXT_API_URL}/api/discord`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "x-bot-secret": POST_SECRET,
//       },
//       body: JSON.stringify(payload),
//     });
//     console.log("🟢 [bot] Response from Next.js:", res.status, res.statusText);
//   } catch (err) {
//     console.error("❌ Failed to POST to Next.js:", err.message || err);
//   }
// }

// // === Process Discord message ===
// const processMessage = (m) => {
//   console.log("=== processMessage called ===");
//   console.log("Raw message:", m);

//   let stockData = m.content || "";

//   if (m.embeds?.length) {
//     stockData = m.embeds
//       .map((e) => {
//         let desc = e.description ?? "";
//         if (e.fields?.length) desc += "\n" + e.fields.map((f) => `${f.name}: ${f.value}`).join("\n");
//         if (e.title) desc = `${e.title}\n${desc}`;
//         return desc;
//       })
//       .join("\n");
//   }

//   stockData = stockData
//     .replace(
//       /<:([a-zA-Z0-9_]+):(\d+)>/g,
//       (_, name, id) => `<img src="https://cdn.discordapp.com/emojis/${id}.png" alt="${name}" style="width:20px;height:20px;vertical-align:middle;" />`
//     )
//     .replace(/<t:(\d+):R>/g, (_, ts) => new Date(ts * 1000).toLocaleTimeString())
//     .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

//   const processed = {
//     id: m.id,
//     author: m.author?.username || "Unknown",
//     content: stockData,
//     createdAt: m.createdTimestamp,
//   };

//   console.log("Processed message:", processed);
//   return processed;
// };

// // === On bot ready ===
// client.once("ready", async () => {
//   console.log("🤖 Logged in as", client.user.tag);
//   if (!CHANNEL_ID) {
//     console.warn("CHANNEL_ID not set — cannot fetch initial messages");
//     return;
//   }

//   try {
//     console.log("Fetching channel:", CHANNEL_ID);
//     const channel = await client.channels.fetch(CHANNEL_ID);
//     console.log("Channel fetched:", channel.name);

//     const messages = await channel.messages.fetch({ limit: 2 });
//     console.log("Fetched messages:", messages.map((m) => m.content));

//     const processedMessages = messages.map(processMessage);
//     for (const msg of processedMessages) {
//       console.log("Sending initial message to Next.js API:", msg);
//       await postToNext(msg);
//     }
//   } catch (err) {
//     console.error("❌ Error fetching initial messages:", err);
//   }
// });

// // === On new message ===
// client.on("messageCreate", async (message) => {
//   console.log("💬 [bot] messageCreate triggered for message:", message.content);
//   if (message.author?.bot) {
//     console.log("Skipping bot message");
//     return;
//   }
//   if (CHANNEL_ID && message.channel?.id !== CHANNEL_ID) {
//     console.log("Skipping message from other channel:", message.channel?.id);
//     return;
//   }

//   const processed = processMessage(message);
//   console.log("Sending new message to Next.js API:", processed);
//   await postToNext(processed);
// });

// console.log("Attempting to log in Discord bot...");
// client.login(process.env.DISCORD_TOKEN).catch((err) => {
//   console.error("Failed to login:", err);
//   process.exit(1);
// });
