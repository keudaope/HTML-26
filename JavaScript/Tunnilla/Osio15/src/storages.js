const STORAGE_KEY = "todo-tasks";

// Tehtävien lataaminen
function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const tasks = saved ? JSON.parse(saved) : [];

    return Array.isArray(tasks) ? tasks : [];
  } catch (error) {
    console.error("Lataus epäonnistui:", error);
    return [];
  }
}

// Tehtävien tallentaminen
function saveTasks(tasks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export { loadTasks, saveTasks };
