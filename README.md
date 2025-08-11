 # Ludo Multiplayer

 A fast, modern, and highly polished Ludo game with Online Multiplayer and Local (Human vs AI) modes. Built with Node.js, Express, and Socket.IO on the backend and a custom-rendered board on the frontend. Comes with animated themes, sound, smart turn logic, and a slick lobby experience.

 ## ✨ Highlights

 - Online multiplayer with room codes (up to 4 players)
 - Local mode: Human vs AI (2–4 players)
 - True Ludo rules with safe spots, captures, home paths, and turn timers
 - Polished visuals: animated themes (Cyberpunk, Egypt, Jurassic, Space)
 - In-game chat with toggle and message color by player
 - Smart UX: auto-move when only one token can move, bonus turns on six, capture bonuses
 - Anti-abuse rule: after two consecutive sixes, dice rolls are limited to 1–5
 - Responsive UI, sound effects, and persistent settings (theme, mute, chat visibility)

 ## 🧩 Architecture

 - Backend: `Express` + `Socket.IO` (see `server.js`)
 - Game engines:
	 - Multiplayer engine: `game.js`
	 - Local engine (with AI option): `local-game.js`
 - Client: `index.html`, `script.js`, `style.css`, `lobby.css`
 - Assets: `assets/` (audio, images, icons)

 ## 🚀 Quick Start

 ### Prerequisites
 - Node.js 18+ (works on 22 as well)

 ### Install
 ```bash
 npm install
 ```

 ### Run
 ```bash
 npm start
 ```
 The server starts on http://localhost:3000

 ### Play Online
 1. Open the game in your browser
 2. Click "Create Game" to get a room code
 3. Share the code with friends; they Join using the code
 4. Host clicks "Start Game" when 2–4 players are in

 ### Play Local
 1. Switch to Local Game
 2. Choose number of players (2–4)
 3. Choose Human or AI per color
 4. Start and play on one device

 ## 🎮 Rules & Mechanics

 - Turn order (4 players): Red → Green → Yellow → Blue
 - Dice roll timer per turn: 30s
 - Starting a token: requires a six
 - Safe spots: 1, 9, 14, 22, 27, 35, 40, 48 (no captures here)
 - Captures: send opponent to base; capturing grants an extra roll
 - Home path per color with correct entrances and final home tile
 - Bonus turn: on rolling six or making a capture or reaching final home
 - Anti-abuse: after 2 consecutive sixes, next roll is 1–5 only
 - Auto-move: if only one token can move, it moves automatically after a brief delay

 ## 🗂️ Key Files

 - `server.js` — Express + Socket.IO server, room management, relays moves
 - `game.js` — Multiplayer game logic and state machine
 - `local-game.js` — Local game logic with optional AI
 - `script.js` — Client UI, rendering, sockets, chat, themes, audio
 - `index.html` — App shell and UI controls
 - `style.css` / `lobby.css` — Styling for board and lobby

 ## 🛠️ Development Notes

 - Hot reload isn’t configured; restart the server after backend changes
 - Client caches aggressively; do a hard refresh when editing `script.js`
 - Logs are written to console (consider log files for production)

 ## 🧪 Sanity Utilities (optional)
 This repo includes some helper scripts used during development:
 - `verify-positions.js`, `test-paths.js`, `home-path-fix.js` – validate board coordinates and home-path logic

 Run them with Node if needed.

 ## 🔐 Hosting Tips
 - Set `PORT` env var for deployment platforms
 - Use a reverse proxy (Nginx) with WebSocket support for production

 ## 🙌 Credits
 - Built with vanilla JS, Socket.IO, and lots of love
 - Sounds and theme assets are bundled in `assets/`

 ## 🧭 Roadmap Ideas
 - Ranked matchmaking, reconnect support
 - Spectator mode and game replays
 - Bot difficulty levels and heuristics

 ---

 If you like this project, consider starring it and sharing a screenshot of your winning board!

