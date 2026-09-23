let currentTheme = localStorage.getItem('cyber_theme') || 'medium';
let totalXp = parseInt(localStorage.getItem('cyber_timer_xp')) || 0;
let tags = JSON.parse(localStorage.getItem('cyber_tags')) || ['Ejercicio', 'Estudios', 'Juego', 'Lectura'];
let selectedTag = localStorage.getItem('cyber_selected_tag') || tags[0];
let sessions = JSON.parse(localStorage.getItem('cyber_sessions')) || [];
let unlockedBadges = JSON.parse(localStorage.getItem('cyber_badges')) || [];
let waterIntervalTime = parseInt(localStorage.getItem('cyber_water_int')) || 0;

let viewDate = new Date();
let currentYear = viewDate.getFullYear();
let currentMonth = viewDate.getMonth();

function formatDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

let selectedCalDate = formatDate(new Date());

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const BADGES = [
  { id: 'first_step', icon: '⚡', name: 'Primer Enfoque', desc: 'Completa tu primera sesión' },
  { id: 'streak_3', icon: '🔥', name: 'Constancia', desc: 'Racha de 3 días seguidos' },
  { id: 'streak_7', icon: '🛡️', name: 'Fuerza de Hierro', desc: 'Racha de 7 días seguidos' },
  { id: 'centurion', icon: '💯', name: 'Centurión', desc: '100 min completados en un día' },
  { id: 'night_owl', icon: '🌙', name: 'Guerrero Nocturno', desc: 'Sesión terminada tras las 22:00' },
  { id: 'early_bird', icon: '☀️', name: 'Madrugador', desc: 'Sesión terminada antes de las 8:00' },
  { id: 'iron_body', icon: '💪', name: 'Titán del Ejercicio', desc: 'Más de 300 min en Ejercicio' }
];

let timerInterval = null;
let remainingSeconds = 0;
let targetMinutes = 20;
let isRunning = false;

let wakeLock = null;
let widgetInterval = null;
let widgetRemaining = 0;
let waterTimer = null;

function init() {
  applyTheme(currentTheme);
  renderTags();
  updateUI();
  renderCalendar();
  renderProfileStats();
  renderBadges();
  initWaterReminder();

  // Sonido háptico automático al pulsar cualquier botón o píldora de la app
  document.addEventListener('click', (e) => {
    if (e.target.closest('button') || e.target.closest('.tag-pill') || e.target.closest('.day-cell')) {
      playSound('click');
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isRunning) {
      cancelTimer(false);
      alert(`¡PROTOCOLO ABORTADO! Has salido de la pantalla durante [${selectedTag}]. 0 XP sumados.`);
    }
  });
}

/* ================= MOTOR DE SONIDO (WEB AUDIO API) ================= */
let audioCtxInstance = null;

function getAudioCtx() {
  if (!audioCtxInstance) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtxInstance = new AudioContext();
  }
  if (audioCtxInstance.state === 'suspended') {
    audioCtxInstance.resume();
  }
  return audioCtxInstance;
}

function playSound(type) {
  try {
    const c = getAudioCtx();
    const now = c.currentTime;
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.start(now);
      osc.stop(now + 0.03);
    } else if (type === 'start') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(880, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'complete') {
      // Acorde triunfal de 8 bits
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(freq, now + idx * 0.08);
        o.connect(g);
        g.connect(c.destination);
        g.gain.setValueAtTime(0.08, now + idx * 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.15);
        o.start(now + idx * 0.08);
        o.stop(now + idx * 0.08 + 0.15);
      });
    } else if (type === 'abort') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.linearRampToValueAtTime(120, now + 0.25);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (e) {}
}

/* ================= WAKE LOCK ================= */
async function requestWakeLock() {
  try {
    if ('wakeLock' in navigator) {
      wakeLock = await navigator.wakeLock.request('screen');
    }
  } catch (err) {}
}

function releaseWakeLock() {
  if (wakeLock !== null) {
    wakeLock.release().then(() => { wakeLock = null; }).catch(() => {});
  }
}

/* ================= TEMAS Y VISTAS ================= */
function applyTheme(theme) {
  document.body.className = '';
  if (theme === 'deep') document.body.classList.add('theme-deep');
  if (theme === 'light') document.body.classList.add('theme-light');

  const btnMedium = document.getElementById('btn-theme-medium');
  const btnDeep = document.getElementById('btn-theme-deep');
  const btnLight = document.getElementById('btn-theme-light');

  if (btnMedium && btnDeep && btnLight) {
    btnMedium.classList.toggle('active', theme === 'medium');
    btnDeep.classList.toggle('active', theme === 'deep');
    btnLight.classList.toggle('active', theme === 'light');
  }
}

