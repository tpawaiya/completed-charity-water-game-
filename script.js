// ====== Elements ======
const container   = document.getElementById("game-container");
const scoreEl     = document.getElementById("score");
const timeEl      = document.getElementById("time");
const startBtn    = document.getElementById("start-btn");
const messageEl   = document.getElementById("message");
const confettiLay = document.getElementById("confetti");
const difficultyEl= document.getElementById("difficulty");
const soundToggle = document.getElementById("sound-enabled");

const sfxCatch = document.getElementById("sfx-catch");
const sfxBad   = document.getElementById("sfx-bad");
const sfxWin   = document.getElementById("sfx-win");

// ====== Game State ======
let gameRunning = false;
let spawnTimer = null;
let secondTimer = null;
let difficultyTick = null;

let score = 0;
let timeLeft = 30;

// dynamic knobs
let badChance = 0.25;
let baseSpawnMs = 900;
let baseFallMs  = 3600;
let WIN_SCORE   = 15;

// Milestones (LevelUp): show a message once when thresholds reached
const milestones = [
  {score:5,  text:"💧Nice flow! 5 points."},
  {score:10, text:"🌊Halfway there! 10 points."},
  {score:15, text:"🚰 Clean streak! 15 points."},
  {score:20, text:"🏆 Water champion!"}
];
let firedMilestones = new Set();

const modePresets = {
  easy:   {time:45, win:10, spawn:1000, fall:3800, badStart:0.20 },
  normal: {time:30, win:15, spawn:900,  fall:3600, badStart:0.25 },
  hard:   {time:20, win:20, spawn:750,  fall:3200, badStart:0.30 }
};

// ====== Controls ======
startBtn.addEventListener("click", () => {
  if (!gameRunning) startGame();
  else resetGame(); // Reset during play
});

// ====== Game Flow ======
function applyDifficulty(){
  const mode = difficultyEl.value;
  const p = modePresets[mode];

  timeLeft    = p.time;
  WIN_SCORE   = p.win;
  baseSpawnMs = p.spawn;
  baseFallMs  = p.fall;
  badChance   = p.badStart;

  timeEl.textContent = timeLeft;
}

function startGame(){
  if (gameRunning) return;
  gameRunning = true;

  // Difficulty chosen before start
  applyDifficulty();

  // reset state
  score = 0;
  firedMilestones.clear();
  messageEl.textContent = "";
  scoreEl.textContent = score;
  clearConfetti();
  clearDrops();

  // UI
  startBtn.textContent = "Reset";
  startBtn.setAttribute("aria-pressed","true");
  difficultyEl.disabled = true;

  // Timers
  spawnTimer = setInterval(createDrop, baseSpawnMs);
  secondTimer = setInterval(tick, 1000);

  // Ramp challenge every 5s
  difficultyTick = setInterval(() => {
    badChance = Math.min(0.75, badChance + 0.08);
    if (spawnTimer){
      clearInterval(spawnTimer);
      baseSpawnMs = Math.max(450, baseSpawnMs - 70);
      spawnTimer = setInterval(createDrop, baseSpawnMs);
    }
    baseFallMs = Math.max(1800, baseFallMs - 120);
  }, 5000);
}

function endGame(){
  gameRunning = false;
  clearInterval(spawnTimer);   spawnTimer = null;
  clearInterval(secondTimer);  secondTimer = null;
  clearInterval(difficultyTick); difficultyTick = null;

  if (score >= WIN_SCORE){
    messageEl.textContent = `You did it! 🎉 Score ${score}.`;
    celebrate();
    play(sfxWin);
  } else {
    messageEl.textContent = `Time! Final score ${score}. Try again?`;
  }

  startBtn.textContent = "Start Game";
  startBtn.setAttribute("aria-pressed","false");
  difficultyEl.disabled = false;
}

function resetGame(){
  clearInterval(spawnTimer);   spawnTimer = null;
  clearInterval(secondTimer);  secondTimer = null;
  clearInterval(difficultyTick); difficultyTick = null;

  clearDrops();
  clearConfetti();
  score = 0;
  scoreEl.textContent = score;
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

  // type
  const isBad = Math.random() < badChance;
  drop.classList.add(isBad ? "bad" : "good");
  drop.dataset.type = isBad ? "bad" : "good";

  // size
  const size = 50 + Math.random()*30;
  drop.style.width = `${size}px`;
  drop.style.height= `${size}px`;

  // position
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  const x = Math.random() * (cw - size);
  drop.style.left = `${x}px`;

  // animation
  const jitter = Math.random()*600 - 300;
  const fallMs = Math.max(1400, baseFallMs + jitter);
  drop.style.animationDuration = `${fallMs}ms`;
  drop.style.setProperty("--fall-distance", `${ch + size + 12}px`);
  drop.style.setProperty("--start-offset", `${size}px`);

  drop.addEventListener("pointerdown", (e)=>{
    e.preventDefault();
    handleCatch(drop);
  }, {passive:false});

  drop.addEventListener("animationend", ()=>{
    if (drop.dataset.type === "good" && gameRunning){
      // optional: miss penalty; currently feedback only
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
    play(sfxCatch);
  } else {
    updateScore(-2);
    shake(container);
    flash(container, "flash-red");
    play(sfxBad);
  }
}

// ====== Scoring, Milestones, Feedback ======
function updateScore(delta){
  score = Math.max(0, score + delta);
  scoreEl.textContent = score;

  // milestone messages once
  for (const m of milestones){
    if (score >= m.score && !firedMilestones.has(m.score)){
      messageEl.textContent = m.text;
      firedMilestones.add(m.score);
      break;
    }
  }
}

function flash(el, cls){
  el.classList.remove(cls);
  void el.offsetWidth;
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

// ====== Confetti ======
function celebrate(){
  for (let i=0;i<120;i++){
    const bit = document.createElement("div");
    bit.className = "confetti-bit";
    const left = Math.random()*100;
    const delay= Math.random()*300;
    const scale= .8 + Math.random()*.8;

    bit.style.left = `${left}vw`;
    bit.style.top  = `-10vh`;
    bit.style.transform = `translateY(0) rotate(0) scale(${scale})`;
    bit.style.animationDelay = `${delay}ms`;
    bit.style.background = confettiColor();

    confettiLay.appendChild(bit);
    setTimeout(()=> bit.remove(), 2000 + delay);
  }
}
function clearConfetti(){
  [...confettiLay.children].forEach(n=>n.remove());
}
function confettiColor(){
  const colors = ["#FFC907","#2E9DF7","#8BD1CB","#4FCB53","#FF902A","#F5402C","#159A48","#F16061"];
  return colors[Math.floor(Math.random()*colors.length)];
}

// ====== Sound ======
function play(el){
  if (!soundToggle.checked || !el) return;
  // Safely ignore if file missing or blocked
  try { el.currentTime = 0; el.play().catch(()=>{}); } catch(e){}
}
