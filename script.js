/**
 * Sach.in – Premium Pro Application Core
 * Advanced Management, Data AI, and Particle Engine
 */

// --- State Engine ---
let proLinks = JSON.parse(localStorage.getItem('sachin_pro_vault')) || [];
let currentFilter = 'all'; // 'all', 'fav', or tag name
let sortBy = 'newest';
let searchTerm = '';
let activeEditingId = null;

// --- DOM References ---
const linksGrid = document.getElementById('linksGrid');
const searchInput = document.getElementById('searchInput');
const fab = document.getElementById('fab');
const overlay = document.getElementById('overlay');
const proModal = document.getElementById('proModal');
const linkInput = document.getElementById('linkInput');
const saveBtn = document.getElementById('saveBtn');
const closeModalBtn = document.getElementById('closeModal');
const tagCloud = document.getElementById('tagCloud');
const sortSelect = document.getElementById('sortSelect');
const importBtn = document.getElementById('importBtn');
const exportBtn = document.getElementById('exportBtn');
const importInput = document.getElementById('importInput');

// Preview/Edit DOM
const proPreview = document.getElementById('proPreview');
const previewImg = document.getElementById('previewImg');
const editTitle = document.getElementById('editTitle');
const editDesc = document.getElementById('editDesc');
const editTags = document.getElementById('editTags');
const modalTitle = document.getElementById('modalTitle');

// --- Pro Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initProEngine();
    initParticles();
});

function initProEngine() {
    renderAll();
    setupProEvents();
}

