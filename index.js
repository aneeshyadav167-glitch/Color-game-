const express = require("express");
const TelegramBot = require("node-telegram-bot-api");

const app = express();

// 🔑 YOUR DATA (already added)
const TOKEN = "8728782119:AAEjJ8ILVExhS3WeA8M4jxs8i_mcGL2AJ-4";
const ADMIN_ID = 6008064617;

// 🌐 URL auto
const URL = process.env.RENDER_EXTERNAL_URL || "";

const bot = new TelegramBot(TOKEN);

// 🔥 webhook auto
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

  bot.sendMessage(id, `🎮 Welcome!\n💰 Points: ${users[id].points}`);
});

// 🔑 ADMIN PANEL
bot.onText(/\/admin/, (msg) => {
  if (msg.chat.id != ADMIN_ID) return;

  bot.sendMessage(
    msg.chat.id,
    `⚙️ Admin:
/startgame 30sec
/startgame 1min
/startgame 5min
/startgame 30min

/setresult 8 red up
/stats`
  );
});

// 🎮 START GAME + UI
bot.onText(/\/startgame (.+)/, (msg, match) => {
  if (msg.chat.id != ADMIN_ID) return;

  let input = match[1].toLowerCase().trim();

  let timeMap = {
    "30sec": 30,
    "1min": 60,
    "5min": 300,
    "30min": 1800
  };

  if (!timeMap[input]) {
    bot.sendMessage(msg.chat.id, "❌ Invalid type");
    return;
  }

  bets = [];
  bettingOpen = true;

  let keyboard = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🔴 Red", callback_data: "red" },
          { text: "🔵 Blue", callback_data: "blue" },
          { text: "🟡 Yellow", callback_data: "yellow" }
        ],
        [
          { text: "0", callback_data: "0" },
          { text: "1", callback_data: "1" },
          { text: "2", callback_data: "2" }
        ],
        [
          { text: "3", callback_data: "3" },
          { text: "4", callback_data: "4" },
          { text: "5", callback_data: "5" }
        ],
        [
          { text: "6", callback_data: "6" },
          { text: "7", callback_data: "7" },
          { text: "8", callback_data: "8" }
        ],
        [
          { text: "9", callback_data: "9" }
        ],
        [
          { text: "⬆️ Up", callback_data: "up" },
          { text: "⬇️ Down", callback_data: "down" }
        ]
      ]
    }
  };

  bot.sendMessage(msg.chat.id, `🎮 ${input} Round Started!\nChoose your bet 👇`, keyboard);

  let t = timeMap[input];

  let interval = setInterval(() => {
    t--;

    if (t <= 8) bettingOpen = false;

    if (t <= 0) {
      clearInterval(interval);
      endRound();
    }
  }, 1000);
});

// 🎯 BUTTON BET
bot.on("callback_query", (query) => {
  let choice = query.data;
  let userId = query.message.chat.id;

  if (!bettingOpen) {
    bot.answerCallbackQuery(query.id, { text: "⛔ Betting closed!" });
    return;
  }

  bets.push({ user: userId, choice });

  bot.answerCallbackQuery(query.id, {
    text: `✅ Bet on ${choice}`
  });
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

app.get("/", (req, res) => res.send("Bot Running ✅"));

// 🔥 PORT FIX
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("✅ Server running on port " + PORT);
});