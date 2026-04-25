# Simple Pong

A small Pong game built with HTML, CSS, and JavaScript.

Features
- Left paddle controlled by mouse, touch, or keyboard.
- Right paddle is a simple computer AI.
- Ball with bounce and paddle collision physics.
- Scoreboard and "first to N" win condition (best-of-N behavior by setting target).
- Pause/resume overlay.
- Mobile touch support (touch and drag the left paddle).
- Keyboard remapping: capture new keys for Up/Down.
- Sound effects (toggleable).

Files
- `index.html` — main HTML file and UI.
- `style.css` — styles for the game and overlays.
- `script.js` — game logic, input handling, AI, and UI wiring.

How to run
1. Save `index.html`, `style.css`, and `script.js` (and this `README.md`) in the same folder.
2. Open `index.html` in a modern browser (Chrome, Firefox, Edge, Safari).
3. Click "Start / Restart" or press Space to start the game.

Controls
- Mouse: move your mouse over the canvas to move the left paddle.
- Touch: touch and drag on the canvas (enabled by default).
- Keyboard: default is ArrowUp / ArrowDown. You can remap keys using the "Remap Up" and "Remap Down" buttons — click a remap button, then press the key you want to use.
- Pause / Resume: click Pause or press Space.
- Restart: click Start / Restart or use the Restart button in overlays.

Win condition
- Set "Winning score (first to)" to the number of points required to win (default 5). Game ends when either player reaches that score, and a win overlay appears.

Settings
- Enable/disable touch controls with the "Enable touch controls" checkbox.
- Toggle sound with the "Sound" checkbox.
- Change the winning score using the numeric input.

Customization
- Change AI difficulty: edit `rightPaddle.speed` in `script.js` (higher is harder).
- Change paddle sizes or ball speed in `script.js`.

Notes
- The game uses simple physics and a small speed-up on paddle hits to make rallies more interesting.
- On mobile, touch drag is used to move the left paddle. If you prefer keyboard-only on devices with keyboards, disable touch in the settings panel.

If you'd like:
- Online multiplayer (WebRTC / sockets),
- Additional visual themes,
- Improved AI (predictive or difficulty slider),
tell me which you'd like next and I can add it.
