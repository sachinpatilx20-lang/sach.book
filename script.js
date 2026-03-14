/**
 * Sach.in – Advanced URL Manager
 * Mobile-first PWA Architecture
 */

// --- AppState ---
const AppState = {
    links: [],
    filteredLinks: [],
    currentView: 'home', // home, favorites, readlater, collections
    activeFilter: 'all',
    searchQuery: '',
    currentTheme: localStorage.getItem('sachin-theme') || 'indigo',
    collections: [],

    setLinks(links) {
        this.links = links;
        this.filterAndRender();
    },

    setTheme(theme) {
        this.currentTheme = theme;
        document.body.className = `theme-${theme}`;
        localStorage.setItem('sachin-theme', theme);
    },

    filterAndRender() {
        let filtered = [...this.links];

        // 1. Filter by View
        if (this.currentView === 'favorites') {
            filtered = filtered.filter(l => l.favorite);
        } else if (this.currentView === 'readlater') {
            filtered = filtered.filter(l => l.unread);
        }

        // 2. Filter by Search
        if (this.searchQuery) {
            const q = this.searchQuery.toLowerCase();
            filtered = filtered.filter(l => 
                l.title.toLowerCase().includes(q) || 
                l.url.toLowerCase().includes(q) ||
                l.tags.some(t => t.toLowerCase().includes(q)) ||
                (l.notes && l.notes.toLowerCase().includes(q))
            );
        }

        this.filteredLinks = filtered;
        UIRendering.renderLinkFeed(this.filteredLinks);
    }
};

// --- Data Storage (IndexedDB) ---
const DataStorage = {
    db: null,
    dbName: 'SachinDB',
    version: 1,

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onerror = () => reject('Database error');
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('links')) {
                    db.createObjectStore('links', { keyPath: 'id' });
                }
            };
        });
    },

    async saveLink(link) {
        const tx = this.db.transaction('links', 'readwrite');
        tx.objectStore('links').put(link);
        return tx.complete;
    },

    async getAllLinks() {
        return new Promise((resolve) => {
            const tx = this.db.transaction('links', 'readonly');
            const store = tx.objectStore('links');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
        });
    },

    async deleteLink(id) {
        const tx = this.db.transaction('links', 'readwrite');
        tx.objectStore('links').delete(id);
        return tx.complete;
    }
};

// --- UI Rendering ---
const UIRendering = {
    renderLinkFeed(links) {
        const feed = document.getElementById('link-feed');
        if (links.length === 0) {
            feed.innerHTML = `<div class="empty-state">No links found. Tap + to add one!</div>`;
            return;
        }

        feed.innerHTML = links.map(link => this.createCardHTML(link)).join('');
        this.attachCardEvents();
    },

    createCardHTML(link) {
        const domain = new URL(link.url).hostname;
        return `
            <div class="link-card" data-id="${link.id}">
                <div class="card-header">
                    <img src="${link.image || `https://www.google.com/s2/favicons?sz=64&domain=${domain}`}" class="favicon" alt="">
                    <h3 class="card-title">${link.title}</h3>
                </div>
                <div class="card-domain">${domain}</div>
                <p class="card-desc">${link.notes || link.description || 'No description available.'}</p>
                <div class="card-tags">
                    ${link.tags.map(tag => `<span class="tag">#${tag}</span>`).join('')}
                </div>
                <div class="card-actions">
                    <button class="action-btn toggle-fav ${link.favorite ? 'active' : ''}" title="Favorite">⭐</button>
                    <button class="action-btn toggle-unread ${link.unread ? 'active' : ''}" title="Read Later">📖</button>
                    <button class="action-btn copy-link" title="Copy Link">🔗</button>
                    <button class="action-btn delete-link" title="Delete">🗑️</button>
                    <button class="action-btn qr-link" title="QR Code">📱</button>
                </div>
            </div>
        `;
    },

    attachCardEvents() {
        document.querySelectorAll('.link-card').forEach(card => {
            const id = card.dataset.id;
            
            card.querySelector('.copy-link').onclick = () => {
                const link = AppState.links.find(l => l.id === id);
                navigator.clipboard.writeText(link.url);
                alert('Copied to clipboard!');
            };

            card.querySelector('.delete-link').onclick = async () => {
                if (confirm('Delete this link?')) {
                    await DataStorage.deleteLink(id);
                    AppState.setLinks(AppState.links.filter(l => l.id !== id));
                }
            };

            card.querySelector('.toggle-fav').onclick = async (e) => {
                const link = AppState.links.find(l => l.id === id);
                link.favorite = !link.favorite;
                await DataStorage.saveLink(link);
                e.target.classList.toggle('active');
            };

            card.querySelector('.toggle-unread').onclick = async (e) => {
                const link = AppState.links.find(l => l.id === id);
                link.unread = !link.unread;
                await DataStorage.saveLink(link);
                e.target.classList.toggle('active');
            };
            
            card.querySelector('.qr-link').onclick = () => {
                const link = AppState.links.find(l => l.id === id);
                window.open(`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(link.url)}`, '_blank');
            };

            // Gesture basic - Double tap to favorite
            let lastTap = 0;
            card.addEventListener('touchend', (e) => {
                const currentTime = new Date().getTime();
                const tapLength = currentTime - lastTap;
                if (tapLength < 500 && tapLength > 0) {
                    card.querySelector('.toggle-fav').click();
                    e.preventDefault();
                }
                lastTap = currentTime;
            });
        });
    }
};

// --- Utility Functions ---
const Utils = {
    async fetchMetadata(url) {
        // In a real app, this would be a backend call. For vanilla JS demo, 
        // we'll simulate it with a generic preview or a mock.
        try {
            const domain = new URL(url).hostname;
            return {
                title: domain.split('.')[0].toUpperCase() + ' - New Link',
                description: `A saved link from ${domain}. Auto-fetched metadata demo.`,
                image: `https://www.google.com/s2/favicons?sz=128&domain=${domain}`
            };
        } catch (e) {
            return null;
        }
    },

    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
};

