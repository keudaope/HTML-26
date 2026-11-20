// Uuden tehtävän lisääminen
function addTask(tasks, text) {
  const task = {
    id: crypto.randomUUID(),
    text: text,
    completed: false,
  };

  return [...tasks, task];
}

// Tehtävän tilan vaihtaminen
function toggleTask(tasks, id) {
  return tasks.map((task) =>
    task.id === id ? { ...task, completed: !task.completed } : task,
  );
}

// Tehtävän poistaminen
function deleteTask(tasks, id) {
  return tasks.filter((task) => task.id !== id);
}

export { addTask, toggleTask, deleteTask };