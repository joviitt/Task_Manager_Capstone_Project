/* Task Manager — Local Storage based
- Features: add/edit/delete/toggle tasks, filter, progress tracker
*/


const taskInput = document.getElementById('taskInput');
const addBtn = document.getElementById('addBtn');
const tasksList = document.getElementById('tasksList');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const filters = document.querySelectorAll('.chip');
const clearCompletedBtn = document.getElementById('clearCompleted');
const themeToggle = document.getElementById('themeToggle');
const toastContainer = document.getElementById('toastContainer');
const authModal = document.getElementById('authModal');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const showSignup = document.getElementById('showSignup');
const showLogin = document.getElementById('showLogin');
const userInfo = document.getElementById('userInfo');
const usernameDisplay = document.getElementById('usernameDisplay');
const logoutBtn = document.getElementById('logoutBtn');
const confirmModal = document.getElementById('confirmModal');
const confirmTitle = document.getElementById('confirmTitle');
const confirmMessage = document.getElementById('confirmMessage');
const confirmCancel = document.getElementById('confirmCancel');
const confirmOk = document.getElementById('confirmOk');


let tasks = []; // {id, text, completed}
let currentFilter = 'all';
let draggedElement = null;
let currentUser = null;


// load tasks from localStorage
function loadTasks(){
if(!currentUser) {
tasks = [];
return;
}
try{
const raw = localStorage.getItem(`taskly.tasks.${currentUser}`);
tasks = raw ? JSON.parse(raw) : [];
}catch(e){
tasks = [];
}
}


function saveTasks(){
if(!currentUser) return;
localStorage.setItem(`taskly.tasks.${currentUser}`, JSON.stringify(tasks));
}


function uid(){return Date.now().toString(36) + Math.random().toString(36).slice(2,7)}

// Theme management
function initTheme(){
const saved = localStorage.getItem('taskly.theme') || 'dark';
setTheme(saved);
}

function setTheme(theme){
document.documentElement.setAttribute('data-theme', theme);
const icon = themeToggle.querySelector('.theme-icon');
icon.textContent = theme === 'dark' ? '🌙' : '☀️';
localStorage.setItem('taskly.theme', theme);
}

function toggleTheme(){
const current = document.documentElement.getAttribute('data-theme');
const newTheme = current === 'dark' ? 'light' : 'dark';
setTheme(newTheme);
showToast(`Switched to ${newTheme} theme`, 'info');
}

// Toast notifications
function showToast(message, type = 'info', duration = 3000){
const toast = document.createElement('div');
toast.className = `toast ${type}`;
toast.textContent = message;
toastContainer.appendChild(toast);

// Trigger animation
setTimeout(() => toast.classList.add('show'), 10);

// Auto remove
setTimeout(() => {
toast.classList.remove('show');
setTimeout(() => toast.remove(), 300);
}, duration);
}

// Custom confirmation modal
function showConfirm(title, message, onConfirm, onCancel = null){
confirmTitle.textContent = title;
confirmMessage.textContent = message;
confirmModal.classList.add('show');
document.body.style.overflow = 'hidden';

// Remove existing listeners
confirmOk.replaceWith(confirmOk.cloneNode(true));
confirmCancel.replaceWith(confirmCancel.cloneNode(true));

// Add new listeners
document.getElementById('confirmOk').addEventListener('click', () => {
hideConfirm();
onConfirm();
});

document.getElementById('confirmCancel').addEventListener('click', () => {
hideConfirm();
if(onCancel) onCancel();
});

// Close on backdrop click
confirmModal.addEventListener('click', (e) => {
if(e.target === confirmModal){
hideConfirm();
if(onCancel) onCancel();
}
});
}

function hideConfirm(){
confirmModal.classList.remove('show');
document.body.style.overflow = '';
}

// Authentication functions
function hashPassword(password){
// Simple hash function (not cryptographically secure, but good enough for demo)
let hash = 0;
for(let i = 0; i < password.length; i++){
const char = password.charCodeAt(i);
hash = ((hash << 5) - hash) + char;
hash = hash & hash; // Convert to 32-bit integer
}
return hash.toString();
}

function getUsers(){
try{
const users = localStorage.getItem('taskly.users');
return users ? JSON.parse(users) : {};
}catch(e){
return {};
}
}

function saveUsers(users){
localStorage.setItem('taskly.users', JSON.stringify(users));
}

function registerUser(username, password){
const users = getUsers();
if(users[username]){
return {success: false, message: 'Username already exists'};
}
if(username.length < 3){
return {success: false, message: 'Username must be at least 3 characters'};
}
if(password.length < 4){
return {success: false, message: 'Password must be at least 4 characters'};
}

users[username] = {
password: hashPassword(password),
createdAt: Date.now()
};
saveUsers(users);
return {success: true, message: 'Account created successfully'};
}

