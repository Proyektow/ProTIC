// Base de datos persistente
let currentTheme = localStorage.getItem('cyber_theme') || 'medium';
let totalXp = parseInt(localStorage.getItem('cyber_timer_xp')) || 0;
let tags = JSON.parse(localStorage.getItem('cyber_tags')) || ['Ejercicio', 'Estudios', 'Juego', 'Lectura'];
let selectedTag = localStorage.getItem('cyber_selected_tag') || tags[0];
let sessions = JSON.parse(localStorage.getItem('cyber_sessions')) || [];
let waterIntervalTime = parseInt(localStorage.getItem('cyber_water_int')) || 0;

// Calendario
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

// Temporizadores
let timerInterval = null;
let remainingSeconds = 0;
let targetMinutes = 20;
let isRunning = false;

let widgetInterval = null;
let widgetRemaining = 0;
let waterTimer = null;

function init() {
  applyTheme(currentTheme);
  renderTags();
  updateUI();
  renderCalendar();
  renderProfileStats();
  initWaterReminder();

  document.getElementById('subgroup-input').addEventListener('input', (e) => {
    const val = e.target.value.trim();
    document.getElementById('active-subgroup-display').textContent = 
      val ? `> Misión: ${val}` : '> Misión: Sin subgrupo';
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && isRunning) {
      cancelTimer(false);
      alert(`¡PROTOCOLO ABORTADO! Has salido de la pantalla durante [${selectedTag}]. 0 XP sumados.`);
    }
  });
}

/* ================= TEMAS ================= */

function applyTheme(theme) {
  document.body.className = '';
  if (isRunning) document.body.classList.add('focus-mode');
  
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

/* ================= VISTAS ================= */

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
      document.getElementById('active-tag-display').textContent = `[ ${selectedTag.toUpperCase()} ]`;
    };
    pill.appendChild(tagText);

    const delBtn = document.createElement('span');
    delBtn.className = 'tag-del-btn';
    delBtn.textContent = '×';
    delBtn.title = 'Eliminar';
    delBtn.onclick = (e) => {
      e.stopPropagation();
      deleteTag(tag);
    };
    pill.appendChild(delBtn);

    container.appendChild(pill);
  });

  document.getElementById('active-tag-display').textContent = `[ ${selectedTag.toUpperCase()} ]`;
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

/* ================= CRONÓMETRO: MODO FOCO TOTAL CENTRADO ================= */

function updateUI() {
  const level = Math.floor(totalXp / 100) + 1;
  const currentXp = totalXp % 100;
  
  document.getElementById('level').textContent = level;
  document.getElementById('current-xp').textContent = currentXp;
  document.getElementById('xp-fill').style.width = `${currentXp}%`;

  if (!isRunning) {
    const mins = parseInt(document.getElementById('minutes-input').value) || 20;
    document.getElementById('time-display').textContent = `${String(mins).padStart(2, '0')}:00`;
  }
}

document.getElementById('minutes-input').addEventListener('input', (e) => {
  if (!isRunning) {
    const val = Math.max(1, parseInt(e.target.value) || 1);
    document.getElementById('time-display').textContent = `${String(val).padStart(2, '0')}:00`;
  }
});

function startTimer() {
  targetMinutes = parseInt(document.getElementById('minutes-input').value) || 1;
  remainingSeconds = targetMinutes * 60;
  isRunning = true;

  // Activa la clase global de foco para centrar todo en la pantalla
  document.body.classList.add('focus-mode');

  // Ocultar elementos sobrantes
  document.getElementById('main-nav-tabs').style.display = 'none';
  document.getElementById('panel-level-xp').style.display = 'none';
  document.getElementById('tags-panel').style.display = 'none';
  document.getElementById('controls-panel').style.display = 'none';
  document.getElementById('status-msg').style.display = 'none';
  document.getElementById('btn-start').style.display = 'none';
  document.getElementById('btn-cancel').style.display = 'block';

  timerInterval = setInterval(() => {
    remainingSeconds--;
    
    const m = Math.floor(remainingSeconds / 60);
    const s = remainingSeconds % 60;
    document.getElementById('time-display').textContent = 
      `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;

    if (remainingSeconds <= 0) {
      completeSession();
    }
  }, 1000);
}

function restoreUIAfterTimer() {
  document.body.classList.remove('focus-mode');

  document.getElementById('main-nav-tabs').style.display = 'flex';
  document.getElementById('panel-level-xp').style.display = 'block';
  document.getElementById('tags-panel').style.display = 'block';
  document.getElementById('controls-panel').style.display = 'flex';
  document.getElementById('status-msg').style.display = 'block';
  document.getElementById('btn-start').style.display = 'block';
  document.getElementById('btn-cancel').style.display = 'none';
}

function cancelTimer(manual = false) {
  clearInterval(timerInterval);
  isRunning = false;
  restoreUIAfterTimer();
  updateUI();
  if (manual) alert('Sesión cancelada. 0 puntos obtenidos.');
}

function completeSession() {
  clearInterval(timerInterval);
  isRunning = false;

  const earnedXp = targetMinutes * 2;
  totalXp += earnedXp;

  const sub = document.getElementById('subgroup-input').value.trim() || 'General';
  const todayStr = formatDate(new Date());

  sessions.push({
    date: todayStr,
    tag: selectedTag,
    sub: sub,
    mins: targetMinutes
  });

  localStorage.setItem('cyber_timer_xp', totalXp);
  localStorage.setItem('cyber_sessions', JSON.stringify(sessions));

  restoreUIAfterTimer();
  updateUI();
  alert(`⚡ MISIÓN COMPLETADA EN [${selectedTag} / ${sub}]: +${earnedXp} XP y +${targetMinutes} min.`);
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
  
  document.getElementById('widget-label').textContent = `EN CURSO (${mins} MIN)`;
  updateWidgetDisplay();

  widgetInterval = setInterval(() => {
    widgetRemaining--;
    updateWidgetDisplay();

    if (widgetRemaining <= 0) {
      clearInterval(widgetInterval);
      document.getElementById('widget-label').textContent = '¡TIEMPO CUMPLIDO!';
      playBeep();
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
      playBeep();
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

function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {}
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
