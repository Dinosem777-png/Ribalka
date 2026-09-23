const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// --- Хранилище ---
function loadProgress() {
  const saved = localStorage.getItem('fishing_progress') || '{}';
  const def = { score: 0, coins: 0, rodId: 'bamboo', baitId: 'worm' };
  return Object.assign(def, JSON.parse(saved));
}

function saveProgress(p) {
  localStorage.setItem('fishing_progress', JSON.stringify(p));
}

let progress = loadProgress();

// --- Удочки ---
const rods = [
  { id: 'bamboo',    name: 'Бамбуковая',   strength: 1, speed: 1200, cost: 0,   desc: 'Простая удочка' },
  { id: 'fiber',     name: 'Стеклопластик', strength: 2, speed: 900,  cost: 40,  desc: 'Прочнее, быстрее' },
  { id: 'composite', name: 'Композит',     strength: 3, speed: 700,  cost: 100, desc: 'Хорошая для средней рыбы' },
  { id: 'carbon',    name: 'Карбон',        strength: 4, speed: 500,  cost: 200, desc: 'Лёгкая и прочная' },
  { id: 'titanium',  name: 'Титановая',     strength: 5, speed: 400,  cost: 500, desc: 'Лучшая — держит всё' }
];

// --- Приманки ---
const baits = [
  { id: 'worm',   name: 'Червь',    cost: 0,  tags: ['small', 'common'],   desc: 'На мелочь' },
  { id: 'corn',   name: 'Кукуруза',  cost: 20, tags: ['carp', 'common'],    desc: 'На карповых' },
  { id: 'spoon',  name: 'Блесна',    cost: 35, tags: ['predator', 'rare'],  desc: 'На хищника' },
  { id: 'shrimp', name: 'Креветка',  cost: 50, tags: ['exotic', 'large'],   desc: 'На экзотику' }
];

// --- Рыбы ---
const fishTypes = [
  { name: 'Пескарь',        points: 8,   coins: 4,   tags: ['small'],         rarity: 0.28 },
  { name: 'Плотва',         points: 10,  coins: 5,   tags: ['common'],        rarity: 0.22 },
  { name: 'Карась',         points: 14,  coins: 7,   tags: ['carp'],          rarity: 0.16 },
  { name: 'Лещ',            points: 18,  coins: 9,   tags: ['carp', 'common'],rarity: 0.10 },
  { name: 'Окунь',          points: 22,  coins: 12,  tags: ['predator'],      rarity: 0.08 },
  { name: 'Щука',           points: 45,  coins: 25,  tags: ['predator'],      rarity: 0.06 },
  { name: 'Судак',          points: 55,  coins: 35,  tags: ['predator'],      rarity: 0.03 },
  { name: 'Сом',            points: 80,  coins: 50,  tags: ['large'],         rarity: 0.025 },
  { name: 'Карп',           points: 65,  coins: 40,  tags: ['carp', 'large'], rarity: 0.02 },
  { name: 'Акула',          points: 120, coins: 80,  tags: ['exotic'],        rarity: 0.015 },
  { name: 'Дельфин',        points: 140, coins: 90,  tags: ['exotic'],        rarity: 0.008 },
  { name: 'Золотая рыбка',  points: 250, coins: 180, tags: ['rare'],          rarity: 0.005 },
  { name: 'Сапог',          points: 0,   coins: 0,   tags: [],                rarity: 0.025 }
];

// --- DOM ---
const hook = document.getElementById('hook');
const water = document.getElementById('water');
const btnThrow = document.getElementById('btn-throw');
const btnPull = document.getElementById('btn-pull');
const statusEl = document.getElementById('status');
const fishContainer = document.getElementById('fish-container');

let isFishing = false;
let biteTimeout = null;

// --- Обновление UI ---
function updateUI() {
  document.getElementById('score').textContent = progress.score;
  document.getElementById('coins').textContent = progress.coins;
  const rod = rods.find(r => r.id === progress.rodId);
  const bait = baits.find(b => b.id === progress.baitId);
  document.getElementById('rod-name').textContent = rod ? rod.name : '—';
  document.getElementById('bait-name').textContent = bait ? bait.name : '—';
  renderShop();
  renderLeaderboard();
}

// --- Заброс ---
btnThrow.addEventListener('click', () => {
  if (isFishing) return;
  isFishing = true;
  fishContainer.innerHTML = '';
  btnPull.style.display = 'none';
  btnThrow.disabled = true;

  const rod = rods.find(r => r.id === progress.rodId);
  statusEl.textContent = 'Заброс...';
  hook.style.top = '20px';

  setTimeout(() => {
    statusEl.textContent = 'Ждём поклёвку...';
    const biteTime = Math.random() * 2500 + 1500;

    biteTimeout = setTimeout(() => {
      statusEl.textContent = 'ПОКЛЁВКА! Тяни!';
      hook.style.animation = 'shake 0.2s infinite';
      btnPull.style.display = 'block';
    }, biteTime);
  }, rod.speed);
});

