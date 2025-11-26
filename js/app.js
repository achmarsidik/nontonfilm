// ==================== KONFIGURASI ====================
const API_URL = 'api/upload.php';
const MOVIES_JSON = 'data/movies.json';

// ==================== UTILITY FUNCTIONS ====================
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const notificationText = document.getElementById('notificationText');
    
    if (notification && notificationText) {
        notificationText.textContent = message;
        notification.className = 'notification ' + type + ' show';
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
}

async function fetchAPI(action, data = {}) {
    try {
        const formData = new FormData();
        formData.append('action', action);
        
        for (const [key, value] of Object.entries(data)) {
            formData.append(key, value);
        }
        
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, error: error.message };
    }
}

// Alternatif jika tidak pakai PHP (langsung baca JSON)
async function getMoviesFromJSON() {
    try {
        const response = await fetch(MOVIES_JSON + '?t=' + Date.now());
        const data = await response.json();
        return data.movies || [];
    } catch (error) {
        console.error('Error loading movies:', error);
        return [];
    }
}

// ==================== LOAD MOVIES ====================
async function loadMovies(filter = 'all') {
    const moviesGrid = document.getElementById('moviesGrid');
    if (!moviesGrid) return;
    
    moviesGrid.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Memuat film...</p>
        </div>
    `;
    
    try {
        const movies = await getMoviesFromJSON();
        
        // Filter movies
        let filteredMovies = movies;
        if (filter !== 'all') {
            filteredMovies = movies.filter(m => m.type === filter);
        }
        
        // Sort by newest
        filteredMovies.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        if (filteredMovies.length === 0) {
            moviesGrid.innerHTML = `
                <div class="loading">
                    <i class="fas fa-film"></i>
                    <p>Belum ada film</p>
                </div>
            `;
            return;
        }
        
        moviesGrid.innerHTML = filteredMovies.map(movie => `
            <div class="movie-card" onclick="viewMovie('${movie.id}')">
                <div class="movie-poster">
                    <img src="${movie.poster || 'https://via.placeholder.com/300x450?text=No+Image'}" 
                         alt="${movie.title}"
                         loading="lazy"
                         onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
                    <div class="movie-overlay">
                        <div class="play-btn">
                            <i class="fas fa-play"></i>
                        </div>
                    </div>
                    ${movie.type === 'series' ? '<div class="movie-badge">Series</div>' : ''}
                    ${movie.rating ? `
                        <div class="movie-rating">
                            <i class="fas fa-star"></i>
                            ${movie.rating}
                        </div>
                    ` : ''}
                </div>
                <div class="movie-info">
                    <h3>${movie.title}</h3>
                    <div class="movie-meta-info">
                        <span>${movie.year || '-'}</span>
                        <span>${movie.duration || '-'}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        moviesGrid.innerHTML = `
            <div class="loading">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Gagal memuat film</p>
            </div>
        `;
    }
}

// ==================== VIEW MOVIE ====================
function viewMovie(movieId) {
    window.location.href = `movie.html?id=${movieId}`;
}

// ==================== LOAD MOVIE DETAIL ====================
async function loadMovieDetail(movieId) {
    try {
        const movies = await getMoviesFromJSON();
        const movie = movies.find(m => m.id === movieId);
        
        if (!movie) {
            alert('Film tidak ditemukan!');
            window.location.href = 'index.html';
            return;
        }
        
        // Update page title
        document.title = `${movie.title} - NamaWebsite`;
        
        // Update backdrop
        const backdrop = document.getElementById('movieBackdrop');
        if (backdrop && movie.backdrop) {
            backdrop.style.backgroundImage = `url('${movie.backdrop}')`;
        } else if (backdrop && movie.poster) {
            backdrop.style.backgroundImage = `url('${movie.poster}')`;
        }
        
        // Update info
        const posterEl = document.getElementById('moviePoster');
        if (posterEl) {
            posterEl.src = movie.poster || 'https://via.placeholder.com/300x450?text=No+Image';
            posterEl.alt = movie.title;
        }
        
        setTextContent('movieTitle', movie.title);
        setTextContent('movieAltTitle', movie.alternative_title || '');
        setTextContent('movieYear', movie.year || '-');
        setTextContent('movieDuration', movie.duration || '-');
        setTextContent('movieRating', movie.rating || '-');
        setTextContent('movieDesc', movie.description || 'Tidak ada deskripsi');
        
        // Genres
        const genresContainer = document.getElementById('movieGenres');
        if (genresContainer && movie.genres && movie.genres.length > 0) {
            genresContainer.innerHTML = movie.genres.map(g => `<span>${g}</span>`).join('');
        }
        
        // Status & Type
        const statusBadge = document.getElementById('movieStatus');
        const typeBadge = document.getElementById('movieType');
        
        if (statusBadge) {
            statusBadge.textContent = movie.status === 'completed' ? 'Completed' : 'Ongoing';
            statusBadge.className = `status-badge ${movie.status}`;
        }
        
        if (typeBadge) {
            typeBadge.textContent = movie.type === 'series' ? 'Series' : 'Movie';
        }
        
        // Load video sources
        loadVideoSources(movie.sources || []);
        
    } catch (error) {
        console.error('Error loading movie detail:', error);
        alert('Terjadi kesalahan saat memuat data film!');
    }
}

