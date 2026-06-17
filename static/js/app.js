// Application State
let appState = {
    entries: [],
    bookmarks: [], // array of update unique ids
    activeFilter: 'all',
    searchQuery: '',
    lastSyncTime: null
};

// DOM Elements
const elements = {
    btnRefresh: document.getElementById('btn-refresh'),
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
    iconSun: document.getElementById('icon-sun'),
    iconMoon: document.getElementById('icon-moon'),
    btnExportCSV: document.getElementById('btn-export-csv'),
    statusTimestamp: document.getElementById('status-timestamp'),
    feedLoader: document.getElementById('feed-loader'),
    feedEmpty: document.getElementById('feed-empty'),
    feedTimeline: document.getElementById('feed-timeline'),
    searchInput: document.getElementById('search-input'),
    searchClear: document.getElementById('search-clear'),
    filterPills: document.querySelectorAll('.filter-pill'),
    
    // Stats elements
    statTotalReleases: document.querySelector('#stat-total-releases .stat-value'),
    statFeatures: document.querySelector('#stat-features .stat-value'),
    statAnnouncements: document.querySelector('#stat-announcements .stat-value'),
    statIssues: document.querySelector('#stat-issues .stat-value'),
    
    // Modal elements
    tweetModal: document.getElementById('tweet-modal'),
    modalClose: document.getElementById('modal-close'),
    modalCancel: document.getElementById('modal-cancel'),
    modalUpdateTag: document.getElementById('modal-update-tag'),
    modalUpdateDate: document.getElementById('modal-update-date'),
    modalUpdateSource: document.getElementById('modal-update-source'),
    tweetTextarea: document.getElementById('tweet-textarea'),
    btnAutoTrim: document.getElementById('btn-auto-trim'),
    tweetCharCount: document.getElementById('tweet-char-count'),
    btnPostTweet: document.getElementById('btn-post-tweet'),
    
    toastContainer: document.getElementById('toast-container')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    loadBookmarks();
    loadTheme();
    setupEventListeners();
    fetchReleaseNotes(false);
});

// Load Bookmarks from LocalStorage
function loadBookmarks() {
    const saved = localStorage.getItem('bq_release_bookmarks');
    if (saved) {
        try {
            appState.bookmarks = JSON.parse(saved);
        } catch (e) {
            appState.bookmarks = [];
        }
    }
}

// Save Bookmarks to LocalStorage
function saveBookmarks() {
    localStorage.setItem('bq_release_bookmarks', JSON.stringify(appState.bookmarks));
}

// Load Theme from LocalStorage
function loadTheme() {
    const savedTheme = localStorage.getItem('bq_release_theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        elements.iconSun.style.display = 'none';
        elements.iconMoon.style.display = 'block';
    } else {
        document.body.classList.remove('light-theme');
        elements.iconSun.style.display = 'block';
        elements.iconMoon.style.display = 'none';
    }
}

// Toggle light/dark theme
function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem('bq_release_theme', isLight ? 'light' : 'dark');
    
    if (isLight) {
        elements.iconSun.style.display = 'none';
        elements.iconMoon.style.display = 'block';
        showToast('Light theme enabled', 'success');
    } else {
        elements.iconSun.style.display = 'block';
        elements.iconMoon.style.display = 'none';
        showToast('Dark theme enabled', 'success');
    }
}

