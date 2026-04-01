const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const app = express();
const bot = new TelegramBot(process.env.TOKEN);

bot.setWebHook(process.env.WEBHOOK_URL);

let adminId = 6008064617; // 👈 yaha apna ID daalna

let users = {};
let bets = [];
let bettingOpen = false;
let timeLeft = 0;
let currentResult = null;

// START
bot.onText(/\/start/, (msg) => {
  const id = msg.chat.id;

  if (!users[id]) {
    users[id] = { points: 1000 };
  }

  bot.sendMessage(id, `Welcome 🎮\nPoints: ${users[id].points}`);
});

// ADMIN PANEL
bot.onText(/\/admin/, (msg) => {
  if (msg.chat.id != adminId) return;

  bot.sendMessage(msg.chat.id, "Admin Panel:\n/startgame\n/stats\n/setresult number color updown");
});

// START GAME
bot.onText(/\/startgame (.+)/, (msg, match) => {
  if (msg.chat.id != adminId) return;

  timeLeft = parseInt(match[1]);
  bettingOpen = true;
  bets = [];

  bot.sendMessage(msg.chat.id, `Game started for ${timeLeft}s`);

  let interval = setInterval(() => {
    timeLeft--;

    if (timeLeft <= 8) {
      bettingOpen = false;
    }

    if (timeLeft <= 0) {
      clearInterval(interval);
      endRound();
    }
  }, 1000);
});

// PLACE BET
bot.on("message", (msg) => {
  const id = msg.chat.id;
  if (!bettingOpen) return;

  let choice = msg.text.toLowerCase();

  bets.push({ user: id, choice, amount: 10 });

  bot.sendMessage(id, `Bet placed on ${choice}`);
});

// SET RESULT (ADMIN)
bot.onText(/\/setresult (.+)/, (msg, match) => {
  if (msg.chat.id != adminId) return;

  let parts = match[1].split(" ");
  currentResult = {
    number: parts[0],
    color: parts[1],
    updown: parts[2],
  };

  bot.sendMessage(msg.chat.id, "Result set manually");
});

// END ROUND
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

  bets.forEach((b) => {
    if (!users[b.user]) return;

    if (b.choice == result.number) users[b.user].points += 90;
    else if (b.choice == result.color) users[b.user].points += 30;
    else if (b.choice == result.updown) users[b.user].points += 20;
    else users[b.user].points -= 10;
  });

  bot.sendMessage(adminId, `Result: ${JSON.stringify(result)}`);
}

// STATS
bot.onText(/\/stats/, (msg) => {
  if (msg.chat.id != adminId) return;

  let stats = {};
  bets.forEach((b) => {
    stats[b.choice] = (stats[b.choice] || 0) + 1;
  });

  bot.sendMessage(msg.chat.id, JSON.stringify(stats, null, 2));
});

// SERVER
app.use(express.json());
app.post("/", (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.get("/", (req, res) => res.send("Bot Running"));

app.listen(3000);