function setAppTheme(theme) {
  currentTheme = theme;
  localStorage.setItem('cyber_theme', theme);
  applyTheme(theme);
}

function switchView(view) {
  if (isRunning) return;

  document.getElementById('view-timer').style.display = view === 'timer' ? 'block' : 'none';
  document.getElementById('view-profile').style.display = view === 'profile' ? 'block' : 'none';
  document.getElementById('tab-btn-timer').className = `tab-btn ${view === 'timer' ? 'active' : ''}`;
  document.getElementById('tab-btn-profile').className = `tab-btn ${view === 'profile' ? 'active' : ''}`;

  if (view === 'profile') {
    applyTheme(currentTheme);
    renderCalendar();
    renderProfileStats();
    renderBadges();
    document.getElementById('water-interval').value = waterIntervalTime;
  }
}

/* ================= ETIQUETAS ================= */
function renderTags() {
  const container = document.getElementById('tag-list');
  container.innerHTML = '';

  if (tags.length === 0) {
    tags = ['General'];
    selectedTag = 'General';
  }

  tags.forEach(tag => {
    const pill = document.createElement('div');
    pill.className = `tag-pill ${tag === selectedTag ? 'active' : ''}`;
    
    const tagText = document.createElement('span');
    tagText.textContent = tag;
    tagText.onclick = () => {
      if (isRunning) return;
      selectedTag = tag;
      localStorage.setItem('cyber_selected_tag', selectedTag);
      renderTags();
    };
    pill.appendChild(tagText);

    const delBtn = document.createElement('span');
    delBtn.className = 'tag-del-btn';
    delBtn.textContent = '×';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      deleteTag(tag);
    };
    pill.appendChild(delBtn);

    container.appendChild(pill);
  });
}

function addNewTag() {
  const input = document.getElementById('new-tag-input');
  const val = input.value.trim();
  if (!val) return;

  const formatted = val.charAt(0).toUpperCase() + val.slice(1);
  if (!tags.includes(formatted)) {
    tags.push(formatted);
    localStorage.setItem('cyber_tags', JSON.stringify(tags));
    selectedTag = formatted;
    localStorage.setItem('cyber_selected_tag', selectedTag);
    renderTags();
  }
  input.value = '';
}

function deleteTag(tagToDelete) {
  if (isRunning) return;
  if (tags.length <= 1) {
    alert('Debes mantener al menos una categoría.');
    return;
  }
  tags = tags.filter(t => t !== tagToDelete);
  if (selectedTag === tagToDelete) {
    selectedTag = tags[0];
    localStorage.setItem('cyber_selected_tag', selectedTag);
  }
  localStorage.setItem('cyber_tags', JSON.stringify(tags));
  renderTags();
  renderProfileStats();
}

/* ================= NIVELES Y RACHAS ================= */
function getRankTitle(level) {
  if (level < 3) return 'RANGO: INICIADO';
  if (level < 6) return 'RANGO: OPERADOR FOCO';
  if (level < 10) return 'RANGO: ESPECIALISTA';
  if (level < 15) return 'RANGO: ÉLITE DISCIPLINAR';
  if (level < 20) return 'RANGO: MAESTRO CYBER';
  return 'RANGO: CYBORG SUPREMO';
}

