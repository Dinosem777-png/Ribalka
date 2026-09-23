const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// --- Состояние игры ---
const state = {
  score: 0,
  coins: 0,
  rodLevel: 1,
  isCasting: false,
  isWaitingBite: false,
  canCatch: false,
  currentFish: null,
  fishes: [],
};

// Типы рыб: [иконка, название, мин.уровень_удочки, шанс, очки, монеты]
const FISH_TYPES = [
  { icon: '🐟', name: 'Окунь',      minRod: 1, weight: 40, points: 10, coins: 1 },
  { icon: '🐠', name: 'Карась',     minRod: 1, weight: 30, points: 15, coins: 2 },
  { icon: '🐡', name: 'Ёрш',       minRod: 1, weight: 20, points: 20, coins: 2 },
  { icon: '🦐', name: 'Креветка',    minRod: 1, weight: 15, points: 5,  coins: 1 },
  { icon: '🐟', name: 'Щука',       minRod: 2, weight: 10, points: 50, coins: 5 },
  { icon: '🐠', name: 'Сёмга',      minRod: 2, weight: 8,  points: 70, coins: 8 },
  { icon: '🦞', name: 'Омар',       minRod: 2, weight: 5,  points: 40, coins: 10 },
  { icon: '🐬', name: 'Дельфин',     minRod: 3, weight: 3,  points: 120, coins: 15 },
  { icon: '🦈', name: 'Акула',      minRod: 3, weight: 2,  points: 200, coins: 25 },
  { icon: '🐙', name: 'Осьминог',    minRod: 3, weight: 2,  points: 150, coins: 20 },
  { icon: '🐋', name: 'Кит',        minRod: 4, weight: 1,  points: 500, coins: 50 },
  { icon: '👑', name: 'Золотая рыба', minRod: 4, weight: 1,  points: 1000, coins: 100 },
  { icon: '👢', name: 'Старый сапог',  minRod: 1, weight: 10, points: 0, coins: 0 },
  { icon: '🪱', name: 'Червяк',      minRod: 1, weight: 8,  points: 1, coins: 0 },
  { icon: '🥫', name: 'Консервная банка', minRod: 1, weight: 5, points: 0, coins: 0 },
];

// --- DOM элементы ---
const el = {
  score: document.getElementById('score'),
  coins: document.getElementById('coins'),
  rodLevel: document.getElementById('rod-level'),
  water: document.getElementById('water'),
  fishContainer: document.getElementById('fish-container'),
  hookArea: document.getElementById('hook-area'),
  line: document.getElementById('line'),
  hook: document.getElementById('hook'),
  castBtn: document.getElementById('cast-btn'),
  catchPopup: document.getElementById('catch-popup'),
  catchIcon: document.getElementById('catch-icon'),
  catchInfo: document.getElementById('catch-info'),
  catchTitle: document.getElementById('catch-title'),
  catchClose: document.getElementById('catch-close'),
  shopPopup: document.getElementById('shop-popup'),
  shopBtn: document.getElementById('shop-btn-float'),
  shopClose: document.getElementById('shop-close'),
  upgradeBtn: document.getElementById('upgrade-btn'),
  shopRodLevel: document.getElementById('shop-rod-level'),
};

// --- Сохранение/загрузка ---
function saveGame() {
  const data = { score: state.score, coins: state.coins, rodLevel: state.rodLevel };
  try {
    tg.CloudStorage.setItem('fishing_save', JSON.stringify(data));
  } catch(e) { localStorage.setItem('fishing_save', JSON.stringify(data)); }
}

function loadGame() {
  try {
    tg.CloudStorage.getItem('fishing_save', (err, val) => {
      if (val) {
        const d = JSON.parse(val);
        state.score = d.score || 0;
        state.coins = d.coins || 0;
        state.rodLevel = d.rodLevel || 1;
        updateHUD();
        updateShop();
      }
    });
  } catch(e) {
    const val = localStorage.getItem('fishing_save');
    if (val) {
      const d = JSON.parse(val);
      state.score = d.score || 0;
      state.coins = d.coins || 0;
      state.rodLevel = d.rodLevel || 1;
      updateHUD();
      updateShop();
    }
  }
}

// --- UI обновление ---
function updateHUD() {
  el.score.textContent = state.score;
  el.coins.textContent = state.coins;
  el.rodLevel.textContent = state.rodLevel;
}

function updateShop() {
  const cost = state.rodLevel * 50;
  el.shopRodLevel.textContent = state.rodLevel;
  el.upgradeBtn.textContent = `${cost} монет`;
  el.upgradeBtn.disabled = state.coins < cost || state.rodLevel >= 5;
  if (state.rodLevel >= 5) el.upgradeBtn.textContent = 'Максимум';
}

// --- Плавающие рыбки (визуал) ---
function spawnVisualFish() {
  if (state.fishes.length > 8) return;
  const fish = document.createElement('div');
  fish.className = 'fish';
  const types = FISH_TYPES.filter(f => f.minRod <= state.rodLevel + 1);
  const random = types[Math.floor(Math.random() * types.length)];
  fish.textContent = random.icon;
  const waterH = el.water.clientHeight;
  const waterW = el.water.clientWidth;
  const fromLeft = Math.random() > 0.5;
  fish.style.left = (fromLeft ? -40 : waterW + 10) + 'px';
  fish.style.top = (60 + Math.random() * (waterH - 120)) + 'px';
  el.fishContainer.appendChild(fish);

  const speed = 30 + Math.random() * 40;
  const direction = fromLeft ? 1 : -1;
  const distance = waterW + 80;
  if (!fromLeft) fish.style.transform = 'scaleX(-1)';

  const obj = { el: fish, x: parseFloat(fish.style.left), direction, speed };
  state.fishes.push(obj);
}

