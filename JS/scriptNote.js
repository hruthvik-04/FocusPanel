class NotesApp {
    constructor() {
        // Basic app state
        this.notes = [];
        this.currentFilter = 'active';
        this.editingNoteId = null;

        this.modal = null;
        this.form = null;

        this.init();
    }

    init() {
        this.loadNotes();
        this.setupModal();
        this.bindEvents();
        this.renderNotes();
    }

    loadNotes() {
        try {
            const stored = localStorage.getItem('notes');
            this.notes = stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading notes:', error);
            this.notes = [];
        }
    }

    saveNotes() {
        try {
            localStorage.setItem('notes', JSON.stringify(this.notes));
        } catch (error) {
            console.error('Error saving notes:', error);
            this.showToast('Error saving notes', 'error');
        }
    }

    setupModal() {
        this.modal = document.getElementById('noteModal');
        this.form = document.getElementById('noteForm');
    }

    bindEvents() {
        document.getElementById('addNoteBtn')
            .addEventListener('click', () => this.openModal());

        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilter(e));
        });

        document.getElementById('searchInput')
            .addEventListener('input', (e) => this.handleSearch(e));

        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        document.getElementById('closeModal')
            .addEventListener('click', () => this.closeModal());
        document.getElementById('cancelBtn')
            .addEventListener('click', () => this.closeModal());

        this.modal.addEventListener('click', (e) => {
            if (e.target.id === 'noteModal') {
                this.closeModal();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    handleFilter(e) {
        document.querySelectorAll('.filter-btn')
            .forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');

        this.currentFilter = e.target.dataset.filter;
        this.renderNotes();
    }

    handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase().trim();
        this.renderNotes(searchTerm);
    }

    openModal(noteId = null) {
        this.editingNoteId = noteId;

        if (noteId) {
            const note = this.notes.find(n => n.id === noteId);
            if (note) {
                document.getElementById('modalTitle').textContent = 'Edit Note';
                document.getElementById('noteTitle').value = note.title;
                document.getElementById('noteContent').value = note.content;
            }
        } else {
            document.getElementById('modalTitle').textContent = 'Create Note';
            this.form.reset();
        }

        this.modal.classList.remove('hidden');
        document.getElementById('noteTitle').focus();
    }

    closeModal() {
        this.modal.classList.add('hidden');
        this.form.reset();
        this.editingNoteId = null;
    }

    handleSubmit(e) {
        e.preventDefault();

        const title = document.getElementById('noteTitle').value.trim();
        const content = document.getElementById('noteContent').value.trim();

        if (!title || !content) {
            this.showToast('Please fill in all fields', 'error');
            return;
        }

        if (this.editingNoteId) {
            this.updateNote(this.editingNoteId, title, content);
        } else {
            this.createNote(title, content);
        }

        this.closeModal();
    }

    // Core CRUD logic for notes
    createNote(title, content) {
        const newNote = {
            id: Date.now().toString(),
            title,
            content,
            createdAt: new Date().toISOString(),
            status: 'active'
        };

        this.notes.unshift(newNote);
        this.saveNotes();
        this.renderNotes();
        this.showToast('Note created successfully!');
    }

    updateNote(id, title, content) {
        const noteIndex = this.notes.findIndex(n => n.id === id);
        if (noteIndex !== -1) {
            this.notes[noteIndex] = {
                ...this.notes[noteIndex],
                title,
                content
            };
            this.saveNotes();
            this.renderNotes();
            this.showToast('Note updated successfully!');
        }
    }

    deleteNote(id) {
        const note = this.notes.find(n => n.id === id);
        if (note && note.status !== 'deleted') {
            note.status = 'deleted';
            this.saveNotes();
            this.renderNotes();
            this.showToast('Note moved to trash');
        }
    }

    archiveNote(id) {
        const note = this.notes.find(n => n.id === id);
        if (note && note.status !== 'deleted') {
            note.status = note.status === 'archived' ? 'active' : 'archived';
            this.saveNotes();
            this.renderNotes();
            const message = note.status === 'archived'
                ? 'Note archived'
                : 'Note unarchived';
            this.showToast(message);
        }
    }

    restoreNote(id) {
        const note = this.notes.find(n => n.id === id);
        if (note && note.status === 'deleted') {
            note.status = 'active';
            this.saveNotes();
            this.renderNotes();
            this.showToast('Note restored successfully!');
        }
    }

    renderNotes(searchTerm = '') {
        const grid = document.getElementById('notesGrid');
        const emptyState = document.getElementById('emptyState');

        const filteredNotes = this.notes.filter(note => {
            const matchesFilter =
                this.currentFilter === 'all' || note.status === this.currentFilter;

            const matchesSearch =
                searchTerm === '' ||
                note.title.toLowerCase().includes(searchTerm) ||
                note.content.toLowerCase().includes(searchTerm);

            return matchesFilter && matchesSearch;
        });

        grid.innerHTML = '';

        if (filteredNotes.length === 0) {
            grid.classList.add('hidden');
            emptyState.classList.remove('hidden');
            emptyState.innerHTML = this.getEmptyStateContent();
        } else {
            grid.classList.remove('hidden');
            emptyState.classList.add('hidden');

            filteredNotes.forEach(note => {
                const card = this.createNoteCard(note);
                grid.appendChild(card);
            });
        }
    }

    createNoteCard(note) {
        const card = document.createElement('div');
        card.className = `note-card ${note.status}`;

        card.innerHTML = `
            <div class="note-header">
                <h3 class="note-title">${this.escapeHtml(note.title)}</h3>
                <div class="note-date">
                    <i class="fas fa-calendar"></i>
                    ${this.formatDate(note.createdAt)}
                </div>
            </div>
            <div class="note-content">
                ${this.escapeHtml(note.content)}
            </div>
            <div class="note-actions">
                ${this.getActionButtons(note)}
            </div>
        `;

        return card;
    }

    getActionButtons(note) {
        if (note.status === 'deleted') {
            return `
                <button class="action-btn restore-btn" onclick="app.restoreNote('${note.id}')">
                    <i class="fas fa-undo"></i>
                    Restore
                </button>
            `;
        }

        const archiveIcon = note.status === 'archived'
            ? 'fa-solid fa-box-open'
            : 'fa-solid fa-archive';
        const archiveText = note.status === 'archived'
            ? 'Unarchive'
            : 'Archive';

        return `
            <button class="action-btn edit-btn" onclick="app.openModal('${note.id}')">
                <i class="fas fa-pen"></i>
                Edit
            </button>
            <button class="action-btn archive-btn" onclick="app.archiveNote('${note.id}')">
                <i class="${archiveIcon}"></i>
                ${archiveText}
            </button>
            <button class="action-btn delete-btn" onclick="app.deleteNote('${note.id}')">
                <i class="fas fa-trash"></i>
                Delete
            </button>
        `;
    }

    getEmptyStateContent() {
        const messages = {
            active: {
                icon: 'fa-sticky-note',
                title: 'No active notes',
                desc: 'Create your first note to get started'
            },
            archived: {
                icon: 'fa-archive',
                title: 'No archived notes',
                desc: 'Archive some notes to see them here'
            },
            deleted: {
                icon: 'fa-trash',
                title: 'No deleted notes',
                desc: 'Deleted notes will appear here'
            },
            all: {
                icon: 'fa-sticky-note',
                title: 'No notes found',
                desc: 'Create your first note to get started'
            }
        };

        const message = messages[this.currentFilter] || messages.all;

        return `
            <i class="fas ${message.icon} empty-icon"></i>
            <h3>${message.title}</h3>
            <p>${message.desc}</p>
        `;
    }

    // Small helper utilities
    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            const hours = Math.floor(diffTime / (1000 * 60 * 60));
            if (hours === 0) {
                const minutes = Math.floor(diffTime / (1000 * 60));
                if (minutes <= 1) return 'Just now';
                return `${minutes} minutes ago`;
            }
            return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');

        toastMessage.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.remove('hidden');

        setTimeout(() => {
            toast.classList.add('hidden');
        }, 3000);
    }
}

// Boot up the app and theme toggle
const app = new NotesApp();

const themeToggle = document.getElementById('themeToggle');
const body = document.body;

body.classList.add('light-mode');

themeToggle.addEventListener('click', () => {
    body.classList.toggle('dark-mode');
    body.classList.toggle('light-mode');
    themeToggle.classList.toggle('active');
});
