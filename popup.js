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
  const DEFAULT_COLUMNS = ["今天", "本周", "待办", "已完成"];
  const PAPER_COLORS = ["paper-white", "paper-white", "paper-white", "paper-complete"];

  let todos = [];
  let boardColumns = DEFAULT_COLUMNS.slice();
  let currentFilter = "all";
  let currentCategory = "all";
  let editingId = null;
  let addingColumn = null;
  let addingBoardColumn = false;
  let editingBoardColumn = null;
  let draggedTodoId = null;
  let draggedColumn = null;
  const isBoardPage = document.body.classList.contains("newtab-page");

  const storage = {
    get() {
      if (hasChromeStorage()) {
        return new Promise((resolve) => {
          chrome.storage.local.get({ todos: [], boardColumns: DEFAULT_COLUMNS }, (result) => {
            if (chrome.runtime && chrome.runtime.lastError) {
              resolve({
                todos: [],
                columns: DEFAULT_COLUMNS.slice(),
              });
              return;
            }
            const nextTodos = normalizeTodos(result.todos);
            resolve({
              todos: nextTodos,
              columns: normalizeColumns(result.boardColumns, nextTodos),
            });
          });
        });
      }

      try {
        const nextTodos = normalizeTodos(JSON.parse(localStorage.getItem("todos") || "[]"));
        return Promise.resolve({
          todos: nextTodos,
          columns: normalizeColumns(
            JSON.parse(localStorage.getItem("boardColumns") || "[]"),
            nextTodos,
          ),
        });
      } catch {
        return Promise.resolve({
          todos: [],
          columns: DEFAULT_COLUMNS.slice(),
        });
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
    setColumns(nextColumns) {
      if (hasChromeStorage()) {
        return new Promise((resolve) => {
          chrome.storage.local.set({ boardColumns: nextColumns }, resolve);
        });
      }

      localStorage.setItem("boardColumns", JSON.stringify(nextColumns));
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

  function normalizeColumns(value, sourceTodos = todos) {
    const columns = [];
    const source = Array.isArray(value) && value.length > 0 ? value : DEFAULT_COLUMNS;

    source.forEach((column) => {
      const normalized = normalizeCategory(column);
      if (normalized && !columns.includes(normalized)) {
        columns.push(normalized);
      }
    });

    sourceTodos.forEach((todo) => {
      if (todo.category && !columns.includes(todo.category)) {
        columns.push(todo.category);
      }
    });

    return columns.length > 0 ? columns : DEFAULT_COLUMNS.slice();
  }

  function makeId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function setTodayText() {
    const today = new Date();

    if (isBoardPage) {
      todayText.textContent = formatBoardDate(today);
      return;
    }

    const formatter = new Intl.DateTimeFormat("zh-CN", {
      month: "long",
      day: "numeric",
      weekday: "long",
    });
    todayText.textContent = formatter.format(today);
  }

  function formatBoardDate(date) {
    const year = date.getFullYear();
    const month = padDateNumber(date.getMonth() + 1);
    const day = padDateNumber(date.getDate());
    const weekday = new Intl.DateTimeFormat("zh-CN", { weekday: "long" }).format(date);
    return `${year} 年 ${month} 月 ${day} 日 ${weekday} ${formatLunarDate(date)}`;
  }

  function padDateNumber(value) {
    return String(value).padStart(2, "0");
  }

  function formatLunarDate(date) {
    try {
      const parts = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).formatToParts(date);
      const yearName = parts.find((part) => part.type === "yearName")?.value;
      const month = parts.find((part) => part.type === "month")?.value;
      const day = Number(parts.find((part) => part.type === "day")?.value);

      if (yearName && month && Number.isFinite(day)) {
        return `${yearName}年${formatLunarMonth(month)}月${formatLunarDay(day)}`;
      }
    } catch {
      // Keep the new tab usable if the runtime lacks the Chinese calendar formatter.
    }

    return "";
  }

  function formatLunarMonth(value) {
    return value.replace(/月$/, "");
  }

  function formatLunarDay(value) {
    const days = [
      "初一",
      "初二",
      "初三",
      "初四",
      "初五",
      "初六",
      "初七",
      "初八",
      "初九",
      "初十",
      "十一",
      "十二",
      "十三",
      "十四",
      "十五",
      "十六",
      "十七",
      "十八",
      "十九",
      "二十",
      "廿一",
      "廿二",
      "廿三",
      "廿四",
      "廿五",
      "廿六",
      "廿七",
      "廿八",
      "廿九",
      "三十",
    ];
    return days[value - 1] || String(value);
  }

  async function saveAndRender() {
    boardColumns = normalizeColumns(boardColumns, todos);
    await Promise.all([storage.set(todos), storage.setColumns(boardColumns)]);
    addingColumn = null;
    editingBoardColumn = null;
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

    if (isBoardPage) {
      currentCategory = "all";
    } else {
      renderCategoryControls(usedCategories, hasUncategorized);
    }

    renderCategorySuggestions(usedCategories);
    list.classList.toggle("board-list", isBoardPage);
    list.replaceChildren(
      ...(isBoardPage ? createBoardElements(visibleTodos) : visibleTodos.map(createTodoElement)),
    );
    emptyState.classList.toggle("visible", visibleTodos.length === 0);
    clearDone.disabled = doneCount === 0;
    countText.textContent = activeCount === 0 ? "没有未完成事项" : `${activeCount} 件待办`;

    statusFilterButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.filter === currentFilter);
    });

    if (!isBoardPage) {
      Array.from(categoryToolbar.querySelectorAll(".category-filter")).forEach((button) => {
        button.classList.toggle("active", button.dataset.category === currentCategory);
      });
    }
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

  function createBoardElements(visibleTodos) {
    const groups = groupTodosForWall(visibleTodos);
    return [...groups.map((group, groupIndex) => createBoardStack(group, groupIndex)), createBoardColumnAddElement()];
  }

  function groupTodosForWall(sourceTodos) {
    boardColumns = normalizeColumns(boardColumns, sourceTodos);

    return boardColumns.map((column) => ({
      key: column,
      label: column,
      todos: sourceTodos.filter((todo) => getWallColumn(todo) === column),
    }));
  }

  function getWallColumn(todo) {
    if (todo.category && boardColumns.includes(todo.category)) {
      return todo.category;
    }

    return boardColumns[0] || DEFAULT_COLUMNS[0];
  }

  function createBoardStack(group, groupIndex) {
    const stack = document.createElement("li");
    stack.className = "board-stack";
    stack.dataset.column = group.key;

    const header = document.createElement("div");
    header.className = "stack-header";

    const count = document.createElement("span");
    count.textContent = String(group.todos.length);

    if (editingBoardColumn === group.key) {
      const input = document.createElement("input");
      input.className = "column-name-input";
      input.type = "text";
      input.maxLength = 18;
      input.value = group.label;
      input.setAttribute("aria-label", "编辑分类列");

      const saveButton = document.createElement("button");
      saveButton.className = "column-save";
      saveButton.type = "button";
      saveButton.textContent = "保存";

      const cancelButton = document.createElement("button");
      cancelButton.className = "column-cancel";
      cancelButton.type = "button";
      cancelButton.textContent = "取消";

      header.classList.add("editing-column");
      header.append(input, saveButton, cancelButton);

      requestAnimationFrame(() => {
        input.focus();
        input.select();
      });
    } else {
      header.draggable = true;
      header.dataset.column = group.key;
      header.classList.add("column-draggable");

      const title = document.createElement("h2");
      title.textContent = group.label;

      const actions = document.createElement("div");
      actions.className = "column-actions";

      const renameButton = document.createElement("button");
      renameButton.className = "column-rename";
      renameButton.type = "button";
      renameButton.dataset.column = group.key;
      renameButton.textContent = "改名";

      const deleteButton = document.createElement("button");
      deleteButton.className = "column-delete";
      deleteButton.type = "button";
      deleteButton.dataset.column = group.key;
      deleteButton.disabled = group.todos.length > 0 || boardColumns.length <= 1;
      deleteButton.textContent = "删除";

      actions.append(renameButton, deleteButton);
      header.append(title, count, actions);
    }

    const cards = document.createElement("ul");
    cards.className = "stack-cards";
    cards.dataset.column = group.key;
    cards.setAttribute("aria-label", `${group.label} 分类`);

    group.todos.forEach((todo, index) => {
      const card = createTodoElement(todo);
      card.classList.add(
        "board-card",
        group.key === "已完成" ? "paper-complete" : PAPER_COLORS[index % 3],
      );
      card.dataset.column = group.key;
      card.draggable = editingId !== todo.id;
      cards.append(card);
    });

    const addCategory = group.key === "已完成" ? "待办" : group.key;
    cards.append(
      addingColumn === group.key ? createWallAddForm(addCategory) : createWallAddButton(group.key, addCategory),
    );

    stack.append(header, cards);
    return stack;
  }

  function createBoardColumnAddElement() {
    const item = document.createElement("li");
    item.className = "board-column-add";

    if (!addingBoardColumn) {
      const button = document.createElement("button");
      button.className = "column-add-open";
      button.type = "button";
      button.textContent = "+ 新增分类";
      item.append(button);
      return item;
    }

    const input = document.createElement("input");
    input.className = "column-new-input";
    input.type = "text";
    input.maxLength = 18;
    input.placeholder = "分类名称";

    const saveButton = document.createElement("button");
    saveButton.className = "column-add-save";
    saveButton.type = "button";
    saveButton.textContent = "添加";

    const cancelButton = document.createElement("button");
    cancelButton.className = "column-add-cancel";
    cancelButton.type = "button";
    cancelButton.textContent = "取消";

    item.append(input, saveButton, cancelButton);

    requestAnimationFrame(() => {
      input.focus();
    });

    return item;
  }

  function createWallAddButton(columnKey, category) {
    const addButton = document.createElement("button");
    addButton.className = "wall-add";
    addButton.type = "button";
    addButton.dataset.column = columnKey;
    addButton.dataset.category = category;
    addButton.textContent = "+ 新建任务";
    return addButton;
  }

  function createWallAddForm(category) {
    const row = document.createElement("li");
    row.className = "wall-add-form";
    row.dataset.category = category;

    const titleInput = document.createElement("input");
    titleInput.className = "wall-title-input";
    titleInput.type = "text";
    titleInput.maxLength = 80;
    titleInput.placeholder = "新任务";

    const saveButton = document.createElement("button");
    saveButton.className = "wall-save";
    saveButton.type = "button";
    saveButton.textContent = "添加";

    const cancelButton = document.createElement("button");
    cancelButton.className = "wall-cancel";
    cancelButton.type = "button";
    cancelButton.textContent = "取消";

    row.append(titleInput, saveButton, cancelButton);

    requestAnimationFrame(() => {
      titleInput.focus();
    });

    return row;
  }

  function createTodoElement(todo) {
    const item = document.createElement("li");
    item.className = `todo-item${todo.completed ? " done" : ""}`;
    item.dataset.id = todo.id;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    checkbox.setAttribute("aria-label", `标记 ${todo.title}`);

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

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "delete";
    deleteButton.textContent = "删除";

    actions.append(editButton, deleteButton);
    item.append(checkbox, content, actions);

    if (editingId === todo.id) {
      const editRow = createEditRow(todo);
      content.replaceWith(editRow);
      actions.remove();
    }

    return item;
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

  list.addEventListener("dragstart", (event) => {
    if (!isBoardPage || event.target.closest("button, input")) {
      event.preventDefault();
      return;
    }

    const columnHeader = event.target.closest(".stack-header[draggable='true']");
    if (columnHeader) {
      draggedColumn = columnHeader.dataset.column;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedColumn);

      requestAnimationFrame(() => {
        columnHeader.closest(".board-stack").classList.add("column-dragging");
      });
      return;
    }

    const item = event.target.closest(".board-card");
    if (!item) {
      return;
    }

    draggedTodoId = item.dataset.id;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", draggedTodoId);

    requestAnimationFrame(() => {
      item.classList.add("dragging");
    });
  });

  list.addEventListener("dragover", (event) => {
    if (!isBoardPage || (!draggedTodoId && !draggedColumn)) {
      return;
    }

    if (draggedColumn) {
      const stack = event.target.closest(".board-stack");
      if (!stack || stack.dataset.column === draggedColumn) {
        return;
      }

      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      clearColumnDragOverState({ keepDragging: true });
      stack.classList.add(getColumnDropSide(stack, event.clientX));
      return;
    }

    const cards = event.target.closest(".stack-cards");
    if (!cards) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    clearDragOverState({ keepDragging: true });
    cards.classList.add("drag-over");

    const beforeCard = getDropBeforeCard(cards, event.clientY);
    if (beforeCard) {
      beforeCard.classList.add("drop-before");
    }
  });

  list.addEventListener("dragleave", (event) => {
    const cards = event.target.closest(".stack-cards");
    if (cards && !cards.contains(event.relatedTarget)) {
      cards.classList.remove("drag-over");
    }

    const stack = event.target.closest(".board-stack");
    if (stack && !stack.contains(event.relatedTarget)) {
      stack.classList.remove("column-drop-before", "column-drop-after");
    }
  });

  list.addEventListener("drop", async (event) => {
    if (!isBoardPage || (!draggedTodoId && !draggedColumn)) {
      return;
    }

    if (draggedColumn) {
      const stack = event.target.closest(".board-stack");
      if (!stack || stack.dataset.column === draggedColumn) {
        return;
      }

      event.preventDefault();
      await moveColumn(draggedColumn, stack.dataset.column, getColumnDropSide(stack, event.clientX));
      draggedColumn = null;
      clearColumnDragOverState();
      return;
    }

    const cards = event.target.closest(".stack-cards");
    if (!cards) {
      return;
    }

    event.preventDefault();
    const beforeCard = getDropBeforeCard(cards, event.clientY);
    await moveTodoToColumn(draggedTodoId, cards.dataset.column, beforeCard ? beforeCard.dataset.id : null);
    draggedTodoId = null;
    clearDragOverState();
  });

  list.addEventListener("dragend", () => {
    draggedTodoId = null;
    draggedColumn = null;
    clearDragOverState();
    clearColumnDragOverState();
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
    if (event.target.classList.contains("column-add-open")) {
      addingBoardColumn = true;
      render();
      return;
    }

    if (event.target.classList.contains("column-add-cancel")) {
      addingBoardColumn = false;
      render();
      return;
    }

    if (event.target.classList.contains("column-add-save")) {
      await saveBoardColumn(event.target.closest(".board-column-add"));
      return;
    }

    if (event.target.classList.contains("column-rename")) {
      editingBoardColumn = event.target.dataset.column;
      render();
      return;
    }

    if (event.target.classList.contains("column-cancel")) {
      editingBoardColumn = null;
      render();
      return;
    }

    if (event.target.classList.contains("column-save")) {
      await saveColumnRename(event.target.closest(".board-stack"));
      return;
    }

    if (event.target.classList.contains("column-delete")) {
      await deleteBoardColumn(event.target.dataset.column);
      return;
    }

    const addButton = event.target.closest(".wall-add");
    if (addButton) {
      addingColumn = addButton.dataset.column;
      render();
      return;
    }

    if (event.target.classList.contains("wall-cancel")) {
      addingColumn = null;
      render();
      return;
    }

    if (event.target.classList.contains("wall-save")) {
      await saveWallTask(event.target.closest(".wall-add-form"));
      return;
    }

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
    if (event.target.matches(".column-new-input")) {
      if (event.key === "Enter") {
        event.preventDefault();
        await saveBoardColumn(event.target.closest(".board-column-add"));
      }

      if (event.key === "Escape") {
        addingBoardColumn = false;
        render();
      }
      return;
    }

    if (event.target.matches(".column-name-input")) {
      if (event.key === "Enter") {
        event.preventDefault();
        await saveColumnRename(event.target.closest(".board-stack"));
      }

      if (event.key === "Escape") {
        editingBoardColumn = null;
        render();
      }
      return;
    }

    if (event.target.matches(".wall-title-input")) {
      if (event.key === "Enter") {
        event.preventDefault();
        await saveWallTask(event.target.closest(".wall-add-form"));
      }

      if (event.key === "Escape") {
        addingColumn = null;
        render();
      }
      return;
    }

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

  async function saveWallTask(row) {
    const title = row.querySelector(".wall-title-input").value.trim();

    if (!title) {
      row.querySelector(".wall-title-input").focus();
      return;
    }

    todos = [
      {
        id: makeId(),
        title,
        category: normalizeCategory(row.dataset.category),
        completed: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      ...todos,
    ];
    await saveAndRender();
  }

  async function saveBoardColumn(item) {
    const input = item.querySelector(".column-new-input");
    const column = normalizeCategory(input.value);

    if (!column || boardColumns.includes(column)) {
      input.focus();
      input.select();
      return;
    }

    boardColumns = [...boardColumns, column];
    addingBoardColumn = false;
    await storage.setColumns(boardColumns);
    render();
  }

  async function saveColumnRename(stack) {
    const input = stack.querySelector(".column-name-input");
    const oldColumn = stack.dataset.column;
    const nextColumn = normalizeCategory(input.value);

    if (!nextColumn || (nextColumn !== oldColumn && boardColumns.includes(nextColumn))) {
      input.focus();
      input.select();
      return;
    }

    boardColumns = boardColumns.map((column) => (column === oldColumn ? nextColumn : column));
    todos = todos.map((todo) =>
      todo.category === oldColumn
        ? {
            ...todo,
            category: nextColumn,
            updatedAt: Date.now(),
          }
        : todo,
    );
    editingBoardColumn = null;
    await Promise.all([storage.set(todos), storage.setColumns(boardColumns)]);
    render();
  }

  async function deleteBoardColumn(column) {
    if (boardColumns.length <= 1 || todos.some((todo) => todo.category === column)) {
      return;
    }

    boardColumns = boardColumns.filter((item) => item !== column);
    await storage.setColumns(boardColumns);
    render();
  }

  function clearDragOverState(options = {}) {
    list.querySelectorAll(".drag-over").forEach((item) => item.classList.remove("drag-over"));
    list.querySelectorAll(".drop-before").forEach((item) => item.classList.remove("drop-before"));

    if (!options.keepDragging) {
      list.querySelectorAll(".dragging").forEach((item) => item.classList.remove("dragging"));
    }
  }

  function clearColumnDragOverState(options = {}) {
    list
      .querySelectorAll(".column-drop-before, .column-drop-after")
      .forEach((item) => item.classList.remove("column-drop-before", "column-drop-after"));

    if (!options.keepDragging) {
      list.querySelectorAll(".column-dragging").forEach((item) => item.classList.remove("column-dragging"));
    }
  }

  function getColumnDropSide(stack, pointerX) {
    const rect = stack.getBoundingClientRect();
    return pointerX < rect.left + rect.width / 2 ? "column-drop-before" : "column-drop-after";
  }

  function getDropBeforeCard(cards, pointerY) {
    const candidates = Array.from(cards.querySelectorAll(".board-card:not(.dragging)"));

    return candidates.find((card) => {
      const rect = card.getBoundingClientRect();
      return pointerY < rect.top + rect.height / 2;
    });
  }

  async function moveTodoToColumn(todoId, targetColumn, beforeTodoId) {
    const movingTodo = todos.find((todo) => todo.id === todoId);
    const normalizedColumn = normalizeCategory(targetColumn);

    if (!movingTodo || !normalizedColumn) {
      return;
    }

    const movedTodo = {
      ...movingTodo,
      category: normalizedColumn,
      updatedAt: Date.now(),
    };
    const nextTodos = todos.filter((todo) => todo.id !== todoId);
    let insertIndex = -1;

    if (beforeTodoId) {
      insertIndex = nextTodos.findIndex((todo) => todo.id === beforeTodoId);
    }

    if (insertIndex < 0) {
      insertIndex = nextTodos.reduce((lastIndex, todo, index) => {
        return getWallColumn(todo) === normalizedColumn ? index : lastIndex;
      }, -1);
      insertIndex += 1;
    }

    nextTodos.splice(insertIndex, 0, movedTodo);
    todos = nextTodos;
    await saveAndRender();
  }

  async function moveColumn(sourceColumn, targetColumn, dropSide) {
    if (sourceColumn === targetColumn) {
      return;
    }

    const nextColumns = boardColumns.filter((column) => column !== sourceColumn);
    let targetIndex = nextColumns.indexOf(targetColumn);

    if (targetIndex < 0) {
      return;
    }

    if (dropSide === "column-drop-after") {
      targetIndex += 1;
    }

    nextColumns.splice(targetIndex, 0, sourceColumn);
    boardColumns = nextColumns;
    await storage.setColumns(boardColumns);
    render();
  }

  clearDone.addEventListener("click", async () => {
    todos = todos.filter((todo) => !todo.completed);
    editingId = null;
    await saveAndRender();
  });

  async function init() {
    setTodayText();
    const data = await storage.get();
    todos = data.todos;
    boardColumns = data.columns;
    render();
    input.focus();
  }

  init();
})();
