import { loadTasks, saveTasks } from "./storages.js";
import { addTask, toggleTask, deleteTask } from "./tasks.js";
import { renderTasks } from "./taskView.js";

let tasks = [];

// Tallennetaan ja päivitetään näkymä
function update() {
  saveTasks(tasks);
  renderTasks(tasks, handleToggle, handleDelete);
}

// Lisätään uusi tehtävä
function handleAdd(text) {
  tasks = addTask(tasks, text);
  update();
}

// Vaihdetaan tehtävän tila
function handleToggle(id) {
  tasks = toggleTask(tasks, id);
  update();
}

// Poistetaan tehtävä
function handleDelete(id) {
  tasks = deleteTask(tasks, id);
  update();
}

// Sovelluksen käynnistys
function init() {
  tasks = loadTasks();

  renderTasks(tasks, handleToggle, handleDelete);

  const form = document.getElementById("task-form");
  const input = document.getElementById("task-input");

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const text = input.value.trim();

    if (text === "") {
      return;
    }

    handleAdd(text);

    input.value = "";
    input.focus();
  });
}

init();
