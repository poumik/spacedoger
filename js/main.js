const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const highScoresDisplay = document.getElementById('highScores');
const pauseButton = document.getElementById('pauseButton');
const startButton = document.getElementById('startButton');
const soundButton = document.getElementById('soundButton');

// Audio Context Setup
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let isSoundOn = true;
let bgMusicOscillator = null;

// Background Music (looping hum with melody)
function startBackgroundMusic() {
    if (!isSoundOn || bgMusicOscillator) return;
    bgMusicOscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    bgMusicOscillator.type = 'sine';
    bgMusicOscillator.frequency.setValueAtTime(100, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    bgMusicOscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    bgMusicOscillator.start();

    setInterval(() => {
        if (isSoundOn && !isPaused && !gameOver) {
            bgMusicOscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
            setTimeout(() => bgMusicOscillator.frequency.setValueAtTime(100, audioCtx.currentTime), 200);
        }
    }, 2000);
}

function stopBackgroundMusic() {
    if (bgMusicOscillator) {
        bgMusicOscillator.stop();
        bgMusicOscillator = null;
    }
}

// Laser Shot Sound (high-pitched "pew")
function playLaserSound() {
    if (!isSoundOn) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
}

// Explosion Sound (noise burst)
function playExplosionSound() {
    if (!isSoundOn) return;
    const bufferSize = audioCtx.sampleRate * 0.3;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1; // White noise
    }
    const source = audioCtx.createBufferSource();
    const gain = audioCtx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(0.7, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    source.connect(gain);
    gain.connect(audioCtx.destination);
    source.start();
}

// Alien Laser Sound (sharp "zap")
function playAlienLaserSound() {
    if (!isSoundOn) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
}

// Game Over Sound (descending tones)
function playGameOverSound() {
    if (!isSoundOn) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 1);
    gain.gain.setValueAtTime(0.8, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 1);
}

let lastTime = 0;
let frameCount = 0;
let fps = 0;
let totalObjects = 0;
let gameStarted = true;
let gameOver = true;

const ship = {
    x: canvas.width / 2,
    y: canvas.height - 50,
    width: 30,
    height: 40,
    speed: 3,
    dx: 0,
    dy: 0
};

let lasers = [];
const laserSpeed = -5;

let asteroids = [];
const asteroidSpeed = 1;
let score = 0;

let alienShips = [];
let alienLasers = [];
let motherships = [];
const alienLaserSpeed = 3;

let explosions = [];
let totalParticles = 0;
const maxParticles = 50;

const stars = [];
for (let i = 0; i < 100; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height
    });
}

let isPaused = false;

let rightPressed = false;
let leftPressed = false;
let upPressed = false;
let downPressed = false;
let spacePressed = false;

document.addEventListener('keydown', keyDownHandler);
document.addEventListener('keyup', keyUpHandler);
pauseButton.addEventListener('click', togglePause);
startButton.addEventListener('click', () => {
    gameOver = false;
    startButton.style.display = 'none';
    pauseButton.style.display = 'block';
    soundButton.style.display = 'block'; // Show sound button on start
    ship.x = canvas.width / 2;
    ship.y = canvas.height - 50;
    ship.dx = 0;
    ship.dy = 0;
    asteroids = [];
    lasers = [];
    alienShips = [];
    alienLasers = [];
    motherships = [];
    explosions = [];
    totalParticles = 0;
    totalObjects = 0;
    score = 0;
    scoreDisplay.textContent = `Score: ${score}`;
    if (isSoundOn) startBackgroundMusic(); // Start background music if sound is on
});
soundButton.addEventListener('click', toggleSound);

function keyDownHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed = true;
    if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = true;
    if (e.key === 'Up' || e.key === 'ArrowUp') upPressed = true;
    if (e.key === 'Down' || e.key === 'ArrowDown') downPressed = true;
    if (e.key === ' ' || e.key === 'Spacebar') spacePressed = true;
}

function keyUpHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed = false;
    if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = false;
    if (e.key === 'Up' || e.key === 'ArrowUp') upPressed = false;
    if (e.key === 'Down' || e.key === 'ArrowDown') downPressed = false;
    if (e.key === ' ' || e.key === 'Spacebar') spacePressed = false;
}

function togglePause() {
    isPaused = !isPaused;
    pauseButton.textContent = isPaused ? 'Resume' : 'Pause';
    if (isPaused && isSoundOn) {
        stopBackgroundMusic();
    } else if (!isPaused && isSoundOn) {
        startBackgroundMusic();
        requestAnimationFrame(update);
    }
}

function toggleSound() {
    isSoundOn = !isSoundOn;
    soundButton.textContent = isSoundOn ? 'Sound: ON' : 'Sound: OFF';
    if (isSoundOn && !isPaused && !gameOver) {
        startBackgroundMusic();
    } else {
        stopBackgroundMusic();
    }
}

function drawShip() {
    ctx.save();
    ctx.translate(ship.x, ship.y);

    ctx.beginPath();
    ctx.moveTo(0, -ship.height / 2);
    ctx.lineTo(-ship.width / 2, ship.height / 2);
    ctx.lineTo(-ship.width / 4, ship.height / 2 - 5);
    ctx.lineTo(0, -ship.height / 4);
    ctx.lineTo(ship.width / 4, ship.height / 2 - 5);
    ctx.lineTo(ship.width / 2, ship.height / 2);
    ctx.closePath();
    const gradient = ctx.createLinearGradient(0, -ship.height / 2, 0, ship.height / 2);
    gradient.addColorStop(0, '#00FFFF');
    gradient.addColorStop(1, '#008888');
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    const flameBase = ship.height / 2;
    let flameLength = 12 + Math.sin(Date.now() * 0.01) * 2;
    let flameWidth = ship.width / 4;
    let opacity = 0.7 + Math.sin(Date.now() * 0.01) * 0.2;
            ... (rest truncated due to length)