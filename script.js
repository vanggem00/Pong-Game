// Simple Pong game with touch support, pause/win overlays, and keyboard remapping
(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const leftScoreEl = document.getElementById('leftScore');
  const rightScoreEl = document.getElementById('rightScore');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resumeBtn = document.getElementById('resumeBtn');
  const restartBtn = document.getElementById('restartBtn');
  const overlay = document.getElementById('overlay');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayMsg = document.getElementById('overlayMsg');

  const winScoreInput = document.getElementById('winScore');
  const touchToggle = document.getElementById('touchToggle');
  const remapUpBtn = document.getElementById('remapUpBtn');
  const remapDownBtn = document.getElementById('remapDownBtn');
  const soundToggle = document.getElementById('soundToggle');

  const W = canvas.width;
  const H = canvas.height;

  // Game objects
  const paddleWidth = 12;
  const paddleHeight = 110;
  const paddleInset = 20;

  const leftPaddle = {
    x: paddleInset,
    y: (H - paddleHeight) / 2,
    w: paddleWidth,
    h: paddleHeight,
    vy: 0,
    speed: 6
  };

  const rightPaddle = {
    x: W - paddleInset - paddleWidth,
    y: (H - paddleHeight) / 2,
    w: paddleWidth,
    h: paddleHeight,
    speed: 4.0
  };

  const ball = {
    x: W / 2,
    y: H / 2,
    r: 8,
    speed: 5,
    vx: 0,
    vy: 0
  };

  let leftScore = 0;
  let rightScore = 0;
  let running = false;
  let lastTime = 0;
  let gameOver = false;
  let paused = false;

  // Keyboard mapping (remappable)
  let keyUp = 'ArrowUp';
  let keyDown = 'ArrowDown';
  let remapping = null; // 'up' or 'down' or null
  const keyState = {}; // current pressed keys

  // sound
  const beep = (() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      return (freq, dur = 0.06, vol = 0.02) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'sine';
        o.frequency.value = freq;
        g.gain.value = vol;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        o.stop(ctx.currentTime + dur);
      };
    } catch (e) {
      return () => {};
    }
  })();

  function playSound(freq) {
    if (soundToggle.checked) beep(freq);
  }

  function resetBall(servingToLeft = false) {
    ball.x = W / 2;
    ball.y = H / 2;
    ball.speed = 5;
    const angle = (Math.random() * Math.PI / 3) - (Math.PI / 6); // -30..30 deg
    const dir = servingToLeft ? -1 : 1;
    ball.vx = dir * Math.cos(angle) * ball.speed;
    ball.vy = Math.sin(angle) * ball.speed;
  }

  function startGame() {
    leftScore = 0;
    rightScore = 0;
    updateScores();
    resetBall(Math.random() < 0.5);
    running = true;
    gameOver = false;
    paused = false;
    hideOverlay();
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function updateScores() {
    leftScoreEl.textContent = String(leftScore);
    rightScoreEl.textContent = String(rightScore);
  }

  // Paddle controls: mouse
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const y = e.clientY - rect.top;
    leftPaddle.y = clamp(y - leftPaddle.h / 2, 0, H - leftPaddle.h);
  });

  // Touch controls (mobile)
  function handleTouch(e) {
    if (!touchToggle.checked) return;
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    // Use the first touch to control paddle
    const t = e.touches[0] || e.changedTouches[0];
    if (!t) return;
    const y = t.clientY - rect.top;
    leftPaddle.y = clamp(y - leftPaddle.h / 2, 0, H - leftPaddle.h);
  }
  canvas.addEventListener('touchstart', handleTouch, { passive: false });
  canvas.addEventListener('touchmove', handleTouch, { passive: false });

  // Keyboard controls - dynamic mapping
  window.addEventListener('keydown', (e) => {
    // If in remapping mode capture this key
    if (remapping) {
      e.preventDefault();
      const key = e.key;
      if (remapping === 'up') {
        keyUp = key;
        remapUpBtn.textContent = keyUp;
      } else if (remapping === 'down') {
        keyDown = key;
        remapDownBtn.textContent = keyDown;
      }
      remapping = null;
      remapUpBtn.classList.remove('active');
      remapDownBtn.classList.remove('active');
      return;
    }

    // Normal behavior
    keyState[e.key] = true;

    // Space to start/pause/resume
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      if (gameOver) {
        startGame();
      } else {
        togglePause();
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    keyState[e.key] = false;
  });

  // Remap buttons
  remapUpBtn.addEventListener('click', () => {
    remapping = 'up';
    remapUpBtn.classList.add('active');
    remapUpBtn.textContent = 'Press any key...';
    remapDownBtn.classList.remove('active');
  });

  remapDownBtn.addEventListener('click', () => {
    remapping = 'down';
    remapDownBtn.classList.add('active');
    remapDownBtn.textContent = 'Press any key...';
    remapUpBtn.classList.remove('active');
  });

  // Utility
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  // Collision detection: paddles as rects
  function checkPaddleCollision(p, b) {
    // simple AABB collision
    return (b.x - b.r < p.x + p.w) &&
           (b.x + b.r > p.x) &&
           (b.y - b.r < p.y + p.h) &&
           (b.y + b.r > p.y);
  }

  function loop(now) {
    const dt = Math.min(1 / 30, (now - lastTime) / 1000);
    lastTime = now;
    if (running && !paused && !gameOver) update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    // Move left paddle with keyboard if pressed (mapped keys)
    if (keyState[keyUp]) leftPaddle.y -= leftPaddle.speed;
    if (keyState[keyDown]) leftPaddle.y += leftPaddle.speed;
    leftPaddle.y = clamp(leftPaddle.y, 0, H - leftPaddle.h);

    // Simple AI for right paddle: follow ball with limited speed and some easing
    const targetY = ball.y - rightPaddle.h / 2;
    const diff = targetY - rightPaddle.y;
    const difficultyFactor = 1 + (leftScore - rightScore) * 0.08;
    const aiSpeed = clamp(rightPaddle.speed * difficultyFactor, 2.5, 12);
    rightPaddle.y += clamp(diff, -aiSpeed, aiSpeed);
    rightPaddle.y = clamp(rightPaddle.y, 0, H - rightPaddle.h);

    // Move ball
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Wall collisions
    if (ball.y - ball.r <= 0) {
      ball.y = ball.r;
      ball.vy *= -1;
      playSound(200);
    } else if (ball.y + ball.r >= H) {
      ball.y = H - ball.r;
      ball.vy *= -1;
      playSound(200);
    }

    // Check paddle collisions
    if (checkPaddleCollision(leftPaddle, ball) && ball.vx < 0) {
      ball.x = leftPaddle.x + leftPaddle.w + ball.r + 0.1;
      reflectFromPaddle(leftPaddle, false);
      playSound(320);
    } else if (checkPaddleCollision(rightPaddle, ball) && ball.vx > 0) {
      ball.x = rightPaddle.x - ball.r - 0.1;
      reflectFromPaddle(rightPaddle, true);
      playSound(320);
    }

    // Score: ball passed left or right edge
    if (ball.x + ball.r < 0) {
      // right player scores
      rightScore += 1;
      updateScores();
      checkWinAndServe(false);
    } else if (ball.x - ball.r > W) {
      leftScore += 1;
      updateScores();
      checkWinAndServe(true);
    }
  }

  function checkWinAndServe(servingToLeft) {
    const winTo = Math.max(1, parseInt(winScoreInput.value, 10) || 5);
    if (leftScore >= winTo || rightScore >= winTo) {
      // someone won
      gameOver = true;
      running = false;
      paused = false;
      showOverlayWin();
    } else {
      // continue: serve toward the player who last lost (i.e., serve from center toward opponent)
      resetBall(Math.random() < 0.5);
    }
  }

  function reflectFromPaddle(paddle, invert = false) {
    // Calculate where on the paddle the ball hit
    const relativeIntersectY = (ball.y - (paddle.y + paddle.h / 2));
    const normalizedRelativeIntersectionY = relativeIntersectY / (paddle.h / 2);
    const maxBounceAngle = Math.PI / 3; // 60 degrees
    const bounceAngle = normalizedRelativeIntersectionY * maxBounceAngle;

    // Determine direction so ball moves away from the paddle
    const dir = paddle === leftPaddle ? 1 : -1;
    const newSpeed = ball.speed * 1.07; // speed up a bit each hit
    ball.speed = clamp(newSpeed, 5, 20);

    ball.vx = dir * Math.cos(bounceAngle) * ball.speed;
    ball.vy = Math.sin(bounceAngle) * ball.speed;
  }

  // drawing
  function drawNet() {
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function draw() {
    // clear
    ctx.clearRect(0, 0, W, H);

    // net
    drawNet();

    // paddles
    ctx.fillStyle = '#00d4ff';
    roundRectFill(ctx, leftPaddle.x, leftPaddle.y, leftPaddle.w, leftPaddle.h, 6);
    roundRectFill(ctx, rightPaddle.x, rightPaddle.y, rightPaddle.w, rightPaddle.h, 6);

    // ball (with glow)
    ctx.save();
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,212,255,0.35)';
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function roundRectFill(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    ctx.fill();
  }

  // UI wiring
  startBtn.addEventListener('click', () => {
    startGame();
  });

  pauseBtn.addEventListener('click', () => {
    togglePause();
  });

  resumeBtn.addEventListener('click', () => {
    hideOverlay();
    paused = false;
    if (!gameOver) {
      running = true;
      lastTime = performance.now();
      requestAnimationFrame(loop);
    }
  });

  restartBtn.addEventListener('click', () => {
    startGame();
  });

  function togglePause() {
    if (gameOver) return;
    paused = !paused;
    if (paused) {
      showOverlayPaused();
      running = false;
    } else {
      hideOverlay();
      running = true;
      lastTime = performance.now();
      requestAnimationFrame(loop);
    }
  }

  function showOverlayPaused() {
    overlayTitle.textContent = 'Paused';
    overlayMsg.textContent = 'Press Resume or Space to continue.';
    overlay.classList.remove('hidden');
  }

  function showOverlayWin() {
    overlayTitle.textContent = (leftScore > rightScore) ? 'You Win!' : 'Computer Wins';
    overlayMsg.textContent = `Final score — You ${leftScore} : ${rightScore}. Press Restart or Space to play again.`;
    overlay.classList.remove('hidden');
  }

  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  // Start state: paused with stationary ball
  remapUpBtn.textContent = keyUp;
  remapDownBtn.textContent = keyDown;
  resetBall(Math.random() < 0.5);
  draw();

  // helpful: pause/resume with space already wired in key handler

})();
