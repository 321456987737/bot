// bot/index.js
import { Client, GatewayIntentBits } from "discord.js";
import dotenv from "dotenv";
dotenv.config();

const NEXT_API_URL = process.env.NEXT_API_URL;
const POST_SECRET = process.env.DISCORD_POST_SECRET;

// <-- CHANGE THESE ENV NAMES IN YOUR .env -->
const CHANNEL_ID = process.env.CHANNEL_ID; // Live Stock channel ID
const CHANNEL_WEATHER_ID = process.env.CHANNEL_WEATHER_ID; // Weather channel ID
const CHANNEL_STOCK_PREDICTOR_ID = process.env.CHANNEL_STOCK_PREDICTOR_ID; // Stock-Predictor channel ID
// -----------------------------------------------

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

// Show clearly what env/channel IDs are configured (helpful)
console.log("=== Bot config (update .env as needed) ===");
console.log("NEXT_API_URL:", NEXT_API_URL ? NEXT_API_URL : "(missing)");
console.log("DISCORD_POST_SECRET:", POST_SECRET ? "set" : "(missing)");
console.log("CHANNEL_ID (LiveStock):", CHANNEL_ID || "(not set)");
console.log("CHANNEL_WEATHER_ID (Weather):", CHANNEL_WEATHER_ID || "(not set)");
console.log("CHANNEL_STOCK_PREDICTOR_ID (Predictor):", CHANNEL_STOCK_PREDICTOR_ID || "(not set)");
console.log("=========================================");

// Convert a discord.Message into your payload
function processMessage(m, channelTag) {
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
    channel: channelTag,
  };
}

async function postToNextBatch(channelTag, messagesArray) {
  if (!NEXT_API_URL || !POST_SECRET) {
    console.warn(`[${channelTag}] NEXT_API_URL or POST_SECRET not set. Skipping POST.`);
    return;
  }

  try {
    const res = await fetch(`${NEXT_API_URL.replace(/\/$/, "")}/api/discord`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-secret": POST_SECRET,
      },
      body: JSON.stringify({ channel: channelTag, messages: messagesArray }),
    });

    const text = await res.text().catch(() => "<no body>");
    console.log(`🟢 [${channelTag}] POST to Next.js:`, res.status, res.statusText);
    console.log(`↳ [${channelTag}] Response body:`, text);
  } catch (err) {
    console.error(`❌ [${channelTag}] Failed to POST to Next.js:`, err);
  }
}

async function fetchAndPostLatest(channelObj) {
  // channelObj: { id: '...', tag: 'LiveStock' }
  const { id, tag } = channelObj;
  try {
    const channel = await client.channels.fetch(id);
    if (!channel) {
      console.warn(`[${tag}] Channel not found for id ${id}`);
      return;
    }
    const messagesCol = await channel.messages.fetch({ limit: 2 });
    const msgs = Array.from(messagesCol.values()).reverse().map((m) => processMessage(m, tag));
    if (msgs.length > 0) {
      console.log(`[${tag}] Sending initial/latest 2 messages to API`);
      await postToNextBatch(tag, msgs);
    }
  } catch (err) {
    console.error(`[${tag}] Error fetching/posting messages:`, err);
  }
}

client.once("ready", async () => {
  console.log(`🤖 Logged in as ${client.user.tag}`);

  // prepare channel list dynamically based on envs
  const channelList = [
    { id: CHANNEL_ID, tag: "LiveStock" },
    { id: CHANNEL_WEATHER_ID, tag: "Weather" },
    { id: CHANNEL_STOCK_PREDICTOR_ID, tag: "StockPredictor" },
  ].filter((c) => c.id);

  for (const ch of channelList) {
    await fetchAndPostLatest(ch);
  }
});

// Incoming messages handler: detect channel and post latest 2 from that channel
client.on("messageCreate", async (message) => {
  try {
    const id = message.channel?.id;
    if (!id) return;

    // ignore other bots (prevent loop)
    // if (message.author?.bot) {
    //   // console.log("Ignoring bot message:", message.author?.username);
    //   return;
    // }

    // Map env channels to tags
    const mapping = {
      [CHANNEL_ID]: "LiveStock",
      [CHANNEL_WEATHER_ID]: "Weather",
      [CHANNEL_STOCK_PREDICTOR_ID]: "StockPredictor",
    };

    const tag = mapping[id];
    if (!tag) {
      // console.log("Message from unmonitored channel:", id);
      return;
    }

    console.log(`💬 [${tag}] messageCreate by ${message.author?.username} in channel ${id}`);

    // Fetch latest 2 from that channel and post
    const messagesCol = await message.channel.messages.fetch({ limit: 2 });
    const msgs = Array.from(messagesCol.values()).reverse().map((m) => processMessage(m, tag));
    console.log(`[${tag}] Posting batch (prev + current) to Next.js:`, msgs);
    await postToNextBatch(tag, msgs);
  } catch (err) {
    console.error("❌ Error in messageCreate handler:", err);
  }
});

