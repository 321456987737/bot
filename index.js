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

if (!NEXT_API_URL || !POST_SECRET || !CHANNEL_ID) {
  console.warn("⚠️  Environment variables not fully set:");
  console.warn(`   NEXT_API_URL: ${NEXT_API_URL ? "✅ Set" : "❌ Missing"}`);
  console.warn(`   POST_SECRET: ${POST_SECRET ? "✅ Set" : "❌ Missing"}`);
  console.warn(`   CHANNEL_ID: ${CHANNEL_ID ? "✅ Set" : "❌ Missing"}`);
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
  console.log("📤 === postToNext called ===");
  console.log("Payload:", JSON.stringify(payload, null, 2));
  
  if (!NEXT_API_URL || !POST_SECRET) {
    console.warn("⚠️ NEXT_API_URL or POST_SECRET not set, skipping POST");
    return;
  }

  try {
    console.log(`🌐 Posting to Next API: ${NEXT_API_URL}/api/discord`);
    const response = await fetch(`${NEXT_API_URL}/api/discord`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bot-secret": POST_SECRET,
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      console.log("✅ Successfully posted to Next.js - Status:", response.status);
    } else {
      console.error("❌ Next.js API returned error:", response.status, response.statusText);
      try {
        const errorText = await response.text();
        console.error("Error details:", errorText);
      } catch (e) {
        console.error("Could not read error response");
      }
    }
  } catch (err) {
    console.error("❌ Failed to POST to Next.js:", err.message);
  }
}

// === Process Discord message ===
const processMessage = (message) => {
  console.log("🔧 === processMessage called ===");
  console.log("Message ID:", message.id);
  console.log("Author:", message.author?.tag, "(Bot:", message.author?.bot + ")");
  console.log("Content:", message.content);
  console.log("Embeds count:", message.embeds?.length || 0);

  let processedContent = message.content || "";

  // Process embeds if present
  if (message.embeds?.length > 0) {
    console.log("Processing embeds...");
    const embedContent = message.embeds
      .map((embed) => {
        let content = "";
        if (embed.title) content += `**${embed.title}**\n`;
        if (embed.description) content += `${embed.description}\n`;
        if (embed.fields?.length > 0) {
          content += embed.fields.map(field => `**${field.name}:** ${field.value}`).join("\n");
        }
        return content;
      })
      .join("\n\n");
    
    processedContent = embedContent || processedContent;
  }

  // Format Discord-specific content
  processedContent = processedContent
    // Convert custom emojis to images
    .replace(
      /<:([a-zA-Z0-9_]+):(\d+)>/g,
      (_, name, id) => `<img src="https://cdn.discordapp.com/emojis/${id}.png" alt="${name}" style="width:20px;height:20px;vertical-align:middle;" />`
    )
    // Convert timestamps
    .replace(/<t:(\d+):R>/g, (_, timestamp) => {
      const date = new Date(parseInt(timestamp) * 1000);
      return date.toLocaleTimeString();
    })
    // Convert bold text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    // Convert italics
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    // Convert underline
    .replace(/__(.*?)__/g, "<u>$1</u>");

  const processedMessage = {
    id: message.id,
    author: message.author?.username || "Unknown",
    authorId: message.author?.id,
    authorTag: message.author?.tag,
    isBot: message.author?.bot || false,
    content: processedContent.trim(),
    rawContent: message.content,
    createdAt: message.createdTimestamp,
    createdISO: new Date(message.createdTimestamp).toISOString(),
    hasEmbeds: message.embeds?.length > 0,
    embedCount: message.embeds?.length || 0,
    channelId: message.channel?.id,
    channelName: message.channel?.name,
    attachments: message.attachments?.map(att => ({
      url: att.url,
      name: att.name,
      contentType: att.contentType
    })) || []
  };

  console.log("✅ Processed message:", {
    id: processedMessage.id,
    author: processedMessage.author,
    contentPreview: processedMessage.content.substring(0, 100) + "...",
    hasEmbeds: processedMessage.hasEmbeds
  });

  return processedMessage;
};

// === On bot ready ===
client.once("ready", async () => {
  console.log("🤖 === Bot is ready ===");
  console.log("Logged in as:", client.user.tag);
  console.log("Bot ID:", client.user.id);
  console.log("Monitoring channel ID:", CHANNEL_ID);

  if (!CHANNEL_ID) {
    console.warn("⚠️ CHANNEL_ID not set — cannot fetch initial messages");
    return;
  }

  try {
    console.log("📥 Fetching initial messages from channel:", CHANNEL_ID);
    const channel = await client.channels.fetch(CHANNEL_ID);
    
    if (!channel) {
      console.error("❌ Channel not found or bot doesn't have access");
      return;
    }

    console.log("✅ Channel fetched:", channel.name);
    console.log("Channel type:", channel.type);

    // Fetch recent messages (last 20 for initial sync)
    const messages = await channel.messages.fetch({ limit: 20 });
    console.log(`📨 Fetched ${messages.size} initial messages`);

    // Process and send messages in order (oldest first)
    const sortedMessages = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    const processedMessages = sortedMessages.map(processMessage);

    let sentCount = 0;
    for (const msg of processedMessages) {
      console.log(`📤 Sending initial message ${++sentCount}/${processedMessages.length} to Next.js`);
      await postToNext(msg);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`✅ Completed initial sync of ${sentCount} messages`);
  } catch (error) {
    console.error("❌ Error during initial setup:", error);
  }
});

// === On new message ===
client.on("messageCreate", async (message) => {
  console.log("💬 === New message received ===");
  console.log("Channel ID:", message.channel?.id);
  console.log("Author:", message.author?.tag, "(Bot:", message.author?.bot + ")");
  console.log("Content preview:", message.content?.substring(0, 100) + "...");
  console.log("Embeds:", message.embeds?.length || 0);

  // Only process messages from the specified channel
  if (CHANNEL_ID && message.channel?.id !== CHANNEL_ID) {
    console.log("⏭️  Skipping message from other channel");
    return;
  }

  // Remove bot filter to capture all messages including from other bots
  // If you want to filter out your own bot, use:
  // if (message.author.id === client.user.id) return;

  try {
    const processed = processMessage(message);
    console.log("📤 Sending new message to Next.js API");
    await postToNext(processed);
    console.log("✅ Message sent successfully");
  } catch (error) {
    console.error("❌ Error processing new message:", error);
  }
});

// === Error handling ===
client.on("error", (error) => {
  console.error("❌ Discord client error:", error);
});

client.on("warn", (warning) => {
  console.warn("⚠️ Discord client warning:", warning);
});

// === Login ===
console.log("🚀 Attempting to log in Discord bot...");
client.login(process.env.DISCORD_TOKEN).catch((error) => {
  console.error("❌ Failed to login:", error);
  process.exit(1);
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("🛑 Shutting down bot...");
  client.destroy();
  process.exit(0);
});



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