function loginUser(username, password){
const users = getUsers();
const user = users[username];
if(!user){
return {success: false, message: 'Invalid username or password'};
}
if(user.password !== hashPassword(password)){
return {success: false, message: 'Invalid username or password'};
}
return {success: true, message: 'Login successful'};
}

function showAuthModal(){
authModal.classList.add('show');
document.body.style.overflow = 'hidden';
}

function hideAuthModal(){
authModal.classList.remove('show');
document.body.style.overflow = '';
}

function showLoginForm(){
loginForm.style.display = 'block';
signupForm.style.display = 'none';
document.getElementById('authTitle').textContent = 'Welcome Back';
document.getElementById('authSubtitle').textContent = 'Sign in to your account';
}

function showSignupForm(){
loginForm.style.display = 'none';
signupForm.style.display = 'block';
document.getElementById('authTitle').textContent = 'Create Account';
document.getElementById('authSubtitle').textContent = 'Sign up to get started';
}

function setCurrentUser(username){
currentUser = username;
localStorage.setItem('taskly.currentUser', username);
usernameDisplay.textContent = username;
userInfo.style.display = 'flex';
document.querySelector('.app').style.display = 'block';
hideAuthModal();
loadTasks(); // Load user-specific tasks
showToast(`Welcome back, ${username}!`, 'success');
}

function logout(){
currentUser = null;
localStorage.removeItem('taskly.currentUser');
userInfo.style.display = 'none';
document.querySelector('.app').style.display = 'none';
tasks = [];
renderTasks();
showAuthModal();
showLoginForm();
showToast('Logged out successfully', 'info');
}


function addTask(text){
if(!currentUser) {
showToast('Please log in to add tasks', 'error');
return;
}
if(!text || !text.trim()) return;
tasks.unshift({id: uid(), text: text.trim(), completed: false});
saveTasks();
renderTasks();
showToast('Task added', 'success');
}


function editTask(id){
const task = tasks.find(t=>t.id===id);
if(!task) return;
const taskElement = document.querySelector(`[data-id="${id}"]`);
const textElement = taskElement.querySelector('.task__text');
const originalText = task.text;

// Create input for inline editing
const input = document.createElement('input');
input.type = 'text';
input.value = task.text;
input.className = 'task__input';
input.style.cssText = 'flex:1;background:transparent;border:1px solid var(--accent);border-radius:6px;padding:4px 8px;color:inherit;outline:none;';

// Replace text with input
textElement.style.display = 'none';
textElement.parentNode.insertBefore(input, textElement);
input.focus();
input.select();

function finishEdit(save = false){
const newText = input.value.trim();
if(save && newText && newText !== originalText){
task.text = newText;
saveTasks();
showToast('Task updated', 'success');
}
input.remove();
textElement.style.display = 'block';
renderTasks(); // Re-render to ensure consistency
}

input.addEventListener('blur', () => finishEdit(true));
input.addEventListener('keydown', (e) => {
if(e.key === 'Enter') finishEdit(true);
if(e.key === 'Escape') finishEdit(false);
});
}


function deleteTask(id){
tasks = tasks.filter(t=>t.id!==id);
saveTasks();
renderTasks();
showToast('Task deleted', 'info');
}


function toggleComplete(id){
const task = tasks.find(t=>t.id===id);
if(!task) return;
task.completed = !task.completed;
saveTasks();
renderTasks();
}


function clearCompleted(){
const completedCount = tasks.filter(t=>t.completed).length;
tasks = tasks.filter(t=>!t.completed);
saveTasks();
renderTasks();
showToast(`Cleared ${completedCount} completed tasks`, 'info');
}


function setFilter(filter){
currentFilter = filter;
filters.forEach(f=>f.classList.toggle('active', f.dataset.filter===filter));
renderTasks();
}

function reorderTasks(draggedId, targetId){
const draggedIndex = tasks.findIndex(t => t.id === draggedId);
const targetIndex = tasks.findIndex(t => t.id === targetId);
if(draggedIndex === -1 || targetIndex === -1) return;

const draggedTask = tasks.splice(draggedIndex, 1)[0];
tasks.splice(targetIndex, 0, draggedTask);
saveTasks();
renderTasks();
showToast('Tasks reordered', 'info');
}


function updateProgress(){
const total = tasks.length;
const done = tasks.filter(t=>t.completed).length;
const pct = total===0 ? 0 : Math.round((done/total)*100);
progressText.textContent = `${done} / ${total}`;
progressBar.style.width = pct + '%';
}


