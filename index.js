// import { Client, GatewayIntentBits } from "discord.js";
// import dotenv from "dotenv";

// dotenv.config();

// const NEXT_API_URL = process.env.NEXT_API_URL;
// const POST_SECRET = process.env.DISCORD_POST_SECRET;
// const CHANNEL_ID = process.env.CHANNEL_ID;

// // Validate environment variables
// const requiredEnvVars = [
//   'DISCORD_TOKEN',
//   'NEXT_API_URL', 
//   'DISCORD_POST_SECRET',
//   'CHANNEL_ID'
// ];

// const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
// if (missingVars.length > 0) {
//   console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
//   process.exit(1);
// }

// console.log("✅ All environment variables are set");

// const client = new Client({
//   intents: [
//     GatewayIntentBits.Guilds,
//     GatewayIntentBits.GuildMessages,
//     GatewayIntentBits.MessageContent,
//   ],
// });

// // === Helper: Check if message contains stock data ===
// function isStockMessage(content) {
//   return content && (
//     content.includes("Seeds") || 
//     content.includes("Gear") ||
//     content.includes("🌱") ||
//     content.includes("🛠️") ||
//     content.includes("seed") ||
//     content.includes("gear")
//   );
// }

// // === Helper: POST data to Next.js API ===
// async function postToNext(payload) {
//   if (!NEXT_API_URL || !POST_SECRET) {
//     console.error("Missing NEXT_API_URL or POST_SECRET");
//     return;
//   }

//   try {
//     console.log("Posting to Next.js API...");
//     const response = await fetch(`${NEXT_API_URL}/api/discord`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "x-bot-secret": POST_SECRET,
//       },
//       body: JSON.stringify(payload),
//     });

//     if (!response.ok) {
//       throw new Error(`HTTP ${response.status}: ${response.statusText}`);
//     }

//     console.log("✅ Successfully posted to Next.js");
//   } catch (err) {
//     console.error("❌ Failed to POST to Next.js:", err.message);
//   }
// }

// // === Helper: process messages, embeds, emojis, timestamps ===
// const processMessage = (m) => {
//   let stockData = m.content || "";

//   // Handle embeds
//   if (m.embeds && m.embeds.length > 0) {
//     stockData = m.embeds
//       .map((e) => {
//         let desc = e.description ?? "";

//         if (e.fields?.length) {
//           desc +=
//             "\n" + e.fields.map((f) => `${f.name}: ${f.value}`).join("\n");
//         }

//         if (e.title) {
//           desc = `${e.title}\n${desc}`;
//         }

//         return desc;
//       })
//       .join("\n");
//   }

//   // Convert custom Discord emojis to <img>
//   stockData = stockData.replace(
//     /<:([a-zA-Z0-9_]+):(\d+)>/g,
//     (match, name, id) => {
//       return `<img src="https://cdn.discordapp.com/emojis/${id}.png" alt="${name}" style="width:20px;height:20px;vertical-align:middle;" />`;
//     }
//   );

//   // Convert Discord relative timestamps <t:...:R> to local time string
//   stockData = stockData.replace(/<t:(\d+):R>/g, (match, ts) => {
//     const date = new Date(parseInt(ts, 10) * 1000);
//     return date.toLocaleTimeString();
//   });

//   // Convert markdown bold
//   stockData = stockData.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

//   return {
//     id: m.id,
//     author: m.author?.username || "Unknown",
//     content: stockData,
//     createdAt: m.createdTimestamp,
//   };
// };

// // === When bot is ready ===
// client.once("ready", async () => {
//   console.log(`🤖 Logged in as ${client.user.tag}`);
//   console.log(`📊 Monitoring channel: ${CHANNEL_ID}`);
//   console.log(`🌐 Next.js URL: ${NEXT_API_URL}`);

//   try {
//     const channel = await client.channels.fetch(CHANNEL_ID);
//     if (!channel) {
//       console.error("❌ Could not fetch channel.");
//       return;
//     }

//     console.log(`✅ Connected to channel: ${channel.name}`);

//     // Fetch recent messages
//     const messages = await channel.messages.fetch({ limit: 10 });
//     const stockMessages = messages
//       .filter(msg => isStockMessage(msg.content))
//       .map(processMessage)
//       .sort((a, b) => a.createdAt - b.createdAt);
//     console.log(messages,"messages")
//     console.log(`✅ Found ${stockMessages.length} stock messages`);