// runtime listeners
client.on("error", (err) => console.error("Discord client error:", err));
client.on("warn", (info) => console.warn("Discord client warning:", info));
client.on("disconnect", (event) => console.warn("Disconnected:", event));
client.on("reconnecting", () => console.log("Reconnecting..."));

console.log("Attempting to log in Discord bot...");
client.login(process.env.DISCORD_TOKEN).catch((err) => {
  console.error("❌ Failed to login:", err);
});





// // bot/index.js (improved debug-friendly)
// import { Client, GatewayIntentBits } from "discord.js";
// import dotenv from "dotenv";

// dotenv.config();

// const NEXT_API_URL = process.env.NEXT_API_URL;
// const POST_SECRET = process.env.DISCORD_POST_SECRET;
// const CHANNEL_ID = process.env.CHANNEL_ID;

// if (!process.env.DISCORD_TOKEN) {
//   console.error("❌ DISCORD_TOKEN not set. Exiting.");
//   process.exit(1);
// }

// const client = new Client({
//   intents: [
//     GatewayIntentBits.Guilds,
//     GatewayIntentBits.GuildMessages,
//     GatewayIntentBits.MessageContent,
//   ],
// });

// // Helper to process message into payload
// function processMessage(m) {
//   let stockData = m.content ?? "";

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
//     .replace(/<t:(\d+):R>/g, (_, ts) => new Date(Number(ts) * 1000).toLocaleTimeString())
//     .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

//   return {
//     id: m.id,
//     author: m.author?.username || "Unknown",
//     content: stockData,
//     createdAt: m.createdTimestamp,
//   };
// }

// // POST and print response body for debug
// async function postToNextBatch(messagesArray) {
//   if (!NEXT_API_URL || !POST_SECRET) {
//     console.warn("NEXT_API_URL or POST_SECRET not set. Skipping POST.");
//     return;
//   }

//   try {
//     const res = await fetch(`${NEXT_API_URL.replace(/\/$/, "")}/api/discord`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         "x-bot-secret": POST_SECRET,
//       },
//       body: JSON.stringify({ messages: messagesArray }),
//     });

//     const text = await res.text().catch(() => "<no body>");
//     console.log("🟢 POST to Next.js:", res.status, res.statusText);
//     console.log("↳ Response body:", text);
//   } catch (err) {
//     console.error("❌ Failed to POST to Next.js:", err);
//   }
// }

// client.once("ready", async () => {
//   console.log(`🤖 Logged in as ${client.user.tag}`);

//   if (!CHANNEL_ID) {
//     console.warn("CHANNEL_ID not set. Skipping initial sync.");
//     return;
//   }

//   try {
//     const channel = await client.channels.fetch(CHANNEL_ID);
//     console.log("Channel fetched:", channel?.name || "(unknown)");

//     const messagesCol = await channel.messages.fetch({ limit: 2 });
//     const msgs = Array.from(messagesCol.values()).reverse().map(processMessage);

//     if (msgs.length > 0) {
//       console.log("Initial batch to Next.js:", msgs);
//       await postToNextBatch(msgs);
//     }
//   } catch (err) {
//     console.error("❌ Error during initial fetch:", err);
//   }
// });

// // DEBUG: set to true to allow reposting bot messages for testing (only for debug)
// const ALLOW_BOT_MESSAGES_FOR_DEBUG = false;

// client.on("messageCreate", async (message) => {
//   try {
//     console.log(`💬 messageCreate event: author=${message.author?.username || "?"} id=${message.id} channel=${message.channel?.id}`);

//     // ignore other bots unless debugging
//     // if (!ALLOW_BOT_MESSAGES_FOR_DEBUG) {
//     //   console.log("⛔ Ignoring message from bot:", message.author?.username);
//     //   return;
//     // }

//     // If you're limiting to a single channel, ensure env var is correct
//     if (CHANNEL_ID && message.channel?.id !== CHANNEL_ID) {
//       console.log(`⛔ Message in channel ${message.channel?.id} ignored (looking for ${CHANNEL_ID})`);
//       return;
//     }

//     // Fetch latest 2 messages each time a new message arrives
//     const messagesCol = await message.channel.messages.fetch({ limit: 2 });
//     const msgs = Array.from(messagesCol.values()).reverse().map(processMessage);

//     console.log("Posting batch (prev + current) to Next.js:", msgs);
//     await postToNextBatch(msgs);
//   } catch (err) {
//     console.error("❌ Error in messageCreate handler:", err);
//   }
// });

// // Useful runtime/log listeners
// client.on("error", (err) => console.error("Discord client error:", err));
// client.on("warn", (info) => console.warn("Discord client warning:", info));
// client.on("shardError", (err) => console.error("Shard error:", err));
// client.on("disconnect", (event) => console.warn("Disconnected:", event));
// client.on("reconnecting", () => console.log("Reconnecting..."));

// console.log("Attempting to log in Discord bot...");
// client.login(process.env.DISCORD_TOKEN).catch((err) => {
//   console.error("❌ Failed to login:", err);
//   // don't exit — allow external process manager to restart if needed
// });
