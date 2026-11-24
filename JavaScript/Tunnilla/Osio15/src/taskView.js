// Tehtävien näyttäminen HTML-sivulla
function renderTasks(tasks, onToggle, onDelete) {
  const list = document.getElementById("task-list");
  const count = document.getElementById("task-count");

  list.replaceChildren();

  tasks.forEach((task) => {
    const li = document.createElement("li");

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;

    checkbox.addEventListener("change", () => {
      onToggle(task.id);
    });

    const span = document.createElement("span");
    span.textContent = task.text;

    if (task.completed) {
      span.style.textDecoration = "line-through";
    }

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.textContent = "Poista";

    deleteButton.addEventListener("click", () => {
      onDelete(task.id);
    });

    li.append(checkbox, span, deleteButton);
    list.appendChild(li);
  });

  const completed = tasks.filter((task) => task.completed).length;

  count.textContent = `Tehtäviä ${tasks.length}, valmiita ${completed}`;
}

export { renderTasks };
