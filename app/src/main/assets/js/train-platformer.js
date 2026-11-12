(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d", { alpha: false });
  const image = new Image();
  image.src = "assets/train_panorama.png";
  image.onerror = () => console.error("Не удалось загрузить assets/train_panorama.png");

  const WORLD = { width: 1536, height: 512, floorY: 288 };
  const WAGONS = [
    { id: "engine", left: 0, right: 335, name: "МАШИННОЕ ОТДЕЛЕНИЕ" },
    { id: "forge", left: 335, right: 570, name: "КУЗНИЦА" },
    { id: "greenhouse", left: 570, right: 810, name: "ОРАНЖЕРЕЯ" },
    { id: "archive", left: 810, right: 1045, name: "АРХИВ" },
    { id: "lounge", left: 1045, right: 1280, name: "ЖИЛОЙ ВАГОН" },
    { id: "observatory", left: 1280, right: 1536, name: "ОБСЕРВАТОРИЯ" }
  ];
  const DOOR_RADIUS = 43;
  const EDGE_MARGIN = 24;
  const player = { x: 130, y: WORLD.floorY - 50, w: 22.5, h: 50, vx: 0, vy: 0, speed: 230, jump: 520, grounded: true };
  const input = { left: false, right: false, jump: false, jumpQueued: false };
  const camera = { x: 0 };
  const transition = { active: false, phase: "none", timer: 0, duration: 0.38, targetX: 0, targetWagon: 0 };
  const keys = new Set();
  const interactButton = document.getElementById("interact");
  const caption = document.getElementById("caption");
  let width = 0, height = 0, scale = 1, lastTime = 0, activeWagon = 0, nearbyDoor = null;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, window.innerWidth);
    height = Math.max(1, window.innerHeight);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
  bindButton("interact", () => tryDoorTransition(), () => {});

  window.addEventListener("keydown", e => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space", "KeyA", "KeyD", "KeyW", "KeyE"].includes(e.code)) e.preventDefault();
    keys.add(e.code);
    if (["Space", "ArrowUp", "KeyW"].includes(e.code) && !e.repeat) input.jumpQueued = true;
    if (e.code === "KeyE" && !e.repeat) tryDoorTransition();
  });
  window.addEventListener("keyup", e => keys.delete(e.code));
  window.addEventListener("blur", () => { keys.clear(); input.left = input.right = input.jump = false; });

  function findNearbyDoor() {
    const wagon = WAGONS[activeWagon];
    const leftDoor = activeWagon > 0 ? { x: wagon.left, target: activeWagon - 1, side: "left" } : null;
    const rightDoor = activeWagon < WAGONS.length - 1 ? { x: wagon.right, target: activeWagon + 1, side: "right" } : null;
    const candidates = [leftDoor, rightDoor].filter(Boolean);
    let best = null;
    for (const door of candidates) {
      const distance = Math.abs(player.x - (door.x + (door.side === "right" ? -EDGE_MARGIN : EDGE_MARGIN)));
      if (distance <= DOOR_RADIUS && (!best || distance < best.distance)) {
        best = { ...door, distance, name: WAGONS[door.target].name };
      }
    }
    return best;
  }

  function tryDoorTransition() {
    if (!nearbyDoor || transition.active) return;
    input.left = input.right = input.jump = false;
    player.vx = player.vy = 0;
    transition.targetWagon = nearbyDoor.target;
    transition.targetX = nearbyDoor.side === "right"
      ? WAGONS[nearbyDoor.target].left + 38
      : WAGONS[nearbyDoor.target].right - 38;
    transition.active = true;
    transition.phase = "out";
    transition.timer = 0;
    nearbyDoor = null;
    interactButton.hidden = true;
  }

  function updateTransition(dt) {
    if (!transition.active) return;
    transition.timer += dt;
    if (transition.phase === "out" && transition.timer >= transition.duration) {
      player.x = transition.targetX;
      player.y = WORLD.floorY - player.h;
      player.vx = player.vy = 0;
      player.grounded = true;
      activeWagon = transition.targetWagon;
      transition.phase = "in";
      transition.timer = 0;
      camera.x = Math.max(0, Math.min(WORLD.width - width / scale, player.x - (width / scale) * 0.43));
      caption.textContent = "ПОЕЗД «НУЛЕВОЙ» · " + WAGONS[activeWagon].name;
    } else if (transition.phase === "in" && transition.timer >= transition.duration) {
      transition.active = false;
      transition.phase = "none";
      transition.timer = 0;
    }
  }

  function update(dt) {
    if (transition.active) {
      updateTransition(dt);
      return;
    }

    const left = input.left || keys.has("ArrowLeft") || keys.has("KeyA");
    const right = input.right || keys.has("ArrowRight") || keys.has("KeyD");
    const axis = (right ? 1 : 0) - (left ? 1 : 0);
    const wagon = WAGONS[activeWagon];
    const minX = wagon.left + (activeWagon > 0 ? EDGE_MARGIN : player.w / 2);
    const maxX = wagon.right - (activeWagon < WAGONS.length - 1 ? EDGE_MARGIN : player.w / 2);

    player.vx = axis * player.speed;
    player.x += player.vx * dt;
    player.x = Math.max(minX, Math.min(maxX, player.x));

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

    nearbyDoor = player.grounded ? findNearbyDoor() : null;
    interactButton.hidden = !nearbyDoor;
    if (nearbyDoor) {
      interactButton.textContent = "E · ПЕРЕЙТИ: " + nearbyDoor.name;
      interactButton.setAttribute("aria-label", "Перейти: " + nearbyDoor.name);
    }

    const viewportWorldWidth = width / scale;
    const target = player.x - viewportWorldWidth * 0.43;
    camera.x += (target - camera.x) * Math.min(1, dt * 7);
    camera.x = Math.max(0, Math.min(WORLD.width - viewportWorldWidth, camera.x));
  }

  function drawTrain() {
    if (image.complete && image.naturalWidth) ctx.drawImage(image, 0, 0, WORLD.width, WORLD.height);
  }

  function drawDoorSigns() {
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 8px monospace";
    for (let i = 1; i < WAGONS.length; i++) {
      const x = WAGONS[i].left;
      const label = WAGONS[i].name;
      const w = Math.max(62, ctx.measureText(label).width + 12);
      ctx.fillStyle = "rgba(15,19,29,.92)";
      ctx.strokeStyle = "rgba(214,193,139,.85)";
      ctx.lineWidth = 1.5;
      ctx.fillRect(x - w / 2, 203, w, 19);
      ctx.strokeRect(x - w / 2, 203, w, 19);
      ctx.fillStyle = "#f0dfb3";
      ctx.fillText(label, x, 212.5);
    }
    ctx.restore();
  }

  function drawPlayer() {
    ctx.fillStyle = "#e5c17b";
    ctx.fillRect(Math.round(player.x - player.w / 2), Math.round(player.y), player.w, player.h);
    ctx.fillStyle = "#252a35";
    ctx.fillRect(player.x - 7, player.y + 10, 14, 12);
  }

  function draw() {
    const vh = height / scale;
    const top = WORLD.floorY - vh * 0.72;
    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.scale(scale, scale);
    ctx.translate(-camera.x, -top);
    drawTrain();
    drawDoorSigns();
    drawPlayer();
    ctx.restore();

    if (transition.active) {
      const progress = Math.min(1, transition.timer / transition.duration);
      const alpha = transition.phase === "out" ? progress : 1 - progress;
      ctx.fillStyle = "rgba(0,0,0," + alpha + ")";
      ctx.fillRect(0, 0, width, height);
    }
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