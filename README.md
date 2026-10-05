# Math Arena v2.1

A competitive arithmetic game for exam-style speed training.

## Features
- Solo Sprint with adaptive difficulty
- Local 2-player Pass & Play duel
- Real-time Internet 2-player rooms using WebSockets
- Server-authoritative online scoring and answer validation
- Addition, subtraction, multiplication and division filters
- Optional negative marking
- Timer, lives, streak multipliers, XP and career statistics
- Solo/Local power-ups: 50–50, +5 seconds, one-hit shield
- Generated meme-style fail sound (no external/copyrighted sound file)
- Keyboard answers: 1, 2, 3, 4
- Achievements and local leaderboard
- Responsive mobile/desktop UI
- **No external Node packages required**

## Run locally
```bash
node server.js
```
Then open `http://localhost:3000`.

For two devices on the same Wi-Fi, open the host computer's LAN IP with port 3000 on both devices (firewall permitting).

## Internet multiplayer
Deploy this folder to a Node.js host/VPS that supports HTTP upgrade/WebSockets, start it with `node server.js`, and have both players open the same HTTPS URL. The game automatically uses `wss://` when served over HTTPS.

## Standalone mode
Opening `index.html` directly supports Solo and Local Duel. Online rooms need the included server.