function calculateStreak() {
  const dailyMins = {};
  sessions.forEach(s => {
    dailyMins[s.date] = (dailyMins[s.date] || 0) + s.mins;
  });

  let streak = 0;
  let check = new Date();
  const todayStr = formatDate(check);

  if ((dailyMins[todayStr] || 0) < 15) {
    check.setDate(check.getDate() - 1);
  }

  while (true) {
    const dStr = formatDate(check);
    if ((dailyMins[dStr] || 0) >= 15) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

function updateUI() {
  const level = Math.floor(totalXp / 100) + 1;
  const currentXp = totalXp % 100;
  
  document.getElementById('level').textContent = level;
  document.getElementById('rank-title').textContent = getRankTitle(level);
  document.getElementById('streak-count').textContent = calculateStreak();
  document.getElementById('current-xp').textContent = currentXp;
  document.getElementById('xp-fill').style.width = `${currentXp}%`;
}

/* ================= CRONÓMETRO ================= */
function startTimer() {
  targetMinutes = parseInt(document.getElementById('minutes-input').value) || 1;
  remainingSeconds = targetMinutes * 60;
  isRunning = true;

  playSound('start');
  requestWakeLock();

  const sub = document.getElementById('subgroup-input').value.trim() || 'Sin subgrupo';
  document.getElementById('focus-tag-title').textContent = `[ ${selectedTag.toUpperCase()} ]`;
  document.getElementById('focus-sub-title').textContent = `> Misión: ${sub}`;

  document.getElementById('focus-overlay').style.display = 'flex';
  document.getElementById('app-container').style.display = 'none';

  updateFocusClockDisplay();

  timerInterval = setInterval(() => {
    remainingSeconds--;
    updateFocusClockDisplay();

    if (remainingSeconds <= 0) {
      completeSession();
    }
  }, 1000);
}

function updateFocusClockDisplay() {
  const m = Math.floor(remainingSeconds / 60);
  const s = remainingSeconds % 60;
  document.getElementById('focus-clock-display').textContent = 
    `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function closeFocusOverlay() {
  releaseWakeLock();
  document.getElementById('focus-overlay').style.display = 'none';
  document.getElementById('app-container').style.display = 'block';
}

function cancelTimer(manual = false) {
  clearInterval(timerInterval);
  isRunning = false;
  playSound('abort');
  closeFocusOverlay();
  updateUI();
  if (manual) alert('Sesión cancelada. 0 puntos obtenidos.');
}

function completeSession() {
  clearInterval(timerInterval);
  isRunning = false;
  playSound('complete');

  const earnedXp = targetMinutes * 2;
  totalXp += earnedXp;

  const sub = document.getElementById('subgroup-input'].value.trim() || 'General';
  const now = new Date();
  const todayStr = formatDate(now);

  sessions.push({
    date: todayStr,
    tag: selectedTag,
    sub: sub,
    mins: targetMinutes
  });

  localStorage.setItem('cyber_timer_xp', totalXp);
  localStorage.setItem('cyber_sessions', JSON.stringify(sessions));

  checkBadges(now, todayStr);

  closeFocusOverlay();
  updateUI();
  alert(`⚡ MISIÓN COMPLETADA EN [${selectedTag} / ${sub}]: +${earnedXp} XP y +${targetMinutes} min.`);
}

/* ================= LOGROS ================= */
function checkBadges(finishDate, todayStr) {
  let newlyUnlocked = [];

  function unlock(id) {
    if (!unlockedBadges.includes(id)) {
      unlockedBadges.push(id);
      newlyUnlocked.push(id);
    }
  }

  if (sessions.length >= 1) unlock('first_step');

  const streak = calculateStreak();
  if (streak >= 3) unlock('streak_3');
  if (streak >= 7) unlock('streak_7');

  const todayMins = sessions
    .filter(s => s.date === todayStr)
    .reduce((sum, s) => sum + s.mins, 0);
  if (todayMins >= 100) unlock('centurion');

  const hour = finishDate.getHours();
  if (hour >= 22) unlock('night_owl');
  if (hour < 8) unlock('early_bird');

  const exerciseMins = sessions
    .filter(s => s.tag.toLowerCase() === 'ejercicio')
    .reduce((sum, s) => sum + s.mins, 0);
  if (exerciseMins >= 300) unlock('iron_body');

  if (newlyUnlocked.length > 0) {
    localStorage.setItem('cyber_badges', JSON.stringify(unlockedBadges));
    renderBadges();
  }
}

function renderBadges() {
  const container = document.getElementById('badge-grid');
  if (!container) return;
  container.innerHTML = '';

  BADGES.forEach(b => {
    const isUnlocked = unlockedBadges.includes(b.id);
    const card = document.createElement('div');
    card.className = `badge-card ${isUnlocked ? 'unlocked' : ''}`;
    card.innerHTML = `
      <div class="badge-icon">${b.icon}</div>
      <div class="badge-name">${b.name}</div>
      <div class="badge-desc">${b.desc}</div>
    `;
    container.appendChild(card);
  });
}

/* ================= WIDGET AUXILIAR ================= */
function startCustomWidget() {
  const input = document.getElementById('widget-custom-mins');
  let mins = parseInt(input.value);

  if (isNaN(mins) || mins < 1) mins = 1;
  if (mins > 60) mins = 60;

  input.value = mins;
  startWidget(mins);
}

function startWidget(mins) {
  clearInterval(widgetInterval);
  widgetRemaining = mins * 60;
  playSound('start');
  
  document.getElementById('widget-label').textContent = `EN CURSO (${mins} MIN)`;
  updateWidgetDisplay();

  widgetInterval = setInterval(() => {
    widgetRemaining--;
    updateWidgetDisplay();

    if (widgetRemaining <= 0) {
      clearInterval(widgetInterval);
      document.getElementById('widget-label').textContent = '¡TIEMPO CUMPLIDO!';
      playSound('complete');
      alert('🔔 Mini-Widget: ¡Tiempo auxiliar finalizado!');
    }
  }, 1000);
}

function stopWidget() {
  clearInterval(widgetInterval);
  widgetRemaining = 0;
  document.getElementById('widget-label').textContent = 'LISTO';
  document.getElementById('widget-display').textContent = '00:00';
}

function updateWidgetDisplay() {
  const m = Math.floor(widgetRemaining / 60);
  const s = widgetRemaining % 60;
  document.getElementById('widget-display').textContent = 
    `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* ================= RECORDATORIO AGUA ================= */
function requestNotifyPermission() {
  if (!('Notification' in window)) {
    alert('Tu navegador no soporta notificaciones nativas.');
    return;
  }
  Notification.requestPermission().then(permission => {
    if (permission === 'granted') {
      new Notification('CyberTracker', { body: 'Notificaciones activadas.' });
    } else {
      alert('Permiso denegado.');
    }
  });
}

function updateWaterReminder() {
  const val = parseInt(document.getElementById('water-interval').value);
  waterIntervalTime = val;
  localStorage.setItem('cyber_water_int', waterIntervalTime);
  initWaterReminder();
}

function initWaterReminder() {
  clearInterval(waterTimer);
  if (waterIntervalTime > 0) {
    const ms = waterIntervalTime * 60 * 1000;
    waterTimer = setInterval(() => {
      playSound('complete');
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('💧 Hidratación Requerida', {
          body: 'Hora de beber un vaso de agua.',
          icon: 'icono.svg'
        });
      } else {
        alert('💧 ¡Hora de beber agua!');
      }
    }, ms);
  }
}

/* ================= CALENDARIO ================= */
function renderCalendar() {
  document.getElementById('cal-month-title').textContent = `${monthNames[currentMonth]} ${currentYear}`;
  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  let firstDayIndex = new Date(currentYear, currentMonth, 1).getDay() - 1;
  if (firstDayIndex === -1) firstDayIndex = 6;
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  for (let i = 0; i < firstDayIndex; i++) {
    const empty = document.createElement('div');
    empty.className = 'day-cell empty';
    grid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement('div');
    cell.className = 'day-cell';
    cell.textContent = d;

    const dayStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    if (dayStr === selectedCalDate) cell.classList.add('selected');
    
    const hasData = sessions.some(s => s.date === dayStr);
    if (hasData) cell.classList.add('has-data');

    cell.onclick = () => {
      selectedCalDate = dayStr;
      renderCalendar();
      renderDayHistory();
    };

    grid.appendChild(cell);
  }

  renderDayHistory();
}

function prevMonth() {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  renderCalendar();
}

function nextMonth() {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  renderCalendar();
}

function renderDayHistory() {
  const [y, m, d] = selectedCalDate.split('-');
  document.getElementById('selected-day-label').textContent = `SESIONES DEL ${d}/${m}/${y}`;
  const list = document.getElementById('day-history-list');
  list.innerHTML = '';

  const daySessions = sessions.filter(s => s.date === selectedCalDate);

  if (daySessions.length === 0) {
    list.innerHTML = '<div style="color: var(--text-muted); font-size: 0.9rem; text-align: center; padding: 10px;">Sin registros en esta fecha.</div>';
    return;
  }

  daySessions.forEach(s => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <span><strong>[${s.tag}]</strong> ${s.sub}</span>
      <span style="color: var(--highlight); font-weight: bold;">+${s.mins} min</span>
    `;
    list.appendChild(div);
  });
}

function renderProfileStats() {
  const container = document.getElementById('all-time-stats');
  container.innerHTML = '';

  const totals = {};
  tags.forEach(t => totals[t] = 0);

  sessions.forEach(s => {
    totals[s.tag] = (totals[s.tag] || 0) + s.mins;
  });

  tags.forEach(t => {
    const row = document.createElement('div');
    row.className = 'stat-row';
    row.innerHTML = `
      <span>&gt; ${t}</span>
      <span class="stat-val">${totals[t] || 0} MIN</span>
    `;
    container.appendChild(row);
  });
}

init();