function setupProEvents() {
    // Search & Filter
    searchInput.addEventListener('input', debounce(() => {
        searchTerm = searchInput.value.toLowerCase().trim();
        renderAll();
    }, 250));

    sortSelect.addEventListener('change', () => {
        sortBy = sortSelect.value;
        renderAll();
    });

    tagCloud.addEventListener('click', (e) => {
        if (e.target.classList.contains('tag-chip')) {
            document.querySelectorAll('.tag-chip').forEach(c => c.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.tag;
            renderAll();
        }
    });

    // Modal Lifecycle
    fab.addEventListener('click', () => openModal());
    overlay.addEventListener('click', closeModal);
    closeModalBtn.addEventListener('click', closeModal);

    // AI Preview Extraction
    linkInput.addEventListener('input', debounce(handleProPreview, 800));

    // Commit Action
    saveBtn.addEventListener('click', commitProLink);

    // Data Management
    exportBtn.addEventListener('click', exportProVault);
    importBtn.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', importProVault);
}

// --- High-Performance Thumbnail & Meta System ---

async function getProThumbnail(url) {
    const domain = extractDomain(url);
    const imgRegex = /\.(jpg|jpeg|png|webp|gif|svg|bmp|ico|avif)$/i;

    // Direct Image
    if (imgRegex.test(url)) {
        return {
            title: url.split('/').pop().substring(0, 40) || 'Premium Resource',
            description: 'Direct multimedia asset link.',
            thumbnail: url,
            domain: domain,
            tags: ['assets', 'direct']
        };
    }

    // Microlink Extraction
    try {
        const response = await fetch(`https://api.microlink.io/?url=${encodeURIComponent(url)}`);
        const result = await response.json();
        
        if (result.status === 'success') {
            const d = result.data;
            return {
                title: d.title || url,
                description: d.description || 'Pro-grade resource saved to your vault.',
                thumbnail: d.image?.url || `https://image.thum.io/get/width/800/${url}`,
                domain: domain,
                tags: d.publisher ? [d.publisher.toLowerCase()] : []
            };
        }
    } catch (e) { console.warn("AI extraction failed, using fallback."); }

    // Hard Fallback (Step 3 & 4)
    return {
        title: domain || 'Unknown Resource',
        description: 'Metadata restricted. Use manual edit to add details.',
        thumbnail: `https://image.thum.io/get/width/800/${url}`,
        domain: domain,
        tags: []
    };
}

// --- Pro Link Lifecycle ---

async function handleProPreview() {
    const url = linkInput.value.trim();
    if (!isValidUrl(url)) {
        proPreview.classList.add('hidden');
        saveBtn.disabled = true;
        return;
    }

    proPreview.classList.remove('hidden');
    saveBtn.disabled = true;
    editTitle.value = "Scanning...";
    editDesc.value = "Performing deep scan for premium metadata...";
    previewImg.src = "https://via.placeholder.com/600x400/030712/ffffff?text=ELEVATING...";

    try {
        const data = await getProThumbnail(url);
        
        previewImg.src = data.thumbnail;
        previewImg.onerror = () => {
            previewImg.src = `https://www.google.com/s2/favicons?sz=128&domain=${data.domain}`;
        };
        
        editTitle.value = data.title;
        editDesc.value = data.description;
        editTags.value = data.tags.join(', ');
        
        saveBtn.disabled = false;
    } catch (e) {
        showProToast("Security bypass: Manual entry required");
        saveBtn.disabled = false;
    }
}

function commitProLink() {
    const url = linkInput.value.trim();
    const tags = editTags.value.split(',').map(t => t.trim().toLowerCase()).filter(t => t !== '');
    
    const linkData = {
        url: url,
        title: editTitle.value,
        description: editDesc.value,
        thumbnail: previewImg.src,
        domain: extractDomain(url),
        tags: tags,
        timestamp: activeEditingId ? proLinks.find(l => l.id === activeEditingId).timestamp : Date.now(),
        favorite: activeEditingId ? proLinks.find(l => l.id === activeEditingId).favorite : false
    };

    if (activeEditingId) {
        proLinks = proLinks.map(l => l.id === activeEditingId ? { ...l, ...linkData } : l);
        showProToast("Resource remastered");
    } else {
        linkData.id = Date.now().toString();
        proLinks.unshift(linkData);
        showProToast("Vault link secured");
    }

    saveVault();
    renderAll();
    closeModal();
}

function deleteProLink(id) {
    proLinks = proLinks.filter(l => l.id !== id);
    saveVault();
    renderAll();
    showProToast("Link purged");
}

function toggleProFav(id) {
    proLinks = proLinks.map(l => (l.id === id ? { ...l, favorite: !l.favorite } : l));
    saveVault();
    renderAll();
}

function openEditModal(id) {
    const link = proLinks.find(l => l.id === id);
    if (!link) return;

    activeEditingId = id;
    modalTitle.textContent = "Editor Mode: Pro";
    linkInput.value = link.url;
    
    proPreview.classList.remove('hidden');
    previewImg.src = link.thumbnail;
    editTitle.value = link.title;
    editDesc.value = link.description;
    editTags.value = link.tags.join(', ');
    
    saveBtn.disabled = false;
    saveBtn.textContent = "Apply Refinement";
    
    openModal();
}

// --- Universal Rendering ---

function renderAll() {
    renderTags();
    renderLinks();
}

function renderTags() {
    // Collect all unique tags
    const allTags = new Set();
    proLinks.forEach(l => l.tags.forEach(t => allTags.add(t)));
    
    // Preserve "All" and "Favorites"
    const current = currentFilter;
    tagCloud.innerHTML = `
        <button class="tag-chip ${current === 'all' ? 'active' : ''}" data-tag="all">Vault All</button>
        <button class="tag-chip ${current === 'fav' ? 'active' : ''}" data-tag="fav">Favorites</button>
    `;
    
    Array.from(allTags).sort().forEach(tag => {
        tagCloud.innerHTML += `<button class="tag-chip ${current === tag ? 'active' : ''}" data-tag="${tag}">${tag}</button>`;
    });
}

function renderLinks() {
    let filtered = proLinks.filter(l => {
        const matchesTerm = l.title.toLowerCase().includes(searchTerm) || 
                            l.domain.toLowerCase().includes(searchTerm) ||
                            l.url.toLowerCase().includes(searchTerm);
        
        let matchesFilter = true;
        if (currentFilter === 'fav') matchesFilter = l.favorite;
        else if (currentFilter !== 'all') matchesFilter = l.tags.includes(currentFilter);
        
        return matchesTerm && matchesFilter;
    });

    // Sorting
    filtered.sort((a, b) => {
        if (sortBy === 'newest') return b.timestamp - a.timestamp;
        if (sortBy === 'oldest') return a.timestamp - b.timestamp;
        if (sortBy === 'az') return a.title.localeCompare(b.title);
        if (sortBy === 'domain') return a.domain.localeCompare(b.domain);
        return 0;
    });

    linksGrid.innerHTML = '';
    
    if (filtered.length === 0) {
        linksGrid.innerHTML = `<div class="empty-state">No links found in this vault projection.</div>`;
        return;
    }

    filtered.forEach(link => {
        const card = document.createElement('div');
        card.className = 'pro-card';
        card.innerHTML = `
            <div class="pro-card-fav ${link.favorite ? 'active' : ''}" onclick="toggleProFav('${link.id}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="${link.favorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            </div>
            <div class="pro-card-hero">
                <img src="${link.thumbnail}" alt="Thumb" loading="lazy" onerror="this.src='https://www.google.com/s2/favicons?sz=128&domain=${link.domain}'">
            </div>
            <div class="pro-card-body">
                <div class="pro-tag-list">${link.tags.map(t => `<span class="pro-tag">${t}</span>`).join('')}</div>
                <h3 class="pro-card-title">${link.title}</h3>
                <p class="pro-card-desc">${link.description}</p>
                <div class="pro-card-actions">
                    <button class="pro-btn pro-btn-main" onclick="window.open('${link.url}', '_blank')">Access Resource</button>
                    <button class="pro-btn edit" onclick="openEditModal('${link.id}')" title="Refine">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button class="pro-btn del" onclick="deleteProLink('${link.id}')" title="Purge">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </div>
            </div>
        `;
        linksGrid.appendChild(card);
    });
}

// --- Data Management PRO ---

function exportProVault() {
    const dataStr = JSON.stringify(proLinks, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'sachin_pro_vault.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    showProToast("Vault extracted");
}

function importProVault(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (Array.isArray(imported)) {
                proLinks = [...imported, ...proLinks];
                // Deduplicate by ID
                const uniqueIds = new Set();
                proLinks = proLinks.filter(l => {
                    if (uniqueIds.has(l.id)) return false;
                    uniqueIds.add(l.id);
                    return true;
                });
                saveVault();
                renderAll();
                showProToast("Vault synchronized");
            }
        } catch (e) { showProToast("Import corruption detected"); }
    };
    reader.readAsText(file);
}