// Toast notification helper
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icon based on type
    let iconSvg = '';
    if (type === 'success') {
        iconSvg = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else {
        iconSvg = `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }
    
    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    elements.toastContainer.appendChild(toast);
    
    // Auto remove after 3.5 seconds
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-out forwards';
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, 3500);
}

// Generate unique ID for an update item
function generateUpdateId(date, type, index) {
    // Standardize key creation
    const dateSlug = date.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const typeSlug = type.toLowerCase();
    return `up_${dateSlug}_${typeSlug}_${index}`;
}

// Setup Event Listeners
function setupEventListeners() {
    // Refresh Button
    elements.btnRefresh.addEventListener('click', () => {
        fetchReleaseNotes(true);
    });
    
    // Theme Toggle Button
    elements.btnThemeToggle.addEventListener('click', () => {
        toggleTheme();
    });
    
    // Export CSV Button
    elements.btnExportCSV.addEventListener('click', () => {
        exportToCSV();
    });
    
    // Search Box Input
    elements.searchInput.addEventListener('input', (e) => {
        appState.searchQuery = e.target.value.toLowerCase().trim();
        elements.searchClear.style.display = appState.searchQuery ? 'block' : 'none';
        renderTimeline();
    });
    
    // Clear Search Button
    elements.searchClear.addEventListener('click', () => {
        elements.searchInput.value = '';
        appState.searchQuery = '';
        elements.searchClear.style.display = 'none';
        elements.searchInput.focus();
        renderTimeline();
    });
    
    // Filter Pills Click
    elements.filterPills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            // Find active pill
            elements.filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
            
            appState.activeFilter = pill.getAttribute('data-type');
            renderTimeline();
        });
    });
    
    // Modal Close buttons
    elements.modalClose.addEventListener('click', hideModal);
    elements.modalCancel.addEventListener('click', hideModal);
    
    // Close modal on click outside content
    elements.tweetModal.addEventListener('click', (e) => {
        if (e.target === elements.tweetModal) {
            hideModal();
        }
    });
    
    // Character Counter on Tweet Textarea
    elements.tweetTextarea.addEventListener('input', updateCharCount);
    
    // Auto Trim Button
    elements.btnAutoTrim.addEventListener('click', autoTrimTweet);
    
    // Post to Twitter Intent
    elements.btnPostTweet.addEventListener('click', postToTwitter);
}

// API Call: Fetch Release Notes
async function fetchReleaseNotes(force = false) {
    try {
        setLoadingState(true);
        
        const refreshQuery = force ? '?refresh=true' : '';
        const response = await fetch(`/api/releases${refreshQuery}`);
        if (!response.ok) {
            throw new Error(`HTTP status ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'Server returned failure status');
        }
        
        appState.entries = data.entries;
        appState.lastSyncTime = new Date();
        
        updateSyncIndicator(data.cached, data.cache_age, data.warning);
        calculateTelemetryStats();
        renderTimeline();
        
        if (force) {
            showToast('Release notes synced successfully!', 'success');
        }
    } catch (error) {
        console.error('Error fetching release notes:', error);
        showToast(`Sync failed: ${error.message}`, 'info');
        
        // Update indicator to reflect error state
        elements.statusTimestamp.textContent = 'Sync error';
        const indicator = document.querySelector('.status-indicator');
        if (indicator) {
            indicator.className = 'status-indicator';
            indicator.style.backgroundColor = '#ef4444';
            indicator.style.boxShadow = '0 0 8px #ef4444';
        }
    } finally {
        setLoadingState(false);
    }
}

// Manage Loading UI State
function setLoadingState(isLoading) {
    const icon = elements.btnRefresh.querySelector('.icon-refresh');
    const indicator = document.querySelector('.status-indicator');
    
    if (isLoading) {
        elements.btnRefresh.disabled = true;
        if (icon) icon.classList.add('spinning');
        if (indicator) {
            indicator.className = 'status-indicator loading';
            indicator.style.backgroundColor = '';
            indicator.style.boxShadow = '';
        }
        elements.feedLoader.style.display = 'flex';
        elements.feedTimeline.style.opacity = '0.5';
    } else {
        elements.btnRefresh.disabled = false;
        if (icon) icon.classList.remove('spinning');
        if (indicator) {
            indicator.className = 'status-indicator live';
        }
        elements.feedLoader.style.display = 'none';
        elements.feedTimeline.style.opacity = '1';
    }
}

// Update Sync Info bar
function updateSyncIndicator(isCached, cacheAge, warning) {
    if (warning) {
        elements.statusTimestamp.textContent = 'Server Error (Cached data)';
        return;
    }
    
    if (isCached && cacheAge !== undefined) {
        if (cacheAge < 60) {
            elements.statusTimestamp.textContent = 'Synced just now (cached)';
        } else {
            const minutes = Math.floor(cacheAge / 60);
            elements.statusTimestamp.textContent = `Synced ${minutes}m ago (cached)`;
        }
    } else {
        elements.statusTimestamp.textContent = 'Synced just now';
    }
}

