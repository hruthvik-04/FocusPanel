class NotesApp {
    constructor() {
        this.notes = [];
        this.currentFilter = "active"; // active | archived | deleted | all
        this.editingId = null;

        // cache DOM references
        this.modalEl = document.getElementById("noteModal");
        this.formEl = document.getElementById("noteForm");
        this.gridEl = document.getElementById("notesGrid");
        this.emptyEl = document.getElementById("emptyState");
        this.searchInputEl = document.getElementById("searchInput");
        this.toastEl = document.getElementById("toast");
        this.toastMsgEl = document.getElementById("toastMessage");

        this.init();
    }

    init() {
        this.loadFromStorage();
        this.bindEvents();
        this.render(); // initial render
    }

    loadFromStorage() {
        let raw;
        try {
            raw = localStorage.getItem("notes");
            if (!raw) {
                this.notes = [];
                return;
            }
            const parsed = JSON.parse(raw);
            this.notes = Array.isArray(parsed) ? parsed : [];
        } catch (err) {
            console.error("Error reading notes from localStorage", err);
            this.notes = [];
        }
    }

    saveToStorage() {
        try {
            localStorage.setItem("notes", JSON.stringify(this.notes));
        } catch (err) {
            console.error("Error writing notes to localStorage", err);
            this.showToast("Could not save notes", "error");
        }
    }

    bindEvents() {
        const addBtn = document.getElementById("addNoteBtn");
        const closeModalBtn = document.getElementById("closeModal");
        const cancelBtn = document.getElementById("cancelBtn");

        if (addBtn) {
            addBtn.addEventListener("click", () => {
                this.openModal();
            });
        }

        if (this.formEl) {
            this.formEl.addEventListener("submit", (e) => this.handleSubmit(e));
        }

        if (closeModalBtn) {
            closeModalBtn.addEventListener("click", () => this.closeModal());
        }
        if (cancelBtn) {
            cancelBtn.addEventListener("click", () => this.closeModal());
        }

        if (this.modalEl) {
            this.modalEl.addEventListener("click", (e) => {
                // close if clicked outside content
                if (e.target === this.modalEl) {
                    this.closeModal();
                }
            });
        }

        // ESC key to close modal
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                this.closeModal();
            }
        });

        // filter buttons
        const filterButtons = document.querySelectorAll(".filter-btn");
        filterButtons.forEach((btn) => {
            btn.addEventListener("click", (e) => {
                filterButtons.forEach((b) => b.classList.remove("active"));
                e.currentTarget.classList.add("active");
                const filter = e.currentTarget.dataset.filter || "active";
                this.currentFilter = filter;
                this.render();
            });
        });

        // search
        if (this.searchInputEl) {
            this.searchInputEl.addEventListener("input", (e) => {
                const term = e.target.value.toLowerCase().trim();
                this.render(term);
            });
        }
    }

    openModal(id) {
        this.editingId = id || null;

        const titleInput = document.getElementById("noteTitle");
        const contentInput = document.getElementById("noteContent");
        const modalTitle = document.getElementById("modalTitle");

        if (!this.modalEl || !titleInput || !contentInput || !modalTitle) return;

        if (id) {
            // edit mode
            const note = this.notes.find((n) => n.id === id);
            if (note) {
                modalTitle.textContent = "Edit Note";
                titleInput.value = note.title;
                contentInput.value = note.content;
            }
        } else {
            // create mode
            modalTitle.textContent = "Create Note";
            this.formEl && this.formEl.reset();
        }

        this.modalEl.classList.remove("hidden");
        titleInput.focus();
    }

    closeModal() {
        if (!this.modalEl || !this.formEl) return;
        this.modalEl.classList.add("hidden");
        this.formEl.reset();
        this.editingId = null;
    }

    handleSubmit(e) {
        e.preventDefault();

        const titleInput = document.getElementById("noteTitle");
        const contentInput = document.getElementById("noteContent");

        if (!titleInput || !contentInput) return;

        const title = titleInput.value.trim();
        const content = contentInput.value.trim();

        if (!title || !content) {
            this.showToast("Please fill in both title and content", "error");
            return;
        }

        if (this.editingId) {
            this.updateNote(this.editingId, title, content);
        } else {
            this.addNote(title, content);
        }

        this.closeModal();
    }

    addNote(title, content) {
        const note = {
            id: Date.now().toString(),
            title: title,
            content: content,
            createdAt: new Date().toISOString(),
            status: "active" // active | archived | deleted
        };

        // add to the beginning
        this.notes.unshift(note);
        this.saveToStorage();
        this.render();
        this.showToast("Note created");
    }

    updateNote(id, title, content) {
        const idx = this.notes.findIndex((n) => n.id === id);
        if (idx === -1) return;

        this.notes[idx] = {
            ...this.notes[idx],
            title,
            content
        };

        this.saveToStorage();
        this.render();
        this.showToast("Note updated");
    }

    deleteNote(id) {
        const note = this.notes.find((n) => n.id === id);
        if (!note || note.status === "deleted") return;

        note.status = "deleted";
        this.saveToStorage();
        this.render();
        this.showToast("Note moved to trash");
    }

    archiveNote(id) {
        const note = this.notes.find((n) => n.id === id);
        if (!note || note.status === "deleted") return;

        if (note.status === "archived") {
            note.status = "active";
            this.showToast("Note unarchived");
        } else {
            note.status = "archived";
            this.showToast("Note archived");
        }

        this.saveToStorage();
        this.render();
    }

    restoreNote(id) {
        const note = this.notes.find((n) => n.id === id);
        if (!note || note.status !== "deleted") return;

        note.status = "active";
        this.saveToStorage();
        this.render();
        this.showToast("Note restored");
    }

    getFilteredNotes(searchTerm) {
        const term = (searchTerm || "").toLowerCase();

        return this.notes.filter((note) => {
            // filter by status
            let statusMatch = true;
            if (this.currentFilter !== "all") {
                statusMatch = note.status === this.currentFilter;
            }

            // filter by search
            let searchMatch = true;
            if (term) {
                const inTitle = note.title.toLowerCase().includes(term);
                const inContent = note.content.toLowerCase().includes(term);
                searchMatch = inTitle || inContent;
            }

            return statusMatch && searchMatch;
        });
    }

    // 🔹 UPDATED: keep Lottie, only update text/icon
    render(searchTerm) {
        if (!this.gridEl || !this.emptyEl) return;

        const list = this.getFilteredNotes(searchTerm);
        this.gridEl.innerHTML = "";

        if (!list.length) {
            this.gridEl.classList.add("hidden");
            this.emptyEl.classList.remove("hidden");

            // DO NOT touch emptyEl.innerHTML → preserves <dotlottie-player>
            this.updateEmptyStateContent();
            return;
        }

        this.gridEl.classList.remove("hidden");
        this.emptyEl.classList.add("hidden");

        list.forEach((note) => {
            const card = this.createCard(note);
            this.gridEl.appendChild(card);
        });
    }

    createCard(note) {
        const div = document.createElement("div");
        div.className = "note-card " + note.status;

        div.innerHTML = `
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
                ${this.getActionsMarkup(note)}
            </div>
        `;

        return div;
    }

    getActionsMarkup(note) {
        if (note.status === "deleted") {
            return `
                <button class="action-btn restore-btn" onclick="notesApp.restoreNote('${note.id}')">
                    <i class="fas fa-undo"></i>
                    Restore
                </button>
            `;
        }

        const isArchived = note.status === "archived";
        const archiveIcon = isArchived ? "fa-solid fa-box-open" : "fa-solid fa-archive";
        const archiveText = isArchived ? "Unarchive" : "Archive";

        return `
            <button class="action-btn edit-btn" onclick="notesApp.openModal('${note.id}')">
                <i class="fas fa-pen"></i>
                Edit
            </button>
            <button class="action-btn archive-btn" onclick="notesApp.archiveNote('${note.id}')">
                <i class="${archiveIcon}"></i>
                ${archiveText}
            </button>
            <button class="action-btn delete-btn" onclick="notesApp.deleteNote('${note.id}')">
                <i class="fas fa-trash"></i>
                Delete
            </button>
        `;
    }

 getEmptyStateConfig() {
    const config = {
        active: {
            title: "No active notes",
            text: "Create a new note to get started."
        },
        archived: {
            title: "No archived notes",
            text: "Archive a note to see it here."
        },
        deleted: {
            title: "No deleted notes",
            text: "Deleted notes will appear here."
        },
        all: {
            title: "No notes found",
            text: "Try changing filters or create a new note."
        }
    };

    return config[this.currentFilter] || config.all;
}


  updateEmptyStateContent() {
    const state = this.getEmptyStateConfig();

    const titleEl = document.getElementById("emptyStateTitle");
    const textEl = document.getElementById("emptyStateText");

    if (!titleEl || !textEl) return;

    titleEl.textContent = state.title;
    textEl.textContent = state.text;
}

    formatDate(isoString) {
        if (!isoString) return "";

        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now - date;

        if (isNaN(diffMs)) {
            return date.toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric"
            });
        }

        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            if (diffHours <= 0) {
                const diffMins = Math.floor(diffMs / (1000 * 60));
                if (diffMins <= 1) return "Just now";
                return diffMins + " minutes ago";
            }
            return diffHours === 1 ? "1 hour ago" : diffHours + "hours ago";
        }

        if (diffDays === 1) return "Yesterday";
        if (diffDays < 7) return diffDays + " days ago";

        return date.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
    }

    escapeHtml(str) {
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
    }

    showToast(message, type) {
        if (!this.toastEl || !this.toastMsgEl) return;

        this.toastMsgEl.textContent = message || "";
        // type can be "success" or "error" etc.
        this.toastEl.className = "toast " + (type || "success");
        this.toastEl.classList.remove("hidden");

        setTimeout(() => {
            this.toastEl.classList.add("hidden");
        }, 3000);
    }
}

// expose single instance globally so inline onclick works
window.notesApp = new NotesApp();

// theme toggle
const themeToggle = document.getElementById("themeToggle");
const bodyEl = document.body;

if (bodyEl && themeToggle) {
    bodyEl.classList.add("light-mode");

    themeToggle.addEventListener("click", () => {
        bodyEl.classList.toggle("dark-mode");
        bodyEl.classList.toggle("light-mode");
        themeToggle.classList.toggle("active");
    });
}