//     // Send initial messages
//     for (const msg of stockMessages) {
//       await postToNext(msg);
//     }
//   } catch (err) {
//     console.error("❌ Error fetching messages:", err);
//   }
// });

// // === On new message ===
// client.on("messageCreate", async (message) => {
//   try {
//     // Skip bots and unrelated channels
//     if (message.author?.bot) return;
//     if (CHANNEL_ID && message.channel?.id !== CHANNEL_ID) return;

//     // Only process messages that contain stock data
//     if (!isStockMessage(message.content)) {
//       console.log("Skipping non-stock message");
//       return;
//     }

//     const processed = processMessage(message);
//     console.log("📨 New stock message detected");

//     // Push to Next.js UI
//     await postToNext({
//       id: processed.id,
//       author: processed.author,
//       content: processed.content,
//       createdAt: processed.createdAt,
//     });

//     console.log("✅ Posted to Next.js successfully");
//   } catch (err) {
//     console.error("❌ Error handling messageCreate:", err);
//   }
// });

// // === Login the bot ===
// client.login(process.env.DISCORD_TOKEN).catch((err) => {
//   console.error("Failed to login:", err);
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

// // === Helper: POST data to Next.js API ===
// async function postToNext(payload) {
//   if (!NEXT_API_URL || !POST_SECRET) return;

//   try {
//     console.log(1);
//     await fetch(`${NEXT_API_URL}/api/discord`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "x-bot-secret": POST_SECRET,
//       },
//       body: JSON.stringify(payload),
//     });
//   } catch (err) {
//     console.error("Failed to POST to Next.js:", err?.message || err);
//   }
// }

// // === Helper: process messages, embeds, emojis, timestamps ===
// const processMessage = (m) => {
//   let stockData = m.content || "";

//   console.log(2);

//   // Handle embeds
//   if (m.embeds && m.embeds.length > 0) {
//     stockData = m.embeds
//       .map((e) => {
//         let desc = e.description ?? "";

//         if (e.fields?.length) {
//           desc +=
//             "\n" + e.fields.map((f) => `${f.name}: ${f.value}`).join("\n");
//         }

//         if (e.title) {
//           desc = `${e.title}\n${desc}`;
//         }

//         return desc;
//       })
//       .join("\n");
//   }

//   console.log(3);

//   // Convert custom Discord emojis to <img>
//   stockData = stockData.replace(
//     /<:([a-zA-Z0-9_]+):(\d+)>/g,
//     (match, name, id) => {
//       return `<img src="https://cdn.discordapp.com/emojis/${id}.png" alt="${name}" style="width:20px;height:20px;vertical-align:middle;" />`;
//     }
//   );

//   // Convert Discord relative timestamps <t:...:R> to local time string
//   stockData = stockData.replace(/<t:(\d+):R>/g, (match, ts) => {
//     const date = new Date(parseInt(ts, 10) * 1000);
//     return date.toLocaleTimeString();
//   });

//   // Convert markdown bold
//   stockData = stockData.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

//   return {
//     id: m.id,
//     author: m.author?.username || "Unknown",
//     content: stockData,
//     createdAt: m.createdTimestamp, // epoch ms
//   };
// };

// // === When bot is ready ===
// client.once("clientReady ", async () => {
//   console.log(`🤖 Logged in as ${client.user.tag}`);

//   try {
//     if (!CHANNEL_ID) {
//       console.warn("CHANNEL_ID not set — bot will not fetch initial messages.");
//       return;
//     }

//     const channel = await client.channels.fetch(CHANNEL_ID);
//     if (!channel) {
//       console.error("❌ Could not fetch channel.");
//       return;
//     }

//     // Fetch last 2 messages
//     const messages = await channel.messages.fetch({ limit: 2 });
//     console.log(messages,"messages")
//     const latestMessages = messages
//       .map(processMessage)
//       .sort((a, b) => a.createdAt - b.createdAt);

//     console.log("✅ Initial messages fetched");

//     // Send initial messages (so UI sees something immediately)
//     for (const msg of latestMessages) {
//       await postToNext(msg);
//     }
//   } catch (err) {
//     console.error("❌ Error fetching messages:", err);
//   }
// });

// // === On new message ===
// client.on("messageCreate", async (message) => {
//   try {
//     console.log(10);

//     // Skip bots and unrelated channels
//     if (message.author?.bot) return;
//     if (CHANNEL_ID && message.channel?.id !== CHANNEL_ID) return;

