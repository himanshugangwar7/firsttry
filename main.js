// State Management
let todos = [];
let token = localStorage.getItem('token');
let currentUser = localStorage.getItem('username');

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// DOM Elements - Auth
const authOverlay = document.getElementById('auth-overlay');
const authForm = document.getElementById('auth-form');
const authTitle = document.getElementById('auth-title');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const toggleAuthBtn = document.getElementById('toggle-auth-btn');
const toggleText = document.getElementById('toggle-text');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');

// DOM Elements - App
const appContainer = document.getElementById('app-container');
const todoInput = document.getElementById('todo-input');
const addBtn = document.getElementById('add-btn');
const todoList = document.getElementById('todo-list');
const taskCount = document.getElementById('task-count');
const clearCompletedBtn = document.getElementById('clear-completed');
const dateDisplay = document.getElementById('date-display');
const logoutBtn = document.getElementById('logout-btn');

let isLoginMode = true;

// Initialize
function init() {
    updateDate();
    checkAuth();
    setupEventListeners();
}

function updateDate() {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    dateDisplay.textContent = new Date().toLocaleDateString('en-US', options);
}

function checkAuth() {
    if (token) {
        authOverlay.style.display = 'none';
        appContainer.style.display = 'block';
        fetchTodos();
    } else {
        authOverlay.style.display = 'flex';
        appContainer.style.display = 'none';
        todos = [];
        renderTodos();
    }
}

function setupEventListeners() {
    // Auth Listeners
    toggleAuthBtn.addEventListener('click', () => {
        isLoginMode = !isLoginMode;
        authTitle.textContent = isLoginMode ? 'Welcome Back' : 'Create Account';
        authSubmitBtn.textContent = isLoginMode ? 'Login' : 'Sign Up';
        toggleText.textContent = isLoginMode ? "Don't have an account?" : "Already have an account?";
        toggleAuthBtn.textContent = isLoginMode ? 'Sign Up' : 'Login';
    });

    authForm.addEventListener('submit', handleAuth);
    logoutBtn.addEventListener('click', logout);

    // App Listeners
    addBtn.addEventListener('click', addTodo);
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTodo();
    });
    clearCompletedBtn.addEventListener('click', clearCompleted);
}

// Authentication Logic
async function handleAuth(e) {
    e.preventDefault();
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    
    const endpoint = isLoginMode ? '/login' : '/signup';
    
    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            if (isLoginMode) {
                token = data.token;
                currentUser = data.username;
                localStorage.setItem('token', token);
                localStorage.setItem('username', currentUser);
                checkAuth();
            } else {
                alert('Signup successful! Please login.');
                isLoginMode = true;
                toggleAuthBtn.click();
            }
            authForm.reset();
        } else {
            alert(data.message || 'Authentication failed');
        }
    } catch (error) {
        console.error('Auth error:', error);
        alert('Server connection error. Is the backend running?');
    }
}

function logout() {
    token = null;
    currentUser = null;
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    checkAuth();
}

// Todo API Logic
async function fetchTodos() {
    try {
        const response = await fetch(`${API_BASE_URL}/todos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            todos = await response.json();
            renderTodos();
        } else if (response.status === 403 || response.status === 401) {
            logout();
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

async function addTodo() {
    const text = todoInput.value.trim();
    if (!text) return;

    try {
        const response = await fetch(`${API_BASE_URL}/todos`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ text })
        });

        if (response.ok) {
            const newTodo = await response.json();
            todos.unshift(newTodo);
            renderTodos();
            todoInput.value = '';
            todoInput.focus();
        }
    } catch (error) {
        console.error('Add todo error:', error);
    }
}

async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    try {
        const response = await fetch(`${API_BASE_URL}/todos/${id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ completed: !todo.completed })
        });

        if (response.ok) {
            const updatedTodo = await response.json();
            todos = todos.map(t => t.id === id ? updatedTodo : t);
            renderTodos();
        }
    } catch (error) {
        console.error('Toggle todo error:', error);
    }
}

async function deleteTodo(id) {
    try {
        const response = await fetch(`${API_BASE_URL}/todos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            todos = todos.filter(t => t.id !== id);
            renderTodos();
        }
    } catch (error) {
        console.error('Delete todo error:', error);
    }
}

async function clearCompleted() {
    const completedTodos = todos.filter(t => t.completed);
    for (const todo of completedTodos) {
        await deleteTodo(todo.id);
    }
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

// Global scope access for onclick handlers (compatibility with onclick in template strings)
window.toggleTodo = toggleTodo;
window.deleteTodo = deleteTodo;

init();
