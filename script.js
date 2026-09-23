const tg = window.Telegram.WebApp;
tg.ready();

const storage = tg.initDataUnsafe?.user ? tg.storage : null;

// --- Конфигурация ---
const rods = [
  { id: 'bamboo', name: 'Бамбуковая', strength: 1, speed: 1200, cost: 0 },
  { id: 'fiber', name: 'Стеклопластик', strength: 2, speed: 900, cost: 240 },
  { id: 'composite', name: 'Композит', strength: 3, speed: 700, cost: 3100 },
  { id: 'carbon', name: 'Карбон', strength: 4, speed: 500, cost: 4200 },
  { id: 'titanium', name: 'Титановая', strength: 5, speed: 400, cost: 5500 }
];

const baits = [
  { id: 'worm', name: 'Червь', tags: ['small', 'common'], cost: 0 },
  { id: 'corn', name: 'Кукуруза', tags: ['carp'], cost: 20 },
  { id: 'spoon', name: 'Блесна', tags: ['predator'], cost: 35 },
  { id: 'shrimp', name: 'Креветка', tags: ['exotic'], cost: 50 }
];

const fishTypes = [
  { name: 'Пескарь', points: 8, coins: 4, tags: ['small'], rarity: 0.3 },
  { name: 'Плотва', points: 10, coins: 5, tags: ['common'], rarity: 0.25 },
  { name: 'Карась', points: 14, coins: 7, tags: ['carp'], rarity: 0.15 },
  { name: 'Окунь', points: 20, coins: 10, tags: ['predator'], rarity: 0.12 },
  { name: 'Щука', points: 40, coins: 22, tags: ['predator'], rarity: 0.08 },
  { name: 'Сом', points: 70, coins: 45, tags: ['large'], rarity: 0.04 },
  { name: 'Акула', points: 120, coins: 80, tags: ['exotic'], rarity: 0.02 },
  { name: 'Золотая рыбка', points: 200, coins: 150, tags: ['rare'], rarity: 0.01 },
  { name: 'Сапог', points: 0, coins: 0, tags: ['junk'], rarity: 0.03 }
];

// --- Сохранение и загрузка ---
function loadProgress() {
  const saved = storage?.getItem('fishing_progress') || '{"score":0,"coins":0,"rodId":"bamboo","baitId":"worm"}';
  return JSON.parse(saved);
}

function saveProgress(p) {
  storage?.setItem('fishing_progress', JSON.stringify(p));
}

let progress = loadProgress();

function updateUI() {
  document.getElementById('score').textContent = progress.score;
  document.getElementById('coins').textContent = progress.coins;
  
  const rod = rods.find(r => r.id === progress.rodId);
  const bait = baits.find(b => b.id === progress.baitId);
  
  document.getElementById('rod-name').textContent = rod ? rod.name : 'Бамбук';
  document.getElementById('bait-name').textContent = bait ? bait.name : 'Червь';
  
  renderShop();
  renderLeaderboard();
}

// --- Физика и Анимации ---
const hookEl = document.getElementById('hook');
const rodSystem = document.querySelector('.rod-system');
const btnThrow = document.getElementById('btn-throw');
const btnPull = document.getElementById('btn-pull');
const status = document.getElementById('status');
const fishContainer = document.getElementById('fish-container');
const particlesContainer = document.getElementById('particles');

let isFishing = false;
let animationFrameId;

// Параметры физики
const physics = {
  angle: -Math.PI / 4, // Начальный угол
  velocity: 0,
  gravity: 0.05,
  damping: 0.98, // Сопротивление воздуха
  length: 100, // Длина лески в пикселях (условно)
  targetY: 0
};

function resetPhysics() {
  physics.angle = -Math.PI / 4;
  physics.velocity = 0;
  physics.targetY = 0;
  updateHookPosition();
}

function updateHookPosition() {
  // Простая тригонометрия для маятника
  const x = Math.sin(physics.angle) * physics.length;
  const y = Math.cos(physics.angle) * physics.length;
  
  hookEl.style.transform = `translate(${x}px, ${y}px) rotate(\${physics.angle * 180 / Math.PI}deg)`;
}