//     const processed = processMessage(message);
//     console.log("📨 New stock message:", processed);
    
//     // Push to Next.js UI
//     await postToNext({
//       id: processed.id,
//       author: processed.author,
//       content: processed.content,
//       createdAt: processed.createdAt,
//     });

//     console.log("Posted to Next.js successfully");
//   } catch (err) {
//     console.error("Error handling messageCreate:", err);
//   }
// });

// console.log(11);

// // === Login the bot ===
// client.login(process.env.DISCORD_TOKEN).catch((err) => {
//   console.error("Failed to login:", err);
//   process.exit(1);
// });





import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";

dotenv.config();

const NEXT_API_URL = process.env.NEXT_API_URL;
const POST_SECRET = process.env.DISCORD_POST_SECRET;
const CHANNEL_ID = process.env.CHANNEL_ID;

if (!process.env.DISCORD_TOKEN) {
  console.error("DISCORD_TOKEN not set. Exiting.");
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// === POST data to Next.js ===
async function postToNext(payload) {
  console.log("=== postToNext called ===");
  console.log("Payload:", JSON.stringify(payload, null, 2));
  if (!NEXT_API_URL || !POST_SECRET) {
    console.warn("NEXT_API_URL or POST_SECRET not set, skipping POST");
    return;
  }

  try {
    console.log("Posting to Next API at:", `${NEXT_API_URL}/api/discord`);
    const res = await fetch(`${NEXT_API_URL}/api/discord`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-secret": POST_SECRET,
      },
      body: JSON.stringify(payload),
    });
    console.log("🟢 [bot] Response from Next.js:", res.status, res.statusText);
  } catch (err) {
    console.error("❌ Failed to POST to Next.js:", err.message || err);
  }
}

// === Process Discord message ===
const processMessage = (m) => {
  console.log("=== processMessage called ===");
  console.log("Raw message:", m);

  let stockData = m.content || "";

  if (m.embeds?.length) {
    stockData = m.embeds
      .map((e) => {
        let desc = e.description ?? "";
        if (e.fields?.length) desc += "\n" + e.fields.map((f) => `${f.name}: ${f.value}`).join("\n");
        if (e.title) desc = `${e.title}\n${desc}`;
        return desc;
      })
      .join("\n");
  }

  stockData = stockData
    .replace(
      /<:([a-zA-Z0-9_]+):(\d+)>/g,
      (_, name, id) => `<img src="https://cdn.discordapp.com/emojis/${id}.png" alt="${name}" style="width:20px;height:20px;vertical-align:middle;" />`
    )
    .replace(/<t:(\d+):R>/g, (_, ts) => new Date(ts * 1000).toLocaleTimeString())
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  const processed = {
    id: m.id,
    author: m.author?.username || "Unknown",
    content: stockData,
    createdAt: m.createdTimestamp,
  };

  console.log("Processed message:", processed);
  return processed;
};

// === On bot ready ===
client.once("ready", async () => {
  console.log("🤖 Logged in as", client.user.tag);
  if (!CHANNEL_ID) {
    console.warn("CHANNEL_ID not set — cannot fetch initial messages");
    return;
  }

  try {
    console.log("Fetching channel:", CHANNEL_ID);
    const channel = await client.channels.fetch(CHANNEL_ID);
    console.log("Channel fetched:", channel.name);

    const messages = await channel.messages.fetch({ limit: 2 });
    console.log("Fetched messages:", messages.map((m) => m.content));

    const processedMessages = messages.map(processMessage);
    for (const msg of processedMessages) {
      console.log("Sending initial message to Next.js API:", msg);
      await postToNext(msg);
    }
  } catch (err) {
    console.error("❌ Error fetching initial messages:", err);
  }
});

// === On new message ===
client.on("messageCreate", async (message) => {
  console.log("💬 [bot] messageCreate triggered for message:", message.content);
  if (message.author?.bot) {
    console.log("Skipping bot message");
    return;
  }
  if (CHANNEL_ID && message.channel?.id !== CHANNEL_ID) {
    console.log("Skipping message from other channel:", message.channel?.id);
    return;
  }

  const processed = processMessage(message);
  console.log("Sending new message to Next.js API:", processed);
  await postToNext(processed);
});

console.log("Attempting to log in Discord bot...");
client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error("Failed to login:", err);
  process.exit(1);
});