function updateFish(dt) {
  const waterW = el.water.clientWidth;
  for (let i = state.fishes.length - 1; i >= 0; i--) {
    const f = state.fishes[i];
    f.x += f.direction * f.speed * dt;
    f.el.style.left = f.x + 'px';
    if ((f.direction > 0 && f.x > waterW + 50) || (f.direction < 0 && f.x < -50)) {
      f.el.remove();
      state.fishes.splice(i, 1);
    }
  }
}

// --- Пузырьки ---
function spawnBubble() {
  const b = document.createElement('div');
  b.className = 'bubble';
  b.style.left = Math.random() * 100 + '%';
  b.style.width = b.style.height = (4 + Math.random() * 8) + 'px';
  el.water.appendChild(b);
  setTimeout(() => b.remove(), 4000);
}

// --- Выбор случайной рыбы ---
function pickFish() {
  const available = FISH_TYPES.filter(f => f.minRod <= state.rodLevel);
  const totalWeight = available.reduce((s, f) => s + f.weight, 0);
  let r = Math.random() * totalWeight;
  for (const f of available) {
    r -= f.weight;
    if (r <= 0) return f;
  }
  return available[0];
}

// --- Логика заброса ---
el.castBtn.addEventListener('click', () => {
  if (state.isCasting || state.isWaitingBite) return;
  state.isCasting = true;
  el.castBtn.disabled = true;
  el.castBtn.textContent = 'Заброс...';
  
  el.hookArea.classList.remove('reeling');
  el.hookArea.classList.add('casting');

  setTimeout(() => {
    state.isCasting = false;
    state.isWaitingBite = true;
    el.castBtn.textContent = 'Жди поклёвку...';
    
    // Случайное время до поклёвки
    const waitTime = 2000 + Math.random() * 4000;
    setTimeout(() => {
      if (!state.isWaitingBite) return;
      // Поклёвка!
      state.canCatch = true;
      el.hook.classList.add('bite');
      el.castBtn.textContent = 'Тяни! 🎣';
      el.castBtn.disabled = false;
      
      // Окно для подсечки — 2.5 сек
      setTimeout(() => {
        if (state.canCatch) {
          // Слишком поздно — рыба ушла
          state.canCatch = false;
          state.isWaitingBite = false;
          el.hook.classList.remove('bite');
          el.castBtn.textContent = 'Забросить удочку';
          el.castBtn.disabled = false;
          reelUp();
        }
      }, 2500);
    }, waitTime);
  }, 1500);
});

el.castBtn.addEventListener('click', () => {
  if (state.canCatch) {
    // Подсечка!
    state.canCatch = false;
    state.isWaitingBite = false;
    el.hook.classList.remove('bite');
    
    const fish = pickFish();
    state.score += fish.points;
    state.coins += fish.coins;
    updateHUD();
    saveGame();
    
    // Показываем улов
    el.catchIcon.textContent = fish.icon;
    el.catchTitle.textContent = fish.points > 0 ? 'Поймал!' : 'Не повезло...';
    let info = `${fish.name}`;
    if (fish.points > 0) info += ` · +${fish.points} очков`;
    if (fish.coins > 0) info += ` · +${fish.coins} монет`;
    el.catchInfo.textContent = info;
    el.catchPopup.classList.remove('hidden');
    
    reelUp();
  }
});

function reelUp() {
  el.hookArea.classList.remove('casting');
  el.hookArea.classList.add('reeling');
  setTimeout(() => {
    el.hookArea.classList.remove('reeling');
    el.castBtn.textContent = 'Забросить удочку';
    el.castBtn.disabled = false;
  }, 1500);
}

el.catchClose.addEventListener('click', () => {
  el.catchPopup.classList.add('hidden');
});

// --- Магазин ---
el.shopBtn.addEventListener('click', () => {
  updateShop();
  el.shopPopup.classList.remove('hidden');
});
el.shopClose.addEventListener('click', () => {
  el.shopPopup.classList.add('hidden');
});
el.upgradeBtn.addEventListener('click', () => {
  const cost = state.rodLevel * 50;
  if (state.coins >= cost && state.rodLevel < 5) {
    state.coins -= cost;
    state.rodLevel++;
    updateHUD();
    updateShop();
    saveGame();
    el.shopPopup.classList.add('hidden');
    showCatchPopup('⬆️', 'Улучшение!', `Удочка улучшена до уровня ${state.rodLevel}!`);
  }
});

function showCatchPopup(icon, title, info) {
  el.catchIcon.textContent = icon;
  el.catchTitle.textContent = title;
  el.catchInfo.textContent = info;
  el.catchPopup.classList.remove('hidden');
}

// --- Игровой цикл ---
let lastTime = performance.now();
function gameLoop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  
  updateFish(dt);
  
  if (Math.random() < 0.02) spawnVisualFish();
  if (Math.random() < 0.05) spawnBubble();
  
  requestAnimationFrame(gameLoop);
}

// --- Старт ---
loadGame();
updateHUD();
updateShop();
requestAnimationFrame(gameLoop);

// Haptic feedback при поклёвке
function haptic(type) {
  try { tg.HapticFeedback.notificationOccurred(type); } catch(e) {}
}