function animatePhysics() {
  if (!isFishing) {
    // Плавное затухание колебаний если не рыбачим
    physics.velocity *= physics.damping;
    physics.angle += physics.velocity;
    updateHookPosition();
    animationFrameId = requestAnimationFrame(animatePhysics);
    return;
  }

  // Логика падения
  physics.velocity += physics.gravity;
  physics.angle += physics.velocity;
  
  // Если достигли дна (условно)
  if (Math.cos(physics.angle) * physics.length > 140) {
    physics.angle = -Math.PI / 2; // Горизонтально
    physics.velocity = 0;
    // Ждем поклевки
    setTimeout(onBite, Math.random() * 2000 + 1000);
  }
  
  updateHookPosition();
  animationFrameId = requestAnimationFrame(animatePhysics);
}

function startCasting() {
  if (isFishing) return;
  isFishing = true;
  
  // Анимация замаха
  rodSystem.classList.remove('fishing', 'pulling');
  rodSystem.classList.add('casting');
  
  setTimeout(() => {
    rodSystem.classList.remove('casting');
    rodSystem.classList.add('fishing');
    resetPhysics();
    animatePhysics();
    status.textContent = 'Леска уходит под воду...';
  }, 300);
}

function onBite() {
  if (!isFishing) return;
  
  // Эффект поклевки: резкий рывок вниз
  hookEl.style.transform = 'translate(10px, 160px) rotate(-90deg)';
  status.textContent = 'ПОКЛЁВКА! Тяни!';
  
  // Добавляем искры в момент поклевки
  createSparks(hookEl.offsetLeft + 10, hookEl.offsetTop + 15);
  
  btnPull.style.display = 'block';
  rodSystem.classList.add('pulling');
}

function onPull() {
  if (!isFishing) return;
  isFishing = false;
  cancelAnimationFrame(animationFrameId);
  
  rodSystem.classList.remove('pulling');
  rodSystem.classList.add('fishing');
  
  const rod = rods.find(r => r.id === progress.rodId);
  const bait = baits.find(b => b.id === progress.baitId);

  // Выбор рыбы
  let r = Math.random();
  let fish = fishTypes;
  let sum = 0;
  for (const f of fishTypes) {
    sum += f.rarity;
    if (r <= sum) {
      fish = f;
      break;
    }
  }

  // Бонус от приманки
  const hasTagMatch = fish.tags.some(t => bait.tags.includes(t));
  if (hasTagMatch && Math.random() < 0.4) {
    const filtered = fishTypes.filter(ft => ft.tags.some(t => bait.tags.includes(t)));
    if (filtered.length > 1) {
      const idx = Math.floor(Math.random() * filtered.length);
      fish = filtered[idx];
    }
  }

  // Проверка обрыва
  const fishWeight = fish.points / 10; 
  const canHold = rod.strength * 15 >= fishWeight;
  const brokeChance = canHold ? 0 : Math.min(1, (fishWeight / (rod.strength * 15)) * 0.6);
  const broke = Math.random() < brokeChance;

  const el = document.createElement('div');
  el.className = 'fish-card';
  
  if (broke) {
    el.textContent = `Упс! Рыба сорвалась: \${fish.name}`;
    el.classList.add('lost');
    status.textContent = `Удочка не выдержала! Рыба сорвалась (\${fish.name})`;
    createSparks(hookEl.offsetLeft + 10, hookEl.offsetTop + 15, 'red');
  } else {
    progress.score += fish.points;
    progress.coins += fish.coins;
    el.textContent = `Пойман: ${fish.name} (+${fish.points} очков)`;
    status.textContent = `Пойман: ${fish.name} (+${fish.points} очков, +\${fish.coins} монет)`;
    createSparks(hookEl.offsetLeft + 10, hookEl.offsetTop + 15, 'gold');
  }

  fishContainer.appendChild(el);
  updateUI();
  saveProgress(progress);
  
  // Возврат в исходное состояние
  setTimeout(() => {
    resetPhysics();
    fishContainer.innerHTML = '';
    btnPull.style.display = 'none';
    rodSystem.classList.remove('fishing');
    rodSystem.classList.add('casting');
    setTimeout(() => rodSystem.classList.remove('casting'), 300);
  }, 2000);
}

