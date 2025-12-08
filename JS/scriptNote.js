

class NotesApp {
    notes = [];
    currentFilter = "active";
    editingId = null;

    modalEl = document.getElementById("noteModal");
    formEl = document.getElementById("noteForm");
    gridEl = document.getElementById("notesGrid");
    emptyEl = document.getElementById("emptyState");
    searchInputEl = document.getElementById("searchInput");
    toastEl = document.getElementById("toast");
    toastMsgEl = document.getElementById("toastMessage");

    constructor() {
        this.init();
    }

    init = () => {
        this.loadFromStorage();
        this.bindEvents();
        this.render();
    };

    loadFromStorage = () => {
        try {
            const stored = JSON.parse(localStorage.getItem("notes"));
            this.notes = Array.isArray(stored) ? stored : [];
        } catch {
            this.notes = [];
        }
    };

    saveToStorage = () => {
        try {
            localStorage.setItem("notes", JSON.stringify(this.notes));
        } catch {
            this.showToast("Storage write failed", "error");
        }
    };

    bindEvents = () => {
        document.getElementById("addNoteBtn")?.addEventListener("click", () => this.openModal());
        document.getElementById("closeModal")?.addEventListener("click", this.closeModal);
        document.getElementById("cancelBtn")?.addEventListener("click", this.closeModal);

        this.formEl?.addEventListener("submit", this.handleSubmit);

        this.modalEl?.addEventListener("click", e => e.target === this.modalEl && this.closeModal());

        document.addEventListener("keydown", e => e.key === "Escape" && this.closeModal());

        document.querySelectorAll(".filter-btn").forEach(btn =>
            btn.addEventListener("click", e => {
                document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
                e.currentTarget.classList.add("active");
                this.currentFilter = e.currentTarget.dataset.filter ?? "active";
                this.render();
            })
        );

        this.searchInputEl?.addEventListener("input", this.debounce(e => {
            this.render(e.target.value.toLowerCase().trim());
        }, 250));
    };

    debounce = (fn, delay) => {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    };

    openModal = (id = null) => {
        this.editingId = id;

        const titleEl = document.getElementById("noteTitle");
        const contentEl = document.getElementById("noteContent");
        const modalTitle = document.getElementById("modalTitle");

        if (id) {
            const note = this.notes.find(n => n.id === id);
            modalTitle.textContent = "Edit Note";
            titleEl.value = note?.title || "";
            contentEl.value = note?.content || "";
        } else {
            modalTitle.textContent = "Create Note";
            this.formEl?.reset();
        }

        this.modalEl?.classList.remove("hidden");
        titleEl.focus();
    };

    closeModal = () => {
        this.modalEl?.classList.add("hidden");
        this.formEl?.reset();
        this.editingId = null;
    };

    handleSubmit = e => {
        e.preventDefault();
        const title = document.getElementById("noteTitle")?.value.trim();
        const content = document.getElementById("noteContent")?.value.trim();

        if (!title || !content) return this.showToast("Title and content required", "error");

        this.editingId ? this.updateNote(this.editingId, title, content) : this.addNote(title, content);
        this.closeModal();
    };

    addNote = (title, content) => {
        const note = {
            id: Date.now().toString(),
            title,
            content,
            createdAt: new Date().toISOString(),
            status: "active"
        };

        this.notes.unshift(note);
        this.saveToStorage();
        this.render();
        this.showToast("Note added");
    };

    updateNote = (id, title, content) => {
        const index = this.notes.findIndex(n => n.id === id);
        if (index === -1) return;

        this.notes[index] = { ...this.notes[index], title, content };
        this.saveToStorage();
        this.render();
        this.showToast("Updated");
    };

    deleteNote = id => {
        const note = this.notes.find(n => n.id === id);
        if (!note || note.status === "deleted") return;

        note.status = "deleted";
        this.saveToStorage();
        this.render();
        this.showToast("Moved to trash");
    };

    archiveNote = id => {
        const note = this.notes.find(n => n.id === id);
        if (!note || note.status === "deleted") return;

        note.status = note.status === "archived" ? "active" : "archived";
        this.saveToStorage();
        this.render();
        this.showToast(note.status === "archived" ? "Archived" : "Unarchived");
    };

    restoreNote = id => {
        const note = this.notes.find(n => n.id === id);
        if (!note || note.status !== "deleted") return;

        note.status = "active";
        this.saveToStorage();
        this.render();
        this.showToast("Restored");
    };

    getFilteredNotes = (term = "") =>
        this.notes.filter(({ title, content, status }) =>
            (this.currentFilter === "all" || status === this.currentFilter) &&
            (title.toLowerCase().includes(term) || content.toLowerCase().includes(term))
        );

    render = searchTerm => {
        if (!this.gridEl || !this.emptyEl) return;

        const list = this.getFilteredNotes(searchTerm);
        this.gridEl.innerHTML = "";

        if (!list.length) {
            this.gridEl.classList.add("hidden");
            this.emptyEl.classList.remove("hidden");
            this.updateEmptyStateContent();
            return;
        }

        this.emptyEl.classList.add("hidden");
        this.gridEl.classList.remove("hidden");

        list.forEach(note => this.gridEl.appendChild(this.createCard(note)));
    };

    createCard = note => {
        const { id, title, content, status, createdAt } = note;
        const card = document.createElement("div");
        card.className = `note-card ${status}`;

        card.innerHTML = `
        <div class="note-header">
            <h3>${this.escapeHtml(title)}</h3>
            <span>${this.formatDate(createdAt)}</span>
        </div>
        <p>${this.escapeHtml(content)}</p>
        <div class="note-actions">
            ${this.getActionsMarkup(note)}
        </div>`;

        return card;
    };

     getActionsMarkup = ({ id, status }) => {
        if (status === "deleted")
            return `<button onclick="notesApp.restoreNote('${id}')">Restore</button>`;

        const isArchived = status === "archived";
        return `
            <button onclick="notesApp.openModal('${id}')">Edit</button>
            <button onclick="notesApp.archiveNote('${id}')">${isArchived ? "Unarchive" : "Archive"}</button>
            <button onclick="notesApp.deleteNote('${id}')">Delete</button>`;
    };

    getEmptyStateConfig = () => ({
        active: ["No notes yet", "Create one to get started"],
        archived: ["Nothing archived", "Archive notes to store them"],
        deleted: ["Trash is empty", "Deleted notes go here"],
        all: ["No notes", "Try adding or changing filter"]
    })[this.currentFilter];

    updateEmptyStateContent = () => {
        const [title, text] = this.getEmptyStateConfig();
        document.getElementById("emptyStateTitle").textContent = title;
        document.getElementById("emptyStateText").textContent = text;
    };

    formatDate = iso =>
        new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });

    escapeHtml = str => new Option(str).innerHTML;

    showToast = (msg, type = "success") => {
        this.toastMsgEl.textContent = msg;
        this.toastEl.className = `toast ${type}`;
        this.toastEl.classList.remove("hidden");
        setTimeout(() => this.toastEl.classList.add("hidden"), 2500);
    };
}

window.notesApp = new NotesApp();

document.getElementById("themeToggle")?.addEventListener("click", e => {
    document.body.classList.toggle("dark-mode");
    e.currentTarget.classList.toggle("active");
});
