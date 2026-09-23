let totalXp = parseInt(localStorage.getItem('cal_xp')) || 0;
let tasks = JSON.parse(localStorage.getItem('cal_tasks')) || [];

let currentDate = new Date();
let currentYear = currentDate.getFullYear();
let currentMonth = currentDate.getMonth();

function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

let selectedDate = formatDate(currentDate);

const monthNames = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function saveAndRender() {
  localStorage.setItem('cal_tasks', JSON.stringify(tasks));
  localStorage.setItem('cal_xp', totalXp);
  updateStats();
  renderCalendar();
  renderTasks();
}

function updateStats() {
  // Evitar que la XP baje de 0
  if (totalXp < 0) totalXp = 0; 

  const level = Math.floor(totalXp / 100) + 1;
  const currentXp = totalXp % 100;

  document.getElementById('level').textContent = level;
  document.getElementById('xp-current').textContent = currentXp;
  document.getElementById('progress-fill').style.width = `${currentXp}%`;
}

function renderCalendar() {
  document.getElementById('cal-month-title').textContent = `${monthNames[currentMonth]} ${currentYear}`;
  const grid = document.getElementById('cal-grid');
  grid.innerHTML = '';

  // Ajuste para que Lunes sea el primer día (0) y Domingo el último (6)
  let firstDayIndex = new Date(currentYear, currentMonth, 1).getDay() - 1;
  if (firstDayIndex === -1) firstDayIndex = 6; 
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const todayFormatted = formatDate(new Date());

  // Rellenar huecos vacíos antes del primer día del mes
  for (let i = 0; i < firstDayIndex; i++) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'day empty';
    grid.appendChild(emptyDiv);
  }

  // Crear los días del mes
  for (let d = 1; d <= daysInMonth; d++) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'day';
    dayDiv.textContent = d;

    const dayString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    if (dayString === selectedDate) dayDiv.classList.add('selected');
    if (dayString === todayFormatted) dayDiv.classList.add('today');

    // Lógica para los puntos indicadores de tareas
    const dayTasks = tasks.filter(t => t.date === dayString);
    if (dayTasks.length > 0) {
      const allDone = dayTasks.every(t => t.done);
      if (allDone) {
        dayDiv.classList.add('all-completed');
      } else {
        dayDiv.classList.add('has-tasks');
      }
    }

    dayDiv.onclick = () => {
      selectedDate = dayString;
      renderCalendar();
      renderTasks();
    };

    grid.appendChild(dayDiv);
  }
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

function renderTasks() {
  // Convertir fecha YYYY-MM-DD a formato más legible (DD/MM/YYYY)
  const [y, m, d] = selectedDate.split('-');
  document.getElementById('selected-date-label').textContent = `Misiones del ${d}/${m}/${y}`;
  
  const list = document.getElementById('tasks-list');
  list.innerHTML = '';

  // Filtrar tareas del día seleccionado manteniendo su índice original
  const filteredTasks = tasks.map((t, idx) => ({ ...t, originalIndex: idx }))
                             .filter(t => t.date === selectedDate);

  if (filteredTasks.length === 0) {
    list.innerHTML = '<p style="color: #777; text-align: center; margin-top: 10px;">Día libre. ¡Descansa o añade una misión!</p>';
    return;
  }

  filteredTasks.forEach(task => {
    const item = document.createElement('div');
    item.className = `task-item ${task.done ? 'completed' : ''}`;
    
    item.innerHTML = `
      <span class="task-text"><strong>${task.title}</strong></span>
      <div class="task-actions">
        <button class="btn-action" onclick="toggleTask(${task.originalIndex})">
          ${task.done ? 'Deshacer' : '✔ Completar'}
        </button>
        <button class="btn-delete" onclick="deleteTask(${task.originalIndex})">🗑</button>
      </div>
    `;
    list.appendChild(item);
  });
}

function addTask() {
  const input = document.getElementById('task-title');
  const title = input.value.trim();

  if (!title) return;

  tasks.push({
    title: title,
    date: selectedDate,
    done: false
  });

  input.value = '';
  saveAndRender();
}

function toggleTask(index) {
  if (!tasks[index].done) {
    tasks[index].done = true;
    totalXp += 25;
  } else {
    tasks[index].done = false;
    totalXp -= 25;
  }
  saveAndRender();
}

function deleteTask(index) {
  // Si la tarea estaba completada, restar la XP para evitar trampas
  if (tasks[index].done) {
    totalXp -= 25;
  }
  // Eliminar la tarea del array principal
  tasks.splice(index, 1);
  saveAndRender();
}

// Arrancar la app al cargar
saveAndRender();