// Helper function to set text content safely
function setTextContent(elementId, text) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = text;
    }
}

// ==================== LOAD VIDEO SOURCES ====================
function loadVideoSources(sources) {
    const serverButtons = document.getElementById('serverButtons');
    const videoPlayer = document.getElementById('videoPlayer');
    const downloadList = document.getElementById('downloadList');
    
    if (!sources || sources.length === 0) {
        if (serverButtons) {
            serverButtons.innerHTML = '<span style="color: var(--text-muted);">Belum ada video tersedia</span>';
        }
        if (downloadList) {
            downloadList.innerHTML = '<p style="color: var(--text-muted); text-align: center; padding: 20px;">Belum ada download link tersedia</p>';
        }
        return;
    }
    
    // Render server buttons
    if (serverButtons) {
        serverButtons.innerHTML = sources.map((source, index) => `
            <button class="server-btn ${index === 0 ? 'active' : ''}" 
                    onclick="changeServer(this, '${source.embed_url}')"
                    data-provider="${source.provider}">
                <i class="${getProviderIcon(source.provider)}"></i>
                ${getProviderName(source.provider)} ${source.quality}
            </button>
        `).join('');
    }
    
    // Set initial video
    if (videoPlayer && sources[0]) {
        videoPlayer.src = sources[0].embed_url;
    }
    
    // Render download list
    if (downloadList) {
        downloadList.innerHTML = sources.map(source => `
            <div class="download-item">
                <div class="download-info">
                    <i class="${getProviderIcon(source.provider)}" style="font-size: 1.5rem; color: var(--primary);"></i>
                    <span class="download-provider">${getProviderName(source.provider)}</span>
                    <span class="download-quality">${source.quality}</span>
                </div>
                <a href="${source.download_url || source.embed_url}" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   class="download-btn">
                    <i class="fas fa-download"></i>
                    Download
                </a>
            </div>
        `).join('');
    }
}

// ==================== CHANGE SERVER ====================
function changeServer(button, embedUrl) {
    // Update active button
    document.querySelectorAll('.server-btn').forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    // Change video with loading effect
    const videoPlayer = document.getElementById('videoPlayer');
    if (videoPlayer) {
        videoPlayer.src = '';
        setTimeout(() => {
            videoPlayer.src = embedUrl;
        }, 100);
    }
}

// ==================== GET PROVIDER NAME ====================
function getProviderName(provider) {
    const names = {
        'doodstream': 'Doodstream',
        'streamtape': 'Streamtape',
        'gdrive': 'Google Drive',
        'mega': 'Mega',
        'fembed': 'Fembed',
        'mixdrop': 'Mixdrop',
        'streamsb': 'StreamSB',
        'other': 'Server'
    };
    return names[provider] || provider;
}

// ==================== GET PROVIDER ICON ====================
function getProviderIcon(provider) {
    const icons = {
        'doodstream': 'fas fa-play-circle',
        'streamtape': 'fas fa-video',
        'gdrive': 'fab fa-google-drive',
        'mega': 'fas fa-cloud',
        'fembed': 'fas fa-film',
        'mixdrop': 'fas fa-tint',
        'streamsb': 'fas fa-stream',
        'other': 'fas fa-server'
    };
    return icons[provider] || 'fas fa-server';
}

// ==================== SEARCH FUNCTIONALITY ====================
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    let searchTimeout;
    
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const query = this.value.trim();
        
        searchTimeout = setTimeout(() => {
            if (query.length >= 2) {
                searchMovies(query);
            } else if (query.length === 0) {
                loadMovies();
            }
        }, 300);
    });
    
    // Enter key handler
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            clearTimeout(searchTimeout);
            searchMovies(this.value.trim());
        }
    });
}