// --- UI Helpers PRO ---

function openModal() {
    overlay.classList.add('active');
    proModal.classList.add('active');
    if (!activeEditingId) {
        modalTitle.textContent = "Elevate a New Link";
        linkInput.value = '';
        proPreview.classList.add('hidden');
        saveBtn.disabled = true;
        saveBtn.textContent = "Commit Link";
    }
}

function closeModal() {
    overlay.classList.remove('active');
    proModal.classList.remove('active');
    activeEditingId = null;
}

function saveVault() { localStorage.setItem('sachin_pro_vault', JSON.stringify(proLinks)); }

function isValidUrl(s) { try { new URL(s); return true; } catch(e) { return false; } }

function extractDomain(url) { try { return new URL(url).hostname.replace('www.', ''); } catch(e) { return 'Resource'; } }

function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

function showProToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

// --- Pro Particle Engine ---
function initParticles() {
    const canvas = document.getElementById('particles');
    const ctx = canvas.getContext('2d');
    let pts = [];

    const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    class Particle {
        constructor() {
            this.x = Math.random() * canvas.width;
            this.y = Math.random() * canvas.height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.size = Math.random() * 2;
        }
        update() {
            this.x += this.vx; this.y += this.vy;
            if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
            if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }
        draw() {
            ctx.fillStyle = 'rgba(139, 92, 246, 0.5)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    for (let i = 0; i < 50; i++) pts.push(new Particle());

    function anim() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        pts.forEach(p => { p.update(); p.draw(); });
        requestAnimationFrame(anim);
    }
    anim();
}