// --- Event Handling ---
const EventHandlers = {
    init() {
        // FAB Open Bottom Sheet
        document.getElementById('fab-add').onclick = () => {
            document.getElementById('add-sheet').hidden = false;
            document.getElementById('url-input').focus();
        };

        // Cancel Add
        document.getElementById('cancel-add').onclick = () => {
            document.getElementById('add-sheet').hidden = true;
            this.resetAddForm();
        };

        // URL Input Logic
        let fetchTimeout;
        document.getElementById('url-input').oninput = (e) => {
            clearTimeout(fetchTimeout);
            const url = e.target.value;
            if (url.startsWith('http')) {
                document.getElementById('preview-skeleton').hidden = false;
                fetchTimeout = setTimeout(async () => {
                    const meta = await Utils.fetchMetadata(url);
                    this.showPreview(meta);
                }, 1000);
            }
        };

        // Confirm Save
        document.getElementById('confirm-save').onclick = async () => {
            const url = document.getElementById('url-input').value;
            const title = document.getElementById('preview-title').innerText;
            const desc = document.getElementById('preview-desc').innerText;
            const img = document.getElementById('preview-img').src;

            const newLink = {
                id: Utils.generateId(),
                url,
                title,
                description: desc,
                image: img,
                tags: ['general'],
                favorite: false,
                unread: true,
                created_at: new Date().toISOString()
            };

            await DataStorage.saveLink(newLink);
            AppState.links.push(newLink);
            AppState.filterAndRender();
            
            document.getElementById('add-sheet').hidden = true;
            this.resetAddForm();
        };

        // Search
        document.getElementById('search-input').oninput = (e) => {
            AppState.searchQuery = e.target.value;
            AppState.filterAndRender();
            document.getElementById('clear-search').hidden = !e.target.value;
        };

        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.onclick = () => {
                document.querySelector('.nav-item.active').classList.remove('active');
                item.classList.add('active');
                AppState.currentView = item.dataset.view;
                AppState.filterAndRender();
            };
        });

        // Theme Switcher (Mock in Menu)
        document.getElementById('settings-btn').onclick = () => {
            const themes = ['indigo', 'emerald', 'rose'];
            const currentIndex = themes.indexOf(AppState.currentTheme);
            const nextTheme = themes[(currentIndex + 1) % themes.length];
            AppState.setTheme(nextTheme);
        };
    },

    showPreview(meta) {
        document.getElementById('preview-skeleton').hidden = true;
        if (meta) {
            document.getElementById('url-preview').hidden = false;
            document.getElementById('preview-img').src = meta.image;
            document.getElementById('preview-title').innerText = meta.title;
            document.getElementById('preview-desc').innerText = meta.description;
            document.getElementById('confirm-save').disabled = false;
        }
    },

    resetAddForm() {
        document.getElementById('url-input').value = '';
        document.getElementById('url-preview').hidden = true;
        document.getElementById('preview-skeleton').hidden = true;
        document.getElementById('confirm-save').disabled = true;
    }
};

// --- App Initialization ---
window.onload = async () => {
    AppState.setTheme(AppState.currentTheme);
    await DataStorage.init();
    const links = await DataStorage.getAllLinks();
    AppState.setLinks(links);
    EventHandlers.init();
};
