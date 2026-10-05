# 🧮 Math Arena v2.1

A fast-paced **competitive mathematics quiz game** designed for exam-style practice, speed training, and multiplayer competition.

Math Arena supports **Solo**, **local 2-player**, and **real-time online 2-player** gameplay with timers, streaks, power-ups, negative marking, achievements, and live scoring.

## 🎮 Live Demo

👉 **[Play Math Arena Live](https://shayan-chakra.github.io/Math-Arena/)**

## 🎮 Features

- 🧠 **Solo Sprint** with adaptive difficulty
- ⚔️ **Local 2-Player Pass & Play**
- 🌐 **Real-Time Online 2-Player Battle** using WebSockets
- 🏆 Server-authoritative online scoring and answer validation
- ➕ Addition
- ➖ Subtraction
- ✖️ Multiplication
- ➗ Division
- 🎯 Operation filters
- 📉 Optional negative marking
- ⏱️ Timed questions
- ❤️ Lives system
- 🔥 Streak and score multipliers
- ⚡ Speed bonuses
- ⭐ XP and career statistics
- 🛡️ Power-ups:
  - **50–50** — removes two wrong options
  - **Time Freeze** — adds extra time
  - **Shield** — protects against one mistake/timeout
- 🔊 Generated meme-style wrong-answer/fail sound
- ⌨️ Keyboard controls: **1 / 2 / 3 / 4**
- 🏅 Achievements
- 📋 Local leaderboard
- 📱 Responsive desktop/mobile interface
- 🚫 No external Node packages required by the current server

---

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript
- **Backend:** Node.js
- **Multiplayer:** WebSocket
- **Hosting:** GitHub Pages (frontend) + Render (multiplayer server)
- **Storage:** Browser local storage for local statistics/leaderboard

---

# 🚀 Run Locally

### 1. Clone the repository

```bash
git clone https://github.com/YOUR-USERNAME/math-arena.git
cd math-arena
```

### 2. Start the server

```bash
node server.js
```

### 3. Open the game

```text
http://localhost:3000
```

Open the URL in your browser and select a game mode.

---

# 🌐 Deploy the Game Publicly

The project uses two parts for online multiplayer:

```text
GitHub Pages
    ↓
Game frontend (HTML/CSS/JS)
    ↓
WebSocket connection
    ↓
Render
    ↓
Node.js multiplayer server
```

GitHub Pages can host the frontend, but it **cannot run the Node.js/WebSocket server itself**.

## Step 1 — Push the project to GitHub

Create a public repository such as:

```text
math-arena
```

Upload these files:

```text
index.html
app.js
styles.css
server.js
package.json
README.md
.gitignore
```

## Step 2 — Enable GitHub Pages

In your GitHub repository:

```text
Settings
→ Pages
→ Build and deployment
→ Deploy from a branch
→ main
→ / (root)
→ Save
```

Your public game will normally be available at:

```text
https://YOUR-USERNAME.github.io/math-arena/
```

## Step 3 — Deploy the multiplayer server on Render

Create a **Web Service** on Render and connect the same GitHub repository.

Recommended settings:

```text
Runtime: Node
Build Command: npm install
Start Command: node server.js
```

After deployment, Render gives you an HTTPS address similar to:

```text
https://math-arena-ob5t.onrender.com
```

## Step 4 — Connect the frontend to Render

Open `app.js` and find the `connectWS()` function.

Set the WebSocket server URL to your Render service:

```javascript
const server = 'wss://math-arena-ob5t.onrender.com';
```

For another Render service, replace the hostname with your own service URL.

**Important:**

```text
https://...     → normal web URL
wss://...       → WebSocket URL used by the game
```

Do not use `https://` inside `new WebSocket(...)`.

After changing `app.js`, commit and push the change:

```bash
git add app.js

git commit -m "Connect frontend to multiplayer server"

git push
```

---

# ⚔️ How Online Multiplayer Works

### Player 1

1. Open the GitHub Pages game
2. Select **Online Battle**
3. Select **Create Room**
4. Share the generated room code

### Player 2

1. Open the same GitHub Pages game
2. Select **Online Battle**
3. Select **Join Room**
4. Enter the room code

Both players then compete in the same live match.

---

# ⏱️ Render Free-Tier Note

The current deployment can use the Render free tier.

A free Render web service may **spin down after a period of inactivity**. When a player tries to use online multiplayer after the service has been sleeping, the first connection may take roughly **about a minute** while the service starts again.

This means:

```text
No activity
    ↓
Render service sleeps
    ↓
Player opens Online Battle
    ↓
Render starts the service
    ↓
Connection becomes available
```

This is normal behavior for the free tier and does not mean the game is broken.

For a portfolio/demo project, the free tier is usually sufficient. A paid always-on service can be used later if instant multiplayer availability is required.

---

# 💻 Standalone / Offline Mode

You can also open `index.html` directly for basic gameplay.

Supported without the multiplayer server:

- Solo mode
- Local 2-player Pass & Play
- Sounds and animations
- Power-ups
- Local statistics
- Local leaderboard

**Online Battle requires the WebSocket server.**

---

# 📁 Project Structure

```text
math-arena/
├── index.html       # Main game UI
├── app.js           # Game logic + WebSocket client
├── styles.css       # UI styling and responsive layout
├── server.js        # Node.js multiplayer server
├── package.json     # Project metadata/scripts
├── README.md        # Documentation
└── .gitignore       # Git exclusions
```

---

# 🔐 Security Notes

For a production-grade competitive platform, further security work would be recommended, including:

- Authenticated player accounts
- Persistent server-side player profiles
- Database-backed leaderboards
- Rate limiting
- Room abuse protection
- Stronger anti-cheat validation
- Secure production configuration
- Monitoring and logging

The current version is intended as a **portfolio/demo and competitive-practice project**.

---

# 📌 Roadmap

Possible future upgrades:

- 📚 Competitive-exam categories such as:
  - Percentages
  - Ratio & Proportion
  - Average
  - Profit & Loss
  - Simple & Compound Interest
  - Time & Work
  - Time, Speed & Distance
  - Number System
  - Simplification / BODMAS
- 🏆 Ranked matchmaking
- 🌍 Global leaderboard
- 📅 Daily challenges
- 👤 User accounts
- 📊 Persistent match history
- 🎖️ Ranks, seasons, and badges
- 🎮 Larger multiplayer rooms
- 📈 Detailed performance analytics

---

## 📄 License

Add the license you want to use for your repository (for example, MIT) before publishing the project as an open-source project.
