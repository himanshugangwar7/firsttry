// State Management
let todos = JSON.parse(localStorage.getItem('todos')) || [];

// DOM Elements
const todoInput = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');
const taskCount = document.getElementById('task-count');
const clearCompletedBtn = document.getElementById('clear-completed');
const dateDisplay = document.getElementById('date-display');

// Initialize
function init() {
    updateDate();
    renderTodos();
    setupEventListeners();
}

function updateDate() {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    dateDisplay.textContent = new Date().toLocaleDateString('en-US', options);
}

function setupEventListeners() {
    addBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });
    clearCompletedBtn.addEventListener('click', clearCompleted);
}

function addTodo() {
    const text = todoInput.value.trim();
    if (!text) return;

    const newTodo = {
        id: Date.now(),
        text: text,
        completed: false
    };

    todos.unshift(newTodo);
    saveAndRender();
    todoInput.value = '';
    todoInput.focus();
}

function toggleTodo(id) {
    todos = todos.map(todo => 
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    saveAndRender();
}

function deleteTodo(id) {
    todos = todos.filter(todo => todo.id !== id);
    saveAndRender();
}

function clearCompleted() {
    todos = todos.filter(todo => !todo.completed);
    saveAndRender();
}

function saveAndRender() {
    localStorage.setItem('todos', JSON.stringify(todos));
    renderTodos();
}

function renderTodos() {
    todoList.innerHTML = '';
    
    todos.forEach(todo => {
        const li = document.createElement('li');
        li.className = `todo-item ${todo.completed ? 'completed' : ''}`;
        li.innerHTML = `
            <div class="checkbox" onclick="event.stopPropagation(); toggleTodo(${todo.id})">
                ${todo.completed ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
            </div>
            <span class="todo-text">${todo.text}</span>
            <button class="delete-btn" onclick="event.stopPropagation(); deleteTodo(${todo.id})">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
        `;
        
        li.addEventListener('click', () => toggleTodo(todo.id));
        todoList.appendChild(li);
    });

    const activeCount = todos.filter(t => !t.completed).length;
    taskCount.textContent = `${activeCount} task${activeCount !== 1 ? 's' : ''} remaining`;
}

// Global scope access for onclick handlers
window.toggleTodo = toggleTodo;
window.deleteTodo = deleteTodo;

init();
