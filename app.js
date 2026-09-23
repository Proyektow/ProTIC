let xp = parseInt(localStorage.getItem('cal_xp')) || 0;
let tasks = JSON.parse(localStorage.getItem('cal_tasks')) || [];

function updateStats() {
  const level = Math.floor(xp / 100) + 1;
  document.getElementById('level').textContent = level;
  document.getElementById('xp').textContent = xp % 100;
  localStorage.setItem('cal_xp', xp);
}

function renderTasks() {
  const container = document.getElementById('tasks-container');
  container.innerHTML = '';

  tasks.forEach((t, index) => {
    const div = document.createElement('div');
    div.className = `task ${t.done ? 'completed' : ''}`;
    div.innerHTML = `
      <span>${t.text}</span>
      <button onclick="toggleTask(${index})">${t.done ? 'Revertir' : 'Completar'}</button>
    `;
    container.appendChild(div);
  });

  localStorage.setItem('cal_tasks', JSON.stringify(tasks));
}

function addTask() {
  const input = document.getElementById('task-input');
  if (!input.value.trim()) return;
  tasks.push({ text: input.value, done: false });
  input.value = '';
  renderTasks();
}

function toggleTask(index) {
  if (!tasks[index].done) {
    tasks[index].done = true;
    xp += 20; // Ganas 20 de experiencia
  } else {
    tasks[index].done = false;
    xp = Math.max(0, xp - 20);
  }
  updateStats();
  renderTasks();
}

// Cargar al inicio
updateStats();
renderTasks();