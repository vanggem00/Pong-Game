// Simple Pong game
(() => {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  const leftScoreEl = document.getElementById('leftScore');
  const rightScoreEl = document.getElementById('rightScore');
  const startBtn = document.getElementById('startBtn');
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
  let useMouse = true;

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

  // Keyboard controls
  const keys = { ArrowUp: false, ArrowDown: false };
  window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      keys[e.key] = true;
      e.preventDefault();
    }
    // Space to pause/start
    if (e.key === ' ' || e.code === 'Space') {
      if (!running) {
        startGame();
      } else {
        running = !running;
        if (running) {
          lastTime = performance.now();
          requestAnimationFrame(loop);
        }
      }
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      keys[e.key] = false;
      e.preventDefault();
    }
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
    if (running) update(dt);
    draw();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    // Move left paddle with keyboard if pressed
    if (keys.ArrowUp) leftPaddle.y -= leftPaddle.speed;
    if (keys.ArrowDown) leftPaddle.y += leftPaddle.speed;
    leftPaddle.y = clamp(leftPaddle.y, 0, H - leftPaddle.h);

    // Simple AI for right paddle: follow ball with limited speed and some easing
    const targetY = ball.y - rightPaddle.h / 2;
    const diff = targetY - rightPaddle.y;
    // Add small intentional imperfection based on score difference
    const difficultyFactor = 1 + (leftScore - rightScore) * 0.08;
    const aiSpeed = clamp(rightPaddle.speed * difficultyFactor, 2.5, 10);
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
      // place ball just outside paddle to avoid sticking
      ball.x = leftPaddle.x + leftPaddle.w + ball.r + 0.1;
      reflectFromPaddle(leftPaddle);
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
      running = true;
      // Serve toward left player (ball moves to right next)
      resetBall(false);
    } else if (ball.x - ball.r > W) {
      leftScore += 1;
      updateScores();
      running = true;
      resetBall(true);
    }
  }

  function reflectFromPaddle(paddle, invert = false) {
    // Calculate where on the paddle the ball hit
    const relativeIntersectY = (ball.y - (paddle.y + paddle.h / 2));
    const normalizedRelativeIntersectionY = relativeIntersectY / (paddle.h / 2);
    const maxBounceAngle = Math.PI / 3; // 60 degrees
    const bounceAngle = normalizedRelativeIntersectionY * maxBounceAngle;

    const direction = invert ? -1 : 1; // invert when hitting right paddle
    const newSpeed = ball.speed * 1.07; // speed up a bit each hit
    ball.speed = clamp(newSpeed, 5, 20);

    ball.vx = direction * Math.cos(bounceAngle) * ball.speed * (invert ? -1 : 1);
    // ensure vx points away from the paddle
    ball.vx = Math.abs(ball.vx) * (invert ? -1 : 1);
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

    // background subtle
    ctx.fillStyle = 'rgba(0,0,0,0.0)';
    ctx.fillRect(0, 0, W, H);

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

    // scores are in DOM; small debug info (optional)
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

  // Start / restart button
  startBtn.addEventListener('click', () => {
    startGame();
  });

  // start initially paused, show stationary ball
  resetBall(Math.random() < 0.5);
  draw();

  // helpful: pause/resume with space, started in key handlers

})();