// Генерация частиц (искр)
function createSparks(x, y, color = 'gold') {
  for (let i = 0; i < 15; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = `\${x}px`;
    particle.style.top = `\${y}px`;
    particle.style.width = `\${Math.random() * 4 + 2}px`;
    particle.style.height = particle.style.width;
    particle.style.background = color === 'red' ? '#c0392b' : '#f1c40f';
    
    // Случайное направление
    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 50 + 20;
    const tx = Math.cos(angle) * velocity;
    const ty = Math.sin(angle) * velocity;
    const duration = Math.random() * 0.5 + 0.3;
    
    particlesContainer.appendChild(particle);
    
    // Анимация через Web Animations API
    const animation = particle.animate([
      {
        transform: 'translate(0, 0) scale(1)',
        opacity: 1
      },
      {
        transform: `translate(${tx}px, ${ty}px) scale(0)`,
        opacity: 0
      }
    ], {
      duration: duration * 1000,
      easing: 'cubic-bezier(0, .9, .57, 1)',
      fill: 'forwards'
    });
    
    animation.onfinish = () => particle.remove();
  }
}

// --- Магазин ---
function renderShop() {
  const shopRods = document.getElementById('shop-rods');
  shopRods.innerHTML = '';
  rods.forEach(r => {
    const isCurrent = r.id === progress.rodId;
    const btn = document.createElement('button');
    btn.className = `card ${isCurrent ? 'selected' : ''} ${!isCurrent && progress.coins < r.cost ? 'disabled' : ''}`;
    btn.innerHTML = `<h4>${r.name}</h4><p>Прочность: ${r.strength} | Скорость: быстрая</p><span class="price">\${r.cost} монет</span>`;
    
    if (!isCurrent) {
      if (progress.coins >= r.cost) {
        btn.onclick = () => {
          progress.rodId = r.id;
          updateUI();
          saveProgress(progress);
        };
      } else {
        btn.onclick = () => alert('Не хватает монет!');
      }
    }
    shopRods.appendChild(btn);
  });

  const shopBaits = document.getElementById('shop-baits');
  shopBaits.innerHTML = '';
  baits.forEach(b => {
    const isCurrent = b.id === progress.baitId;
    const btn = document.createElement('button');
    btn.className = `card ${isCurrent ? 'selected' : ''} ${!isCurrent && progress.coins < b.cost ? 'disabled' : ''}`;
    btn.innerHTML = `<h4>${b.name}</h4><p>${b.id === 'worm' ? 'На мелочь' : b.id === 'corn' ? 'На карповых' : b.id === 'spoon' ? 'На хищника' : 'На экзотику'}</p><span class="price">\${b.cost} монет</span>`;
    
    if (!isCurrent) {
      if (progress.coins >= b.cost) {
        btn.onclick = () => {
          progress.baitId = b.id;
          updateUI();
          saveProgress(progress);
        };
      } else {
        btn.onclick = () => alert('Не хватает монет!');
      }
    }
    shopBaits.appendChild(btn);
  });
}

// --- Табы ---
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(s => s.style.display = 'none');
    
    btn.classList.add('active');
    const tabName = btn.dataset.tab;
    document.getElementById(`\${tabName}-content`).style.display = 'block';
  });
});

// --- Лидерборд ---
function renderLeaderboard() {
  const key = 'fishing_leaderboard';
  const raw = storage?.getItem(key) || '';
  let board = JSON.parse(raw);

  const user = tg.initDataUnsafe?.user;
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
    storage?.setItem(key, JSON.stringify(board));
  }

  const list = document.getElementById('leaderboard-list');
  list.innerHTML = '';
  if (board.length === 0) {
    list.innerHTML = '<li>Пока нет рекордов</li>';
    return;
  }
  board.slice(0, 3).forEach((e, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${i + 1}. ${e.name}</strong> — \${e.score} очков`;
    list.appendChild(li);
  });
}

btnThrow.addEventListener('click', startCasting);
btnPull.addEventListener('click', onPull);

updateUI();