// --- Вытягивание ---
btnPull.addEventListener('click', () => {
  if (!isFishing) return;
  isFishing = false;
  hook.style.animation = '';
  btnThrow.disabled = false;

  const rod = rods.find(r => r.id === progress.rodId);
  const bait = baits.find(b => b.id === progress.baitId);

  // Выбор рыбы с учётом приманки
  let fish = null;
  const matched = fishTypes.filter(f =>
    f.tags.some(t => bait.tags.includes(t))
  );
  const useMatched = matched.length > 0 && Math.random() < 0.65;

  if (useMatched) {
    // Из подходящих рыб — выбираем по редкости
    const pool = matched.length > 0 ? matched : fishTypes;
    let r = Math.random();
    let sum = 0;
    const totalRarity = pool.reduce((s, f) => s + f.rarity, 0);
    for (const f of pool) {
      sum += f.rarity / totalRarity;
      if (r <= sum) { fish = f; break; }
    }
    if (!fish) fish = pool[0];
  } else {
    // Случайная рыба из всех
    let r = Math.random();
    let sum = 0;
    for (const f of fishTypes) {
      sum += f.rarity;
      if (r <= sum) { fish = f; break; }
    }
    if (!fish) fish = fishTypes[0];
  }

  // Проверка обрыва
  const fishWeight = fish.points / 8;
  const rodCapacity = rod.strength * 12;
  const broke = fishWeight > rodCapacity && Math.random() < 0.5;

  hook.style.top = '-50px';

  if (broke && fish.points > 0) {
    statusEl.textContent = 'Сорвалась! ' + fish.name + ' — удочка не выдержала';
    const el = document.createElement('div');
    el.className = 'fish';
    el.style.color = '#e74c3c';
    el.textContent = '💀 ' + fish.name + ' сорвалась';
    fishContainer.appendChild(el);
  } else {
    progress.score += fish.points;
    progress.coins += fish.coins;
    saveProgress(progress);
    statusEl.textContent = fish.name + ' (+ ' + fish.points + ' очков, + ' + fish.coins + ' монет)';
    const el = document.createElement('div');
    el.className = 'fish';
    if (fish.points === 0) el.style.color = '#888';
    el.textContent = (fish.points === 0 ? '🗑 ' : '🐟 ') + fish.name;
    fishContainer.appendChild(el);
  }

  updateUI();
});

// --- Магазин ---
function renderShop() {
  // Удочки
  const shopRods = document.getElementById('shop-rods');
  shopRods.innerHTML = '';
  rods.forEach(r => {
    const isCurrent = r.id === progress.rodId;
    const canAfford = progress.coins >= r.cost;
    const btn = document.createElement('button');

    let innerHTML = '<span><span class="shop-item-name">' + r.name + '</span><br><span class="shop-item-info">' + r.desc + ' · прочность ' + r.strength + '</span></span>';
    if (isCurrent) {
      innerHTML += '<span class="shop-item-current">✓ Выбрана</span>';
    } else {
      innerHTML += '<span class="shop-item-cost">' + r.cost + ' монет</span>';
    }
    btn.innerHTML = innerHTML;

    if (isCurrent) {
      btn.disabled = true;
    } else if (canAfford) {
      btn.onclick = () => {
        progress.coins -= r.cost;
        progress.rodId = r.id;
        saveProgress(progress);
        updateUI();
      };
    } else {
      btn.disabled = true;
    }
    shopRods.appendChild(btn);
  });

  // Приманки
  const shopBaits = document.getElementById('shop-baits');
  shopBaits.innerHTML = '';
  baits.forEach(b => {
    const isCurrent = b.id === progress.baitId;
    const canAfford = progress.coins >= b.cost;
    const btn = document.createElement('button');

    let innerHTML = '<span><span class="shop-item-name">' + b.name + '</span><br><span class="shop-item-info">' + b.desc + '</span></span>';
    if (isCurrent) {
      innerHTML += '<span class="shop-item-current">✓ Выбрана</span>';
    } else if (b.cost === 0) {
      innerHTML += '<span class="shop-item-cost">Бесплатно</span>';
    } else {
      innerHTML += '<span class="shop-item-cost">' + b.cost + ' монет</span>';
    }
    btn.innerHTML = innerHTML;

    if (isCurrent) {
      btn.disabled = true;
    } else if (canAfford) {
      btn.onclick = () => {
        progress.coins -= b.cost;
        progress.baitId = b.id;
        saveProgress(progress);
        updateUI();
      };
    } else {
      btn.disabled = true;
    }
    shopBaits.appendChild(btn);
  });
}

// --- Лидерборд ---
function renderLeaderboard() {
  let board = [];
  try {
    board = JSON.parse(localStorage.getItem('fishing_leaderboard') || '[]');
  } catch(e) { board = []; }

  const user = tg.initDataUnsafe && tg.initDataUnsafe.user;
  if (user) {
    const entry = { id: user.id, name: user.first_name, score: progress.score };
    const existing = board.find(e => e.id === entry.id);
    if (existing) {
      existing.score = Math.max(existing.score, entry.score);
    } else {
      board.push(entry);
    }
    board.sort((a, b) => b.score - a.score);
    board = board.slice(0, 10);
    localStorage.setItem('fishing_leaderboard', JSON.stringify(board));
  }

  const list = document.getElementById('leaderboard-list');
  list.innerHTML = '';
  if (board.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'Поймай рыбу, чтобы попасть в таблицу!';
    list.appendChild(li);
    return;
  }
  board.slice(0, 3).forEach((e, i) => {
    const li = document.createElement('li');
    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
    li.textContent = medal + ' ' + e.name + ' — ' + e.score + ' очков';
    list.appendChild(li);
  });
}

// --- Табы ---
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

// --- Старт ---
updateUI();
