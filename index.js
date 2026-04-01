const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const app = express();

// 🔑 REQUIRED
const BOT_TOKEN = "8728782119:AAEjJ8ILVExhS3WeA8M4jxs8i_mcGL2AJ-4";
const ADMIN_ID = 6008064617;

// 🌐 AUTO URL (Render se aayega)
const URL = process.env.RENDER_EXTERNAL_URL;

const bot = new TelegramBot(TOKEN);

// 🔥 AUTO WEBHOOK
if (URL) {
  bot.setWebHook(URL);
}

// 📊 DATA
let users = {};
let bets = [];
let history = [];
let bettingOpen = false;
let currentResult = null;

// 🟢 START
bot.onText(/\/start/, (msg) => {
  const id = msg.chat.id;

  if (!users[id]) {
    users[id] = { points: 1000 };
  }

  bot.sendMessage(id, `🎮 Welcome!\n💰 Points: ${users[id].points}`);
});

// 🔑 ADMIN PANEL
bot.onText(/\/admin/, (msg) => {
  if (msg.chat.id != ADMIN_ID) return;

  bot.sendMessage(
    msg.chat.id,
    `⚙️ Admin Panel:
/startgame 30
/stats
/setresult number color updown`
  );
});

// 🎮 START GAME
bot.onText(/\/startgame (.+)/, (msg, match) => {
  if (msg.chat.id != ADMIN_ID) return;

  let time = parseInt(match[1]);
  bets = [];
  bettingOpen = true;

  bot.sendMessage(msg.chat.id, `⏱️ Game started for ${time}s`);

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

// 🎯 PLACE BET
bot.on("message", (msg) => {
  const id = msg.chat.id;

  if (!bettingOpen) return;

  let choice = msg.text.toLowerCase();

  bets.push({ user: id, choice });

  bot.sendMessage(id, `✅ Bet on: ${choice}`);
});

// 🎯 SET RESULT (ADMIN)
bot.onText(/\/setresult (.+)/, (msg, match) => {
  if (msg.chat.id != ADMIN_ID) return;

  let parts = match[1].split(" ");
  currentResult = {
    number: parts[0],
    color: parts[1],
    updown: parts[2],
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
    let num = Math.floor(Math.random() * 10);
    result = {
      number: num.toString(),
      color: num % 3 == 0 ? "red" : num % 3 == 1 ? "blue" : "yellow",
      updown: num >= 5 ? "up" : "down",
    };
  }

  // 💰 CALCULATE
  bets.forEach((b) => {
    if (!users[b.user]) return;

    if (b.choice == result.number) users[b.user].points += 90;
    else if (b.choice == result.color) users[b.user].points += 30;
    else if (b.choice == result.updown) users[b.user].points += 20;
    else users[b.user].points -= 10;
  });

  // 📊 HISTORY
  history.unshift(result);
  history = history.slice(0, 10);

  // 📢 RESULT SEND
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

  let stats = {};

  bets.forEach((b) => {
    stats[b.choice] = (stats[b.choice] || 0) + 1;
  });

  bot.sendMessage(msg.chat.id, JSON.stringify(stats, null, 2));
});

// 🌐 SERVER
app.use(express.json());

app.post("/", (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.get("/", (req, res) => res.send("Bot Running ✅"));

// 🔥 FIXED PORT (IMPORTANT)
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});