// Calculate Telemetry stats from loaded entries
function calculateTelemetryStats() {
    let totalReleases = appState.entries.length;
    let totalFeatures = 0;
    let totalAnnouncements = 0;
    let totalIssues = 0;
    
    appState.entries.forEach(entry => {
        if (entry.updates && Array.isArray(entry.updates)) {
            entry.updates.forEach(up => {
                const type = up.type.toLowerCase();
                if (type.includes('feature')) totalFeatures++;
                else if (type.includes('announcement')) totalAnnouncements++;
                else if (type.includes('issue') || type.includes('fix')) totalIssues++;
            });
        }
    });
    
    elements.statTotalReleases.textContent = totalReleases;
    elements.statFeatures.textContent = totalFeatures;
    elements.statAnnouncements.textContent = totalAnnouncements;
    elements.statIssues.textContent = totalIssues;
}

// Render Timeline to DOM based on active state (filters + searches)
function renderTimeline() {
    elements.feedTimeline.innerHTML = '';
    let renderedCount = 0;
    
    appState.entries.forEach(entry => {
        // Filter the updates in this entry
        const filteredUpdates = entry.updates.filter((up, index) => {
            const updateId = generateUpdateId(entry.date, up.type, index);
            
            // Category Filter Check
            if (appState.activeFilter === 'bookmarks') {
                if (!appState.bookmarks.includes(updateId)) return false;
            } else if (appState.activeFilter !== 'all') {
                if (up.type.toLowerCase() !== appState.activeFilter.toLowerCase()) return false;
            }
            
            // Search Query Check
            if (appState.searchQuery) {
                const textMatch = up.text.toLowerCase().includes(appState.searchQuery);
                const typeMatch = up.type.toLowerCase().includes(appState.searchQuery);
                const dateMatch = entry.date.toLowerCase().includes(appState.searchQuery);
                if (!textMatch && !typeMatch && !dateMatch) return false;
            }
            
            return true;
        });
        
        // If this entry has matching updates, render it
        if (filteredUpdates.length > 0) {
            const dateGroupEl = document.createElement('section');
            dateGroupEl.className = 'date-group';
            
            // Create Date Header
            const dateHeaderEl = document.createElement('div');
            dateHeaderEl.className = 'date-header';
            
            const titleEl = document.createElement('h2');
            titleEl.textContent = entry.date;
            dateHeaderEl.appendChild(titleEl);
            
            if (entry.link) {
                const linkEl = document.createElement('a');
                linkEl.href = entry.link;
                linkEl.target = '_blank';
                linkEl.rel = 'noopener noreferrer';
                linkEl.className = 'date-link';
                linkEl.title = 'View original release notes page';
                linkEl.innerHTML = `
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" style="margin-left: 6px;">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                    </svg>
                `;
                dateHeaderEl.appendChild(linkEl);
            }
            
            dateGroupEl.appendChild(dateHeaderEl);
            
            // List container for matching updates
            const cardsListEl = document.createElement('div');
            cardsListEl.className = 'update-cards-list';
            
            filteredUpdates.forEach((up) => {
                // Find index of this update in original entry
                const originalIndex = entry.updates.findIndex(x => x === up);
                const updateId = generateUpdateId(entry.date, up.type, originalIndex);
                const isBookmarked = appState.bookmarks.includes(updateId);
                
                const cardEl = document.createElement('div');
                cardEl.className = `update-card ${up.type}`;
                
                // Card Header badge and actions
                const cardHeaderEl = document.createElement('div');
                cardHeaderEl.className = 'card-header';
                
                const badgeEl = document.createElement('span');
                badgeEl.className = `badge ${up.type.toLowerCase()}`;
                badgeEl.textContent = up.type;
                cardHeaderEl.appendChild(badgeEl);
                
                // Actions (Bookmark)
                const actionsEl = document.createElement('div');
                actionsEl.className = 'card-actions';
                
                const bookmarkBtn = document.createElement('button');
                bookmarkBtn.className = `btn-card-action ${isBookmarked ? 'active-bookmark' : ''}`;
                bookmarkBtn.title = isBookmarked ? 'Remove Bookmark' : 'Bookmark Update';
                bookmarkBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                    </svg>
                `;
                bookmarkBtn.addEventListener('click', () => {
                    toggleBookmark(updateId);
                });
                
                actionsEl.appendChild(bookmarkBtn);
                
                // Actions (Copy to Clipboard)
                const copyBtn = document.createElement('button');
                copyBtn.className = 'btn-card-action';
                copyBtn.title = 'Copy Update Text';
                copyBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                `;
                copyBtn.addEventListener('click', () => {
                    const copyText = `[BigQuery Update - ${up.type}] (${entry.date})\n\n${up.text}\n\nRead details at:\n${entry.link}`;
                    navigator.clipboard.writeText(copyText)
                        .then(() => showToast('Update copied to clipboard!', 'success'))
                        .catch(() => showToast('Failed to copy to clipboard', 'info'));
                });
                actionsEl.appendChild(copyBtn);
                
                cardHeaderEl.appendChild(actionsEl);
                cardEl.appendChild(cardHeaderEl);
                
                // Card content html
                const contentEl = document.createElement('div');
                contentEl.className = 'card-content';
                contentEl.innerHTML = up.html;
                cardEl.appendChild(contentEl);
                
                // Card footer containing Tweet button
                const footerEl = document.createElement('div');
                footerEl.className = 'card-footer';
                
                const tweetBtn = document.createElement('button');
                tweetBtn.className = 'btn-share-tweet';
                tweetBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span>Tweet This</span>
                `;
                
                tweetBtn.addEventListener('click', () => {
                    openTweetComposer(entry.date, up.type, up.text, entry.link);
                });
                
                footerEl.appendChild(tweetBtn);
                cardEl.appendChild(footerEl);
                
                cardsListEl.appendChild(cardEl);
                renderedCount++;
            });
            
            dateGroupEl.appendChild(cardsListEl);
            elements.feedTimeline.appendChild(dateGroupEl);
        }
    });
    
    // Manage Empty State Display
    if (renderedCount === 0) {
        elements.feedEmpty.style.display = 'flex';
    } else {
        elements.feedEmpty.style.display = 'none';
    }
}

// Toggle Bookmarked status
function toggleBookmark(updateId) {
    const idx = appState.bookmarks.indexOf(updateId);
    if (idx === -1) {
        appState.bookmarks.push(updateId);
        showToast('Update bookmarked!', 'success');
    } else {
        appState.bookmarks.splice(idx, 1);
        showToast('Bookmark removed.', 'info');
    }
    saveBookmarks();
    
    // If viewing bookmarks, we should re-render to hide removed bookmark
    if (appState.activeFilter === 'bookmarks') {
        renderTimeline();
    } else {
        // Find card action and toggle active state directly without full list re-render
        renderTimeline(); 
    }
}

// Tweet Composer Modal State Variable
let activeTweetData = {
    date: '',
    type: '',
    descriptionText: '',
    link: ''
};

// Open Tweet Composer Modal
function openTweetComposer(date, type, text, link) {
    activeTweetData = { date, type, descriptionText: text, link };
    
    elements.modalUpdateTag.textContent = type;
    elements.modalUpdateTag.className = `preview-tag badge ${type.toLowerCase()}`;
    elements.modalUpdateDate.textContent = date;
    elements.modalUpdateSource.textContent = text;
    
    // Build default draft
    // Emojis based on category
    let emoji = '📢';
    if (type.toLowerCase().includes('feature')) emoji = '🚀';
    else if (type.toLowerCase().includes('issue')) emoji = '⚠️';
    else if (type.toLowerCase().includes('deprecation')) emoji = '🛑';
    
    // Truncate description slightly for the starting template if it's super long
    const draftText = `${emoji} BigQuery Update [${type}] (${date}):\n\n${text}\n\nRead details here:\n🔗 ${link}`;
    elements.tweetTextarea.value = draftText;
    
    updateCharCount();
    
    elements.tweetModal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Lock background scroll
    elements.tweetTextarea.focus();
}

// Hide Modal
function hideModal() {
    elements.tweetModal.style.display = 'none';
    document.body.style.overflow = ''; // Restore scroll
}

// Update Character Counter UI
function updateCharCount() {
    const len = elements.tweetTextarea.value.length;
    elements.tweetCharCount.textContent = `${len} / 280`;
    
    // Color warnings based on Twitter limit
    elements.tweetCharCount.className = 'char-count';
    if (len > 280) {
        elements.tweetCharCount.classList.add('danger');
        elements.btnPostTweet.disabled = true;
        elements.btnPostTweet.style.opacity = '0.5';
        elements.btnPostTweet.style.cursor = 'not-allowed';
    } else {
        elements.btnPostTweet.disabled = false;
        elements.btnPostTweet.style.opacity = '1';
        elements.btnPostTweet.style.cursor = 'pointer';
        if (len > 250) {
            elements.tweetCharCount.classList.add('warning');
        }
    }
}

// Smart Auto Trim utility to ensure the tweet matches Twitter character limits
function autoTrimTweet() {
    const type = activeTweetData.type;
    const date = activeTweetData.date;
    const desc = activeTweetData.descriptionText;
    const link = activeTweetData.link;
    
    let emoji = '📢';
    if (type.toLowerCase().includes('feature')) emoji = '🚀';
    else if (type.toLowerCase().includes('issue')) emoji = '⚠️';
    else if (type.toLowerCase().includes('deprecation')) emoji = '🛑';
    
    const baseTemplate = `${emoji} BigQuery [${type}] (${date}):\n\n""\n\n🔗 ${link}`;
    const baseLength = baseTemplate.length; // template structure length
    const allowedDescLength = 280 - baseLength - 3; // reserve 3 chars for ellipsis '...'
    
    if (desc.length > allowedDescLength) {
        const trimmedDesc = desc.substring(0, allowedDescLength).trim() + '...';
        const newTweetText = `${emoji} BigQuery [${type}] (${date}):\n\n"${trimmedDesc}"\n\n🔗 ${link}`;
        elements.tweetTextarea.value = newTweetText;
        updateCharCount();
        showToast('Text trimmed to fit 280 character limit!', 'success');
    } else {
        const newTweetText = `${emoji} BigQuery [${type}] (${date}):\n\n"${desc}"\n\n🔗 ${link}`;
        elements.tweetTextarea.value = newTweetText;
        updateCharCount();
        showToast('Text already fits within character limits.', 'info');
    }
}

// Redirect User to Twitter Web Intent with drafted text
function postToTwitter() {
    const text = elements.tweetTextarea.value;
    if (text.length > 280) {
        showToast('Tweet details exceed 280 characters!', 'info');
        return;
    }
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, '_blank', 'noopener,noreferrer');
    hideModal();
}

// Export currently filtered releases to a CSV file
function exportToCSV() {
    let csvData = [];
    
    // Header row
    csvData.push(['Fecha', 'Tipo', 'Enlace', 'Descripcion']);
    
    appState.entries.forEach(entry => {
        entry.updates.forEach((up, index) => {
            const updateId = generateUpdateId(entry.date, up.type, index);
            
            // Apply category filter
            if (appState.activeFilter === 'bookmarks') {
                if (!appState.bookmarks.includes(updateId)) return;
            } else if (appState.activeFilter !== 'all') {
                if (up.type.toLowerCase() !== appState.activeFilter.toLowerCase()) return;
            }
            
            // Apply search query filter
            if (appState.searchQuery) {
                const textMatch = up.text.toLowerCase().includes(appState.searchQuery);
                const typeMatch = up.type.toLowerCase().includes(appState.searchQuery);
                const dateMatch = entry.date.toLowerCase().includes(appState.searchQuery);
                if (!textMatch && !typeMatch && !dateMatch) return;
            }
            
            // Prepare CSV fields and escape quotes
            const cleanDesc = up.text.replace(/"/g, '""');
            csvData.push([
                `"${entry.date}"`,
                `"${up.type}"`,
                `"${entry.link}"`,
                `"${cleanDesc}"`
            ]);
        });
    });
    
    if (csvData.length <= 1) {
        showToast('No visible updates to export', 'info');
        return;
    }
    
    // Construct CSV String
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    
    // Create download trigger (with UTF-8 BOM)
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'bigquery_releases_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('CSV exported successfully!', 'success');
}