async function searchMovies(query) {
    const moviesGrid = document.getElementById('moviesGrid');
    if (!moviesGrid) return;
    
    if (!query.trim()) {
        loadMovies();
        return;
    }
    
    moviesGrid.innerHTML = `
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i>
            <p>Mencari...</p>
        </div>
    `;
    
    const movies = await getMoviesFromJSON();
    const queryLower = query.toLowerCase();
    
    const filtered = movies.filter(m => 
        m.title.toLowerCase().includes(queryLower) ||
        (m.alternative_title && m.alternative_title.toLowerCase().includes(queryLower)) ||
        (m.genres && m.genres.some(g => g.toLowerCase().includes(queryLower))) ||
        (m.year && m.year.includes(query))
    );
    
    if (filtered.length === 0) {
        moviesGrid.innerHTML = `
            <div class="loading">
                <i class="fas fa-search"></i>
                <p>Tidak ditemukan hasil untuk "<strong>${query}</strong>"</p>
            </div>
        `;
        return;
    }
    
    moviesGrid.innerHTML = filtered.map(movie => `
        <div class="movie-card" onclick="viewMovie('${movie.id}')">
            <div class="movie-poster">
                <img src="${movie.poster || 'https://via.placeholder.com/300x450?text=No+Image'}" 
                     alt="${movie.title}"
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/300x450?text=No+Image'">
                <div class="movie-overlay">
                    <div class="play-btn">
                        <i class="fas fa-play"></i>
                    </div>
                </div>
                ${movie.type === 'series' ? '<div class="movie-badge">Series</div>' : ''}
                ${movie.rating ? `
                    <div class="movie-rating">
                        <i class="fas fa-star"></i>
                        ${movie.rating}
                    </div>
                ` : ''}
            </div>
            <div class="movie-info">
                <h3>${movie.title}</h3>
                <div class="movie-meta-info">
                    <span>${movie.year || '-'}</span>
                    <span>${movie.duration || '-'}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// ==================== FILTER FUNCTIONALITY ====================
function initFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            // Update active state
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Load filtered movies
            const filter = this.getAttribute('data-filter');
            loadMovies(filter);
        });
    });
}

// ==================== NAVBAR SCROLL EFFECT ====================
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// ==================== HERO SECTION DYNAMIC ====================
async function initHeroSection() {
    const heroSection = document.getElementById('heroSection');
    const heroTitle = document.getElementById('heroTitle');
    const heroDesc = document.getElementById('heroDesc');
    
    if (!heroSection) return;
    
    try {
        const movies = await getMoviesFromJSON();
        
        if (movies.length > 0) {
            // Get random featured movie
            const featuredMovie = movies[Math.floor(Math.random() * Math.min(movies.length, 5))];
            
            if (featuredMovie.backdrop) {
                heroSection.style.backgroundImage = `
                    linear-gradient(to right, rgba(0,0,0,0.8), transparent),
                    url('${featuredMovie.backdrop}')
                `;
            } else if (featuredMovie.poster) {
                heroSection.style.backgroundImage = `
                    linear-gradient(to right, rgba(0,0,0,0.9), rgba(0,0,0,0.5)),
                    url('${featuredMovie.poster}')
                `;
            }
            
            if (heroTitle) {
                heroTitle.textContent = featuredMovie.title;
            }
            if (heroDesc) {
                heroDesc.textContent = featuredMovie.description 
                    ? featuredMovie.description.substring(0, 150) + '...'
                    : 'Tonton sekarang di website kami';
            }
        }
    } catch (error) {
        console.error('Error initializing hero:', error);
    }
}

// ==================== LAZY LOADING IMAGES ====================
function initLazyLoading() {
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    observer.unobserve(img);
                }
            });
        });
        
        document.querySelectorAll('img.lazy').forEach(img => {
            imageObserver.observe(img);
        });
    }
}

// ==================== SMOOTH SCROLL ====================
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// ==================== INITIALIZE APP ====================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize based on page
    const currentPage = window.location.pathname;
    
    // Common initializations
    initNavbarScroll();
    initSmoothScroll();
    
    // Page-specific initializations
    if (currentPage.includes('index.html') || currentPage.endsWith('/')) {
        loadMovies();
        initSearch();
        initFilters();
        initHeroSection();
    }
    
    // Movie detail page is handled by inline script in movie.html
});

// ==================== EXPORT FUNCTIONS (for global use) ====================
window.viewMovie = viewMovie;
window.changeServer = changeServer;
window.loadMovieDetail = loadMovieDetail;
window.loadMovies = loadMovies;
window.searchMovies = searchMovies;
