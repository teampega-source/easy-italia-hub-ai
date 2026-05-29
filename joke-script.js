// Joke API configuration
const JOKE_API = 'https://official-joke-api.appspot.com/jokes/';

// State management
let currentJoke = null;
let jokeCount = 0;
let favorites = [];

// DOM Elements
const jokeContent = document.getElementById('jokeContent');
const jokeBtn = document.getElementById('jokeBtn');
const shareBtn = document.getElementById('shareBtn');
const copyBtn = document.getElementById('copyBtn');
const categorySelect = document.getElementById('categorySelect');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');
const jokeCountDisplay = document.getElementById('jokeCount');
const favoriteCountDisplay = document.getElementById('favoriteCount');
const favoritesList = document.getElementById('favoritesList');
const clearFavoritesBtn = document.getElementById('clearFavoritesBtn');
const toast = document.getElementById('toast');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadFavoritesFromStorage();
    updateStats();
    addEventListeners();
});

// Event Listeners
function addEventListeners() {
    jokeBtn.addEventListener('click', fetchJoke);
    shareBtn.addEventListener('click', shareJoke);
    copyBtn.addEventListener('click', copyJoke);
    clearFavoritesBtn.addEventListener('click', clearAllFavorites);
    categorySelect.addEventListener('change', fetchJoke);
}

// Fetch Joke from API
async function fetchJoke() {
    const category = categorySelect.value;
    let apiUrl;

    // Build API URL based on category
    if (category === 'any') {
        apiUrl = JOKE_API + 'random';
    } else if (category === 'knock-knock') {
        apiUrl = JOKE_API + 'knock-knock/random';
    } else {
        apiUrl = JOKE_API + `${category}/random`;
    }

    try {
        showLoading(true);
        hideError();
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        displayJoke(data);
        jokeCount++;
        updateStats();

    } catch (error) {
        console.error('Error fetching joke:', error);
        showError('Oops! Failed to load a joke. Please try again.');
        jokeContent.innerHTML = '<p class="placeholder">Failed to load joke. Try again!</p>';
    } finally {
        showLoading(false);
    }
}

// Display Joke
function displayJoke(joke) {
    currentJoke = joke;
    let jokeHTML = '';

    // Handle different joke formats
    if (joke.setup && joke.delivery) {
        // Two-part joke (like knock-knock jokes)
        jokeHTML = `
            <p class="setup">${escapeHtml(joke.setup)}</p>
            <p class="punchline">${escapeHtml(joke.delivery)}</p>
        `;
    } else if (joke.joke) {
        // Single line joke
        jokeHTML = `<p>${escapeHtml(joke.joke)}</p>`;
    } else {
        jokeHTML = '<p>Unable to display joke</p>';
    }

    jokeContent.innerHTML = jokeHTML;
    jokeContent.classList.add('show');

    // Enable action buttons
    shareBtn.disabled = false;
    copyBtn.disabled = false;

    // Add favorite button if not already a favorite
    updateFavoriteButton();
}

// Get joke text for sharing/copying
function getJokeText() {
    if (!currentJoke) return '';

    if (currentJoke.setup && currentJoke.delivery) {
        return `${currentJoke.setup}\n${currentJoke.delivery}`;
    } else if (currentJoke.joke) {
        return currentJoke.joke;
    }
    return '';
}

// Share Joke
function shareJoke() {
    const jokeText = getJokeText();
    
    if (navigator.share) {
        navigator.share({
            title: 'Check out this funny joke!',
            text: jokeText
        }).catch(err => console.log('Share cancelled or failed:', err));
    } else {
        // Fallback: copy to clipboard
        copyJoke();
        showToast('Share not available. Joke copied to clipboard!');
    }
}

// Copy Joke
function copyJoke() {
    const jokeText = getJokeText();
    
    navigator.clipboard.writeText(jokeText).then(() => {
        showToast('Joke copied to clipboard! 📋');
    }).catch(err => {
        console.error('Failed to copy:', err);
        showToast('Failed to copy joke');
    });
}

// Add to Favorites
function addToFavorites() {
    if (!currentJoke) return;

    const isFavorited = favorites.some(fav => 
        fav.id === currentJoke.id && fav.type === (currentJoke.type || 'general')
    );

    if (!isFavorited) {
        favorites.push({
            id: currentJoke.id,
            type: currentJoke.type || 'general',
            setup: currentJoke.setup,
            delivery: currentJoke.delivery,
            joke: currentJoke.joke,
            timestamp: new Date().toISOString()
        });

        saveFavoritesToStorage();
        updateStats();
        renderFavorites();
        showToast('Added to favorites! ⭐');
        updateFavoriteButton();
    }
}

// Remove from Favorites
function removeFromFavorites(index) {
    favorites.splice(index, 1);
    saveFavoritesToStorage();
    updateStats();
    renderFavorites();
    showToast('Removed from favorites');
}

// Clear All Favorites
function clearAllFavorites() {
    if (confirm('Are you sure you want to clear all favorites?')) {
        favorites = [];
        saveFavoritesToStorage();
        updateStats();
        renderFavorites();
        showToast('All favorites cleared');
    }
}

// Render Favorites
function renderFavorites() {
    if (favorites.length === 0) {
        favoritesList.innerHTML = '<p class="empty-message">No favorite jokes yet. Click the heart to add one!</p>';
        clearFavoritesBtn.style.display = 'none';
        return;
    }

    clearFavoritesBtn.style.display = 'block';

    favoritesList.innerHTML = favorites.map((fav, index) => {
        let jokeText = '';
        if (fav.setup && fav.delivery) {
            jokeText = `${fav.setup} ${fav.delivery}`;
        } else {
            jokeText = fav.joke;
        }

        return `
            <div class="favorite-item">
                <p>${escapeHtml(jokeText)}</p>
                <button onclick="removeFromFavorites(${index})">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        `;
    }).join('');
}

// Update favorite button state
function updateFavoriteButton() {
    if (!currentJoke) return;

    const isFavorited = favorites.some(fav => 
        fav.id === currentJoke.id && fav.type === (currentJoke.type || 'general')
    );

    const existingBtn = document.getElementById('favoriteBtn');
    if (existingBtn) {
        if (isFavorited) {
            existingBtn.textContent = '❤️ Favorited';
            existingBtn.disabled = true;
        } else {
            existingBtn.textContent = '🤍 Add to Favorites';
            existingBtn.disabled = false;
        }
    }
}

// Update Statistics
function updateStats() {
    jokeCountDisplay.textContent = jokeCount;
    favoriteCountDisplay.textContent = favorites.length;
}

// Local Storage Management
function saveFavoritesToStorage() {
    localStorage.setItem('jokeGeneratorFavorites', JSON.stringify(favorites));
}

function loadFavoritesFromStorage() {
    const stored = localStorage.getItem('jokeGeneratorFavorites');
    if (stored) {
        try {
            favorites = JSON.parse(stored);
            renderFavorites();
            updateStats();
        } catch (error) {
            console.error('Error loading favorites:', error);
            favorites = [];
        }
    }
}

// UI Helper Functions
function showLoading(show) {
    loading.classList.toggle('active', show);
    jokeBtn.disabled = show;
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 5000);
}

function hideError() {
    errorMessage.classList.remove('show');
}

function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Utility Functions
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}

// Make functions globally available for inline onclick handlers
window.removeFromFavorites = removeFromFavorites;
window.addToFavorites = addToFavorites;

console.log('Joke Generator initialized successfully! 😂');
