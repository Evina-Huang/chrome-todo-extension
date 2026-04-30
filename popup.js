(function () {
  const form = document.querySelector("#todoForm");
  const input = document.querySelector("#todoInput");
  const categoryInput = document.querySelector("#categoryInput");
  const list = document.querySelector("#todoList");
  const emptyState = document.querySelector("#emptyState");
  const countText = document.querySelector("#countText");
  const clearDone = document.querySelector("#clearDone");
  const statusFilterButtons = Array.from(document.querySelectorAll(".filter"));
  const categoryToolbar = document.querySelector(".category-toolbar");
  const categorySuggestions = document.querySelector("#categorySuggestions");
  const todayText = document.querySelector("#todayText");

  const UNCATEGORIZED_FILTER = "__uncategorized__";
  const UNCATEGORIZED_TONE = { ticket: "#fff9e8", tag: "#6a6255" };
  const DECK_TONES = [
    { ticket: "#fff9e8", tag: "#ff5a2f" },
    { ticket: "#f0ffb4", tag: "#127c58" },
    { ticket: "#e6f7ff", tag: "#1f9fb8" },
    { ticket: "#ffe7dd", tag: "#c93419" },
    { ticket: "#e9e7ff", tag: "#315bff" },
  ];

  let todos = [];
  let currentFilter = "all";
  let currentCategory = "all";
  let editingId = null;

  const storage = {
    get() {
      if (hasChromeStorage()) {
        return new Promise((resolve) => {
          chrome.storage.local.get({ todos: [] }, (result) => {
            if (chrome.runtime && chrome.runtime.lastError) {
              resolve([]);
              return;
            }
            resolve(normalizeTodos(result.todos));
          });
        });
      }

      try {
        return Promise.resolve(normalizeTodos(JSON.parse(localStorage.getItem("todos") || "[]")));
      } catch {
        return Promise.resolve([]);
      }
    },
    set(nextTodos) {
      if (hasChromeStorage()) {
        return new Promise((resolve) => {
          chrome.storage.local.set({ todos: nextTodos }, resolve);
        });
      }

      localStorage.setItem("todos", JSON.stringify(nextTodos));
      return Promise.resolve();
    },
  };

  function hasChromeStorage() {
    return (
      typeof chrome !== "undefined" &&
      chrome.storage &&
      chrome.storage.local &&
      typeof chrome.storage.local.get === "function"
    );
  }

  function normalizeTodos(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item) => item && typeof item.title === "string")
      .map((item) => ({
        id: String(item.id || makeId()),
        title: item.title.trim().slice(0, 80),
        category: normalizeCategory(item.category),
        completed: Boolean(item.completed),
        createdAt: Number(item.createdAt) || Date.now(),
        updatedAt: Number(item.updatedAt) || Date.now(),
      }))
      .filter((item) => item.title.length > 0);
  }

  function normalizeCategory(category) {
    return typeof category === "string" ? category.trim().slice(0, 18) : "";
  }

  function makeId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function setTodayText() {
    const formatter = new Intl.DateTimeFormat("zh-CN", {
      month: "long",
      day: "numeric",
      weekday: "long",
    });
    todayText.textContent = formatter.format(new Date());
  }

  async function saveAndRender() {
    await storage.set(todos);
    render();
  }

  function getVisibleTodos() {
    return todos.filter((todo) => {
      const matchesStatus =
        currentFilter === "all" ||
        (currentFilter === "active" && !todo.completed) ||
        (currentFilter === "done" && todo.completed);
      const matchesCategory =
        currentCategory === "all" ||
        (currentCategory === UNCATEGORIZED_FILTER && !todo.category) ||
        todo.category === currentCategory;

      return matchesStatus && matchesCategory;
    });
  }

  function getUsedCategories() {
    return Array.from(
      new Set(todos.map((todo) => normalizeCategory(todo.category)).filter(Boolean)),
    );
  }

  function render() {
    const usedCategories = getUsedCategories();
    const hasUncategorized = todos.some((todo) => !todo.category);
    const categoryStillExists =
      currentCategory === "all" ||
      (currentCategory === UNCATEGORIZED_FILTER && hasUncategorized) ||
      usedCategories.includes(currentCategory);

    if (!categoryStillExists) {
      currentCategory = "all";
    }

    const visibleTodos = getVisibleTodos();
    const activeCount = todos.filter((todo) => !todo.completed).length;
    const doneCount = todos.length - activeCount;

    renderCategoryControls(usedCategories, hasUncategorized);
    renderCategorySuggestions(usedCategories);
    list.replaceChildren(...visibleTodos.map(createTodoElement));
    emptyState.classList.toggle("visible", visibleTodos.length === 0);
    clearDone.disabled = doneCount === 0;
    countText.textContent = activeCount === 0 ? "没有未完成事项" : `${activeCount} 件待办`;

    statusFilterButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.filter === currentFilter);
    });

    Array.from(categoryToolbar.querySelectorAll(".category-filter")).forEach((button) => {
      button.classList.toggle("active", button.dataset.category === currentCategory);
    });
  }

  function renderCategoryControls(usedCategories, hasUncategorized) {
    const buttons = [
      createCategoryFilter("all", "全部分类"),
      ...usedCategories.map((category) => createCategoryFilter(category, category)),
    ];

    if (hasUncategorized) {
      buttons.push(createCategoryFilter(UNCATEGORIZED_FILTER, "无分类"));
    }

    categoryToolbar.replaceChildren(...buttons);
  }

  function createCategoryFilter(value, label) {
    const button = document.createElement("button");
    button.className = "category-filter";
    button.type = "button";
    button.dataset.category = value;
    button.textContent = label;
    return button;
  }

  function renderCategorySuggestions(usedCategories) {
    categorySuggestions.replaceChildren(
      ...usedCategories.map((category) => {
        const option = document.createElement("option");
        option.value = category;
        return option;
      }),
    );
  }

  function createTodoElement(todo) {
    const item = document.createElement("li");
    item.className = `todo-item${todo.completed ? " done" : ""}`;
    item.dataset.id = todo.id;
    const tone = getTodoTone(todo);
    item.style.setProperty("--ticket-bg", tone.ticket);
    item.style.setProperty("--tag-color", tone.tag);

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    checkbox.setAttribute("aria-label", todo.completed ? `标记 ${todo.title} 为进行中` : `标记 ${todo.title} 为已完成`);

    const content = document.createElement("div");
    content.className = "todo-content";

    const category = document.createElement("span");
    category.className = "todo-category";
    category.textContent = todo.category || "无分类";

    const title = document.createElement("span");
    title.className = "todo-title";
    title.textContent = todo.title;

    content.append(category, title);

    const actions = document.createElement("div");
    actions.className = "item-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "edit";
    editButton.textContent = "编辑";
    editButton.setAttribute("aria-label", `编辑 ${todo.title}`);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete";
    deleteButton.textContent = "删除";
    deleteButton.setAttribute("aria-label", `删除 ${todo.title}`);

    actions.append(editButton, deleteButton);
    item.append(checkbox, content, actions);

    if (editingId === todo.id) {
      const editRow = createEditRow(todo);
      content.replaceWith(editRow);
      actions.remove();
    }

    return item;
  }

  function getTodoTone(todo) {
    if (!todo.category) {
      return UNCATEGORIZED_TONE;
    }

    return DECK_TONES[hashText(todo.category) % DECK_TONES.length];
  }

  function hashText(text) {
    return Array.from(text).reduce((hash, char) => {
      return (hash * 31 + char.charCodeAt(0)) >>> 0;
    }, 7);
  }

  function createEditRow(todo) {
    const row = document.createElement("div");
    row.className = "edit-row";

    const editInput = document.createElement("input");
    editInput.type = "text";
    editInput.maxLength = 80;
    editInput.value = todo.title;
    editInput.setAttribute("aria-label", "编辑待办");

    const editCategory = document.createElement("input");
    editCategory.type = "text";
    editCategory.maxLength = 18;
    editCategory.value = todo.category;
    editCategory.setAttribute("aria-label", "编辑分类");
    editCategory.setAttribute("placeholder", "分类");
    editCategory.setAttribute("list", "categorySuggestions");

    const actions = document.createElement("div");
    actions.className = "edit-actions";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.className = "save";
    saveButton.textContent = "保存";

    const cancelButton = document.createElement("button");
    cancelButton.type = "button";
    cancelButton.className = "cancel";
    cancelButton.textContent = "取消";

    actions.append(saveButton, cancelButton);
    row.append(editInput, editCategory, actions);

    requestAnimationFrame(() => {
      editInput.focus();
      editInput.select();
    });

    return row;
  }

  function updateTodo(id, updater) {
    todos = todos.map((todo) => {
      if (todo.id !== id) {
        return todo;
      }
      return {
        ...updater(todo),
        updatedAt: Date.now(),
      };
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const title = input.value.trim();

    if (!title) {
      input.focus();
      return;
    }

    todos = [
      {
        id: makeId(),
        title,
        category: normalizeCategory(categoryInput.value),
        completed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      ...todos,
    ];
    input.value = "";
    categoryInput.value = "";
    editingId = null;
    await saveAndRender();
    input.focus();
  });

  statusFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filter;
      editingId = null;
      render();
    });
  });

  categoryToolbar.addEventListener("click", (event) => {
    const button = event.target.closest(".category-filter");
    if (!button) {
      return;
    }

    currentCategory = button.dataset.category;
    editingId = null;
    render();
  });

  list.addEventListener("change", async (event) => {
    if (event.target.type !== "checkbox") {
      return;
    }

    const item = event.target.closest(".todo-item");
    updateTodo(item.dataset.id, (todo) => ({
      ...todo,
      completed: event.target.checked,
    }));
    await saveAndRender();
  });

  list.addEventListener("click", async (event) => {
    const item = event.target.closest(".todo-item");
    if (!item) {
      return;
    }

    const id = item.dataset.id;
    if (event.target.classList.contains("delete")) {
      todos = todos.filter((todo) => todo.id !== id);
      editingId = null;
      await saveAndRender();
      return;
    }

    if (event.target.classList.contains("edit")) {
      editingId = id;
      render();
      return;
    }

    if (event.target.classList.contains("cancel")) {
      editingId = null;
      render();
      return;
    }

    if (event.target.classList.contains("save")) {
      await saveEdit(item);
    }
  });

  list.addEventListener("keydown", async (event) => {
    const item = event.target.closest(".todo-item");
    if (!item || !event.target.matches(".edit-row input")) {
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      await saveEdit(item);
    }

    if (event.key === "Escape") {
      editingId = null;
      render();
    }
  });

  async function saveEdit(item) {
    const editInput = item.querySelector(".edit-row input");
    const title = editInput.value.trim();

    if (!title) {
      editInput.focus();
      return;
    }

    updateTodo(item.dataset.id, (todo) => ({
      ...todo,
      title,
      category: normalizeCategory(item.querySelector(".edit-row input[aria-label='编辑分类']").value),
    }));
    editingId = null;
    await saveAndRender();
  }

  clearDone.addEventListener("click", async () => {
    todos = todos.filter((todo) => !todo.completed);
    editingId = null;
    await saveAndRender();
  });

  async function init() {
    setTodayText();
    todos = await storage.get();
    render();
    input.focus();
  }

  init();
})();
