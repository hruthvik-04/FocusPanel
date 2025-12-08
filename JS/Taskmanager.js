
        let tasks = [];
        let currentFilter = 'in-progress';
        let editingTaskId = null;
        
     
        const isClaudeAI = !window.localStorage;

        const themeToggle = document.getElementById('themeToggle');
        const body = document.body;
        const taskTitle = document.getElementById('taskTitle');
        const taskDescription = document.getElementById('taskDescription');
        const addTaskBtn = document.getElementById('addTaskBtn');
        const cancelEditBtn = document.getElementById('cancelEditBtn');
        const tasksGrid = document.getElementById('tasksGrid');
        const emptyState = document.getElementById('emptyState');
        const filterBtns = document.querySelectorAll('.filter-btn');
        const editModal = document.getElementById('editModal');
        const closeModal = document.getElementById('closeModal');
        const cancelModal = document.getElementById('cancelModal');
        const saveEditBtn = document.getElementById('saveEditBtn');
        const editTaskTitle = document.getElementById('editTaskTitle');
        const editTaskDescription = document.getElementById('editTaskDescription');

        function loadTasks() {
            if (isClaudeAI) {
                console.log('Running in Claude.ai - using in-memory storage');
                return;
            }
            try {
                const savedTasks = localStorage.getItem('tasks');
                if (savedTasks) {
                    tasks = JSON.parse(savedTasks);
                    console.log('Tasks loaded from localStorage:', tasks.length);
                }
            } catch (error) {
                console.log('Error loading tasks:', error);
                tasks = [];
            }
            renderTasks();
        }

        function saveTasks() {
            if (isClaudeAI) {
                console.log('Tasks saved in memory:', tasks.length);
                return;
            }
            try {
                localStorage.setItem('tasks', JSON.stringify(tasks));
                console.log('Tasks saved to localStorage:', tasks.length);
            } catch (error) {
                console.error('Error saving tasks:', error);
            }
        }

        themeToggle.addEventListener('click', () => {
            themeToggle.classList.toggle('active');
            if (body.classList.contains('dark-mode')) {
                body.classList.remove('dark-mode');
                body.classList.add('light-mode');
            } else {
                body.classList.remove('light-mode');
                body.classList.add('dark-mode');
            }
        });

        addTaskBtn.addEventListener('click', () => {
            const title = taskTitle.value.trim();
            const description = taskDescription.value.trim();

            if (!title) {
                alert('Please enter a task title');
                return;
            }

            const newTask = {
                id: Date.now().toString(),
                title,
                description,
                status: 'in-progress',
                createdAt: new Date().toISOString()
            };

            tasks.unshift(newTask);
            saveTasks();
            renderTasks();
            taskTitle.value = '';
            taskDescription.value = '';
        });

        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentFilter = btn.dataset.filter;
                renderTasks();
            });
        });

        function renderTasks() {
            const filteredTasks = tasks.filter(task => {
                if (currentFilter === 'all') return true;
                return task.status === currentFilter;
            });

            if (filteredTasks.length === 0) {
                tasksGrid.style.display = 'none';
                emptyState.style.display = 'block';
                return;
            }

            tasksGrid.style.display = 'grid';
            emptyState.style.display = 'none';

            tasksGrid.innerHTML = filteredTasks.map(task => {
                const date = new Date(task.createdAt);
                const formattedDate = date.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                return `
                    <div class="task-card ${task.status}">
                        <div class="task-header">
                            <div>
                                <div class="task-title">${escapeHtml(task.title)}</div>
                                <span class="task-status status-${task.status}">${task.status.replace('-', ' ')}</span>
                            </div>
                        </div>
                        <div class="task-description">${escapeHtml(task.description || 'No description')}</div>
                        <div class="task-date">Created: ${formattedDate}</div>
                        <div class="task-actions">
                            ${task.status !== 'deleted' ? `
                                <button class="action-btn btn-edit" onclick="openEditModal('${task.id}')">Edit</button>
                            ` : ''}
                            ${task.status === 'in-progress' ? `
                                <button class="action-btn btn-complete" onclick="markComplete('${task.id}')">Complete</button>
                            ` : ''}
                            ${task.status !== 'deleted' ? `
                                <button class="action-btn btn-delete" onclick="deleteTask('${task.id}')">Delete</button>
                            ` : ''}
                            ${task.status === 'deleted' ? `
                                <button class="action-btn btn-restore" onclick="restoreTask('${task.id}')">Restore</button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('');
             



        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        window.openEditModal = function(taskId) {
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;

            editingTaskId = taskId;
            editTaskTitle.value = task.title;
            editTaskDescription.value = task.description || '';
            editModal.classList.add('active');
        };

        closeModal.addEventListener('click', () => {
            editModal.classList.remove('active');
            editingTaskId = null;
        });

        cancelModal.addEventListener('click', () => {
            editModal.classList.remove('active');
            editingTaskId = null;
        });

        saveEditBtn.addEventListener('click', () => {
            if (!editingTaskId) return;

            const title = editTaskTitle.value.trim();
            const description = editTaskDescription.value.trim();

            if (!title) {
                alert('Please enter a task title');
                return;
            }

            const taskIndex = tasks.findIndex(t => t.id === editingTaskId);
            if (taskIndex !== -1) {
                tasks[taskIndex].title = title;
                tasks[taskIndex].description = description;
                saveTasks();
                renderTasks();
            }

            editModal.classList.remove('active');
            editingTaskId = null;
        });

        window.markComplete = function(taskId) {
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                task.status = 'completed';
                saveTasks();
                renderTasks();
            }
        };

        window.deleteTask = function(taskId) {
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                task.status = 'deleted';
                saveTasks();
                renderTasks();
            }
        };

        window.restoreTask = function(taskId) {
            const task = tasks.find(t => t.id === taskId);
            if (task) {
                task.status = 'in-progress';
                saveTasks();
                renderTasks();
            }
        };

        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) {
                editModal.classList.remove('active');
                editingTaskId = null;
            }
        });


        

        loadTasks();
 



