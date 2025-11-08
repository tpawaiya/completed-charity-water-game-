// ====== Game State ======
let gameRunning = false;
let spawnTimer = null;
let secondTimer = null;

const timeStart = 30;          // seconds
let timeLeft = timeStart;
let score = 0;

const container = document.getElementById("game-container");
const scoreEl = document.getElementById("score");
const timeEl  = document.getElementById("time");
const startBtn = document.getElementById("start-btn");
const messageEl = document.getElementById("message");
const confettiLayer = document.getElementById("confetti");

// Difficulty / obstacle knobs (LevelUp)
let badChance = 0.25;          // probability of spawning a bad drop
let baseSpawnMs = 900;         // how often to spawn (ms)
let baseFallMs  = 3600;        // base fall duration (ms)
let difficultyTick = null;     // interval to ramp difficulty

// Win condition (feel free to tune)
const WIN_SCORE = 15;

// ====== Controls ======
startBtn.addEventListener("click", () => {
  if (!gameRunning) startGame();
  else resetGame(); // button acts as Reset during a run
});

// ====== Core ======
function startGame(){
  if (gameRunning) return;
  gameRunning = true;

  // UI state
  startBtn.textContent = "Reset";
  startBtn.setAttribute("aria-pressed", "true");
  messageEl.textContent = "";
  score = 0;
  timeLeft = timeStart;
  badChance = 0.25;
  scoreEl.textContent = score;
  timeEl.textContent = timeLeft;
  clearConfetti();
  clearDrops();

  // Timers
  spawnTimer = setInterval(createDrop, baseSpawnMs);
  secondTimer = setInterval(tick, 1000);

  // Gradually ramp challenge: more bad drops & faster fall
  difficultyTick = setInterval(() => {
    badChance = Math.min(0.7, badChance + 0.08);
    // modestly speed up spawns and fall as time goes
    if (spawnTimer){
      clearInterval(spawnTimer);
      // never below 450ms
      baseSpawnMs = Math.max(450, baseSpawnMs - 70);
      spawnTimer = setInterval(createDrop, baseSpawnMs);
    }
    baseFallMs = Math.max(2000, baseFallMs - 150);
  }, 5000);
}

function endGame(){
  gameRunning = false;
  // stop timers
  clearInterval(spawnTimer); spawnTimer = null;
  clearInterval(secondTimer); secondTimer = null;
  clearInterval(difficultyTick); difficultyTick = null;

  // message + celebration if win
  if (score >= WIN_SCORE){
    messageEl.textContent = `You did it! 🎉 Score ${score}.`;
    celebrate();
  } else {
    messageEl.textContent = `Time! Final score ${score}. Try again?`;
  }

  startBtn.textContent = "Start Game";
  startBtn.setAttribute("aria-pressed", "false");
}

function resetGame(){
  // hard reset to initial state and restart
  clearInterval(spawnTimer); spawnTimer = null;
  clearInterval(secondTimer); secondTimer = null;
  clearInterval(difficultyTick); difficultyTick = null;
  clearDrops();
  clearConfetti();
  baseSpawnMs = 900;
  baseFallMs = 3600;
  score = 0;
  timeLeft = timeStart;
  scoreEl.textContent = score;
  timeEl.textContent = timeLeft;
  messageEl.textContent = "";
  gameRunning = false;
  startGame();
}

function tick(){
  timeLeft--;
  timeEl.textContent = timeLeft;
  if (timeLeft <= 0) endGame();
}

// ====== Drops ======
function createDrop(){
  const drop = document.createElement("div");
  drop.classList.add("water-drop");

  // type: clean vs dirty
  const isBad = Math.random() < badChance;
  drop.classList.add(isBad ? "bad" : "good");
  drop.dataset.type = isBad ? "bad" : "good";

  // random size (50–80 px)
  const size = 50 + Math.random() * 30;
  drop.style.width = `${size}px`;
  drop.style.height = `${size}px`;

  // place horizontally within container bounds (account for size)
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  const x = Math.random() * (cw - size);
  drop.style.left = `${x}px`;

  // fall duration (vary a bit)
  const jitter = Math.random() * 600 - 300; // +/- 300ms
  const fallMs = Math.max(1400, baseFallMs + jitter);
  drop.style.animationDuration = `${fallMs}ms`;
  // set per-element fall distance (container height + size so it fully exits)
  drop.style.setProperty("--fall-distance", `${ch + size + 12}px`);
  drop.style.setProperty("--start-offset", `${size}px`);

  // pointer handler (works for mouse & touch)
  drop.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    handleCatch(drop);
  }, {passive:false});

  // when it hits bottom (animation ends) — remove it
  drop.addEventListener("animationend", () => {
    // Optional: small penalty for missing a clean drop (tunable)
    if (drop.dataset.type === "good" && gameRunning){
      feedbackMiss();
      // Uncomment to penalize misses:
      // updateScore(-1);
    }
    drop.remove();
  });

  container.appendChild(drop);
}

function handleCatch(drop){
  if (!gameRunning) return;
  const type = drop.dataset.type;
  drop.remove();

  if (type === "good"){
    updateScore(+1);
    flash(container, "flash-green");
  } else {
    updateScore(-2);               // penalty per brief
    shake(container);
    flash(container, "flash-red");
  }
}

// ====== Feedback & Utils ======
function updateScore(delta){
  score = Math.max(0, score + delta); // clamp at 0 to keep it positive
  scoreEl.textContent = score;
}

function flash(el, cls){
  el.classList.remove(cls); // restart animation if present
  void el.offsetWidth;      // reflow
  el.classList.add(cls);
  setTimeout(()=> el.classList.remove(cls), 260);
}

function shake(el){
  el.classList.remove("shake");
  void el.offsetWidth;
  el.classList.add("shake");
  setTimeout(()=> el.classList.remove("shake"), 260);
}

function clearDrops(){
  [...container.querySelectorAll(".water-drop")].forEach(d=>d.remove());
}

function celebrate(){
  // simple confetti (no libs)
  for (let i = 0; i < 120; i++){
    const bit = document.createElement("div");
    bit.className = "confetti-bit";
    const left = Math.random() * 100; // vw
    const delay = Math.random() * 300; // ms
    const scale = .8 + Math.random() * .8;

    bit.style.left = `${left}vw`;
    bit.style.top = `-10vh`;
    bit.style.transform = `translateY(0) rotate(0) scale(${scale})`;
    bit.style.animationDelay = `${delay}ms`;
    bit.style.background = confettiColor();

    confettiLayer.appendChild(bit);
    // cleanup
    setTimeout(()=> bit.remove(), 2000 + delay);
  }
}

function clearConfetti(){
  [...confettiLayer.children].forEach(n=>n.remove());
}

function confettiColor(){
  // pick from brand-ish palette
  const colors = ["#FFC907","#2E9DF7","#8BD1CB","#4FCB53","#FF902A","#F5402C","#159A48","#F16061"];
  return colors[Math.floor(Math.random()*colors.length)];
}

function feedbackMiss(){
  // subtle message on miss of a good drop (optional)
  // messageEl.textContent = "You missed a clean drop!";
  // setTimeout(()=> { if(messageEl.textContent.includes("missed")) messageEl.textContent = ""; }, 600);
}
