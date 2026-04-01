const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const app = express();

// 🔑 IMPORTANT (FILL THESE)
const TOKEN = "8728782119:AAEjJ8ILVExhS3WeA8M4jxs8i_mcGL2AJ-4";
const ADMIN_ID = 6008064617;

// ❗ Safety check
if (!TOKEN || TOKEN === "PASTE_YOUR_TOKEN_HERE") {
  console.log("❌ TOKEN missing");
  process.exit(1);
}

// 🌐 URL (Render auto)
const URL = process.env.RENDER_EXTERNAL_URL || "";

// ✅ Bot init (SAFE)
const bot = new TelegramBot(TOKEN);

// 🔥 Webhook only if URL exists
if (URL) {
  bot.setWebHook(URL);
}

// 📊 DATA
let users = {};
let bets = [];
let bettingOpen = false;
let currentResult = null;

// 🟢 START
bot.onText(/\/start/, (msg) => {
  const id = msg.chat.id;

  if (!users[id]) {
    users[id] = { points: 1000 };
  }

  bot.sendMessage(id, `🎮 Welcome\n💰 Points: ${users[id].points}`);
});

// 🔑 ADMIN
bot.onText(/\/admin/, (msg) => {
  if (msg.chat.id != ADMIN_ID) return;

  bot.sendMessage(msg.chat.id, `⚙️ Admin:
/startgame 30
/stats
/setresult 8 red up`);
});

// 🎮 START GAME
bot.onText(/\/startgame (.+)/, (msg, match) => {
  if (msg.chat.id != ADMIN_ID) return;

  let time = parseInt(match[1]);
  bets = [];
  bettingOpen = true;

  bot.sendMessage(msg.chat.id, `⏱️ Game started: ${time}s`);

  let t = time;

  let interval = setInterval(() => {
    t--;

    if (t <= 8) bettingOpen = false;

    if (t <= 0) {
      clearInterval(interval);
      endRound();
    }
  }, 1000);
});

// 🎯 BET
bot.on("message", (msg) => {
  if (!bettingOpen) return;

  let id = msg.chat.id;
  let choice = msg.text?.toLowerCase();

  bets.push({ user: id, choice });

  bot.sendMessage(id, `✅ Bet: ${choice}`);
});

// 🎯 MANUAL RESULT
bot.onText(/\/setresult (.+)/, (msg, match) => {
  if (msg.chat.id != ADMIN_ID) return;

  let p = match[1].split(" ");
  currentResult = {
    number: p[0],
    color: p[1],
    updown: p[2],
  };

  bot.sendMessage(msg.chat.id, "⚠️ Manual result set");
});

// 🧠 END ROUND
function endRound() {
  let result;

  if (currentResult) {
    result = currentResult;
    currentResult = null;
  } else {
    let n = Math.floor(Math.random() * 10);
    result = {
      number: n.toString(),
      color: n % 3 == 0 ? "red" : n % 3 == 1 ? "blue" : "yellow",
      updown: n >= 5 ? "up" : "down",
    };
  }

  bets.forEach((b) => {
    if (!users[b.user]) return;

    if (b.choice == result.number) users[b.user].points += 90;
    else if (b.choice == result.color) users[b.user].points += 30;
    else if (b.choice == result.updown) users[b.user].points += 20;
    else users[b.user].points -= 10;
  });

  Object.keys(users).forEach((uid) => {
    bot.sendMessage(
      uid,
      `🎯 Result:
Number: ${result.number}
Color: ${result.color}
Up/Down: ${result.updown}

💰 Points: ${users[uid].points}`
    );
  });
}

// 📊 STATS
bot.onText(/\/stats/, (msg) => {
  if (msg.chat.id != ADMIN_ID) return;

  let s = {};
  bets.forEach((b) => {
    s[b.choice] = (s[b.choice] || 0) + 1;
  });

  bot.sendMessage(msg.chat.id, JSON.stringify(s, null, 2));
});

// 🌐 SERVER
app.use(express.json());

app.post("/", (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("Bot Running ✅");
});

// 🔥 PORT FIX
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("✅ Server running on port " + PORT);
});