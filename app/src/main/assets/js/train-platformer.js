(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const image = new Image();
  image.src = "assets/train_panorama.png";
  image.onerror = () => console.error("Не удалось загрузить assets/train_panorama.png");

  const WORLD = { width: 1536, height: 512, floorY: 235 };
  const player = { x: 130, y: WORLD.floorY - 50, w: 22.5, h: 50, vx: 0, vy: 0, speed: 230, jump: 520, grounded: true };
  const input = { left: false, right: false, jump: false, jumpQueued: false };
  const camera = { x: 0 };
  let width = 0, height = 0, scale = 1, lastTime = 0;
  const keys = new Set();

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Keep the camera close to one wagon in width; the visible area is about 1.25 wagons.
    scale = width / 390;
  }

  function bindButton(id, down, up) {
    const el = document.getElementById(id);
    el.addEventListener("pointerdown", e => { e.preventDefault(); el.setPointerCapture(e.pointerId); down(); });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(type =>
      el.addEventListener(type, e => { e.preventDefault(); up(); })
    );
  }

  bindButton("left", () => input.left = true, () => input.left = false);
  bindButton("right", () => input.right = true, () => input.right = false);
  bindButton("jump", () => { input.jump = true; input.jumpQueued = true; }, () => input.jump = false);

  window.addEventListener("keydown", e => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyA", "KeyD", "KeyW"].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (["Space", "ArrowUp", "KeyW"].includes(e.code) && !e.repeat) input.jumpQueued = true;
  });
  window.addEventListener("keyup", e => keys.delete(e.code));
  window.addEventListener("blur", () => { keys.clear(); input.left = input.right = input.jump = false; });

  function update(dt) {
    const left = input.left || keys.has("ArrowLeft") || keys.has("KeyA");
    const right = input.right || keys.has("ArrowRight") || keys.has("KeyD");
    const axis = (right ? 1 : 0) - (left ? 1 : 0);

    player.vx = axis * player.speed;
    player.x += player.vx * dt;
    player.x = Math.max(player.w / 2, Math.min(WORLD.width - player.w / 2, player.x));

    if (input.jumpQueued && player.grounded) {
      player.vy = -player.jump;
      player.grounded = false;
    }
    input.jumpQueued = false;

    player.vy += 1450 * dt;
    player.y += player.vy * dt;
    const floorTop = WORLD.floorY - player.h;
    if (player.y >= floorTop) {
      player.y = floorTop;
      player.vy = 0;
      player.grounded = true;
    }

    const viewportWorldWidth = width / scale;
    const target = player.x - viewportWorldWidth * 0.43;
    camera.x += (target - camera.x) * Math.min(1, dt * 7);
    camera.x = Math.max(0, Math.min(WORLD.width - viewportWorldWidth, camera.x));
  }

  function drawTrain() {
    // The train panorama is one static foreground image. No sky/bridge layers and no parallax.
    if (image.complete && image.naturalWidth) {
      ctx.drawImage(image, 0, 0, WORLD.width, WORLD.height);
    }
  }
  function draw() {
    const vh = height / scale;
    const top = WORLD.floorY - vh * 0.72;
    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-camera.x, -top);
    drawTrain();

    // Temporary player placeholder. Collision body is 22.5 x 50 world units (2.5x).
    ctx.fillStyle = "#e5c17b";
    ctx.fillRect(Math.round(player.x - player.w / 2), Math.round(player.y), player.w, player.h);
    ctx.fillStyle = "#252a35";
    ctx.fillRect(player.x - 7, player.y + 10, 14, 12);
    ctx.restore();
  }

  function frame(now) {
    const dt = Math.min(0.033, (now - lastTime) / 1000 || 0);
    lastTime = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  window.gamePause = () => { input.left = input.right = input.jump = false; };
  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(frame);
})();