function createTaskNode(task){
const li = document.createElement('li');
li.className = 'task';
li.dataset.id = task.id;
li.draggable = true;

// Drag and drop
li.addEventListener('dragstart', (e) => {
draggedElement = li;
li.style.opacity = '0.5';
e.dataTransfer.effectAllowed = 'move';
});

li.addEventListener('dragend', () => {
li.style.opacity = '1';
draggedElement = null;
});

li.addEventListener('dragover', (e) => {
e.preventDefault();
e.dataTransfer.dropEffect = 'move';
});

li.addEventListener('drop', (e) => {
e.preventDefault();
if(draggedElement && draggedElement !== li){
const draggedId = draggedElement.dataset.id;
const targetId = li.dataset.id;
reorderTasks(draggedId, targetId);
}
});

const cb = document.createElement('button');
cb.className = 'task__checkbox';
cb.setAttribute('aria-label', task.completed ? 'Mark incomplete' : 'Mark complete');
cb.innerHTML = task.completed ? '✓' : '';
cb.addEventListener('click', ()=> toggleComplete(task.id));

const txt = document.createElement('div');
txt.className = 'task__text' + (task.completed ? ' completed' : '');
txt.textContent = task.text;
txt.addEventListener('dblclick', () => editTask(task.id));
txt.title = 'Double-click to edit';

const actions = document.createElement('div');
actions.style.display = 'flex';
actions.style.gap = '6px';

const editBtn = document.createElement('button');
editBtn.className = 'icon-btn';
editBtn.setAttribute('aria-label','Edit task');
editBtn.innerHTML = '✎';
editBtn.addEventListener('click', ()=> editTask(task.id));

const delBtn = document.createElement('button');
delBtn.className = 'icon-btn';
delBtn.setAttribute('aria-label','Delete task');
delBtn.innerHTML = '🗑';
delBtn.addEventListener('click', ()=>{
showConfirm('Delete Task', 'Are you sure you want to delete this task?', () => {
deleteTask(task.id);
});
});

actions.appendChild(editBtn);
actions.appendChild(delBtn);

li.appendChild(cb);
li.appendChild(txt);
li.appendChild(actions);
return li;
}


function renderTasks(){
// clear
tasksList.innerHTML = '';
// filter
let visible = tasks;
if(currentFilter==='active') visible = tasks.filter(t=>!t.completed);
if(currentFilter==='completed') visible = tasks.filter(t=>t.completed);
// render
visible.forEach(t=> tasksList.appendChild(createTaskNode(t)));
updateProgress();
}


// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
if(e.ctrlKey || e.metaKey) return; // Don't interfere with browser shortcuts

switch(e.key){
case 'Escape':
taskInput.value = '';
taskInput.blur();
break;
case '/':
e.preventDefault();
taskInput.focus();
break;
}
});

// init
addBtn.addEventListener('click', ()=>{
addTask(taskInput.value);
taskInput.value='';
taskInput.focus();
});

taskInput.addEventListener('keyup', (e)=>{
if(e.key === 'Enter') addBtn.click();
});

filters.forEach(f=> f.addEventListener('click', ()=> setFilter(f.dataset.filter)));
clearCompletedBtn.addEventListener('click', ()=>{
showConfirm('Clear Completed Tasks', 'Are you sure you want to remove all completed tasks?', () => {
clearCompleted();
});
});

themeToggle.addEventListener('click', toggleTheme);

// Authentication event listeners
showSignup.addEventListener('click', (e) => {
e.preventDefault();
showSignupForm();
});

showLogin.addEventListener('click', (e) => {
e.preventDefault();
showLoginForm();
});

loginForm.addEventListener('submit', (e) => {
e.preventDefault();
const username = document.getElementById('loginUsername').value.trim();
const password = document.getElementById('loginPassword').value;

const result = loginUser(username, password);
if(result.success){
setCurrentUser(username);
} else {
showToast(result.message, 'error');
}
});

signupForm.addEventListener('submit', (e) => {
e.preventDefault();
const username = document.getElementById('signupUsername').value.trim();
const password = document.getElementById('signupPassword').value;
const confirmPassword = document.getElementById('confirmPassword').value;

if(password !== confirmPassword){
showToast('Passwords do not match', 'error');
return;
}

const result = registerUser(username, password);
if(result.success){
setCurrentUser(username);
} else {
showToast(result.message, 'error');
}
});

logoutBtn.addEventListener('click', logout);

// Check if user is already logged in
function checkAuth(){
const savedUser = localStorage.getItem('taskly.currentUser');
if(savedUser){
currentUser = savedUser;
usernameDisplay.textContent = savedUser;
userInfo.style.display = 'flex';
document.querySelector('.app').style.display = 'block';
loadTasks();
renderTasks();
} else {
document.querySelector('.app').style.display = 'none';
showAuthModal();
showLoginForm();
}
}

// load + render
initTheme();
checkAuth();


// expose for debugging (optional)
window._taskly = {get: ()=>tasks, save: saveTasks};
