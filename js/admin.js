// ==================== ADMIN PANEL JAVASCRIPT ====================
// File: js/admin.js

const API_URL = 'api/upload.php';
const MOVIES_JSON = 'data/movies.json';

// ==================== UTILITY FUNCTIONS ====================

/**
 * Menampilkan notifikasi
 */
function showNotification(message, type = 'success') {
    // Buat element notification jika belum ada
    let notification = document.getElementById('notification');
    
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'notification';
        notification.className = 'notification';
        notification.innerHTML = `
            <i class="fas fa-check-circle"></i>
            <span id="notificationText"></span>
        `;
        document.body.appendChild(notification);
    }
    
    const notificationText = document.getElementById('notificationText');
    const icon = notification.querySelector('i');
    
    if (notificationText) {
        notificationText.textContent = message;
    }
    
    // Update icon based on type
    if (icon) {
        icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
    }
    
    notification.className = 'notification ' + type + ' show';
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

/**
 * Fetch API dengan FormData
 */
async function fetchAPI(action, data = {}, file = null) {
    try {
        const formData = new FormData();
        formData.append('action', action);
        
        for (const [key, value] of Object.entries(data)) {
            if (value !== null && value !== undefined) {
                formData.append(key, value);
            }
        }
        
        if (file) {
            formData.append('video', file);
        }
        
        const response = await fetch(API_URL, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get movies dari JSON file atau localStorage
 */
async function getMoviesFromJSON() {
    try {
        // Coba fetch dari file JSON
        const response = await fetch(MOVIES_JSON + '?t=' + Date.now());
        if (response.ok) {
            const data = await response.json();
            return data.movies || [];
        }
    } catch (error) {
        console.log('Fetching from JSON failed, using localStorage');
    }
    
    // Fallback ke localStorage
    return JSON.parse(localStorage.getItem('movies') || '[]');
}

/**
 * Save movies ke localStorage
 */
function saveMoviesToLocalStorage(movies) {
    localStorage.setItem('movies', JSON.stringify(movies));
}

/**
 * Generate unique ID
 */
function generateId() {
    return 'mov_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ==================== TAB NAVIGATION ====================

/**
 * Initialize tab navigation
 */
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            
            // Update active tab button
            tabButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            // Update active tab content
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            
            const targetContent = document.getElementById(tabId);
            if (targetContent) {
                targetContent.classList.add('active');
            }
            
            // Load data berdasarkan tab
            switch(tabId) {
                case 'manage-movies':
                    loadMoviesTable();
                    break;
                case 'upload-video':
                case 'add-source':
                    loadMovieSelects();
                    break;
            }
        });
    });
}

// ==================== MOVIE SELECT DROPDOWN ====================

/**
 * Load semua select dropdown dengan daftar film
 */
async function loadMovieSelects() {
    const movies = await getMoviesFromJSON();
    const selects = document.querySelectorAll('select[name="movie_id"]');
    
    const optionsHTML = `
        <option value="">-- Pilih Film --</option>
        ${movies.map(movie => `
            <option value="${movie.id}">${movie.title} (${movie.year || 'N/A'})</option>
        `).join('')}
    `;
    
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = optionsHTML;
        if (currentValue) {
            select.value = currentValue;
        }
    });
}

// ==================== ADD MOVIE FORM ====================

/**
 * Initialize form tambah movie
 */
function initAddMovieForm() {
    const form = document.getElementById('addMovieForm');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
        submitBtn.disabled = true;
        
        try {
            const formData = new FormData(form);
            const movieData = {
                id: generateId(),
                title: formData.get('title') || '',
                alternative_title: formData.get('alternative_title') || '',
                description: formData.get('description') || '',
                poster: formData.get('poster') || '',
                backdrop: formData.get('backdrop') || '',
                year: formData.get('year') || '',
                duration: formData.get('duration') || '',
                rating: formData.get('rating') || '',
                genres: formData.get('genres') ? formData.get('genres').split(',').map(g => g.trim()).filter(g => g) : [],
                type: formData.get('type') || 'movie',
                status: formData.get('status') || 'completed',
                sources: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            // Validasi
            if (!movieData.title) {
                showNotification('Judul film harus diisi!', 'error');
                return;
            }
            
            if (!movieData.poster) {
                showNotification('URL poster harus diisi!', 'error');
                return;
            }
            
            // Coba save via API
            try {
                const result = await fetchAPI('add_movie', movieData);
                if (result.success) {
                    showNotification('Film berhasil ditambahkan!');
                    form.reset();
                    loadMovieSelects();
                    return;
                }
            } catch (apiError) {
                console.log('API not available, saving locally');
            }
            
            // Fallback: Save ke localStorage
            let movies = JSON.parse(localStorage.getItem('movies') || '[]');
            movies.unshift(movieData); // Tambah di awal
            saveMoviesToLocalStorage(movies);
            
            showNotification('Film berhasil ditambahkan!');
            form.reset();
            loadMovieSelects();
            
            // Tampilkan opsi download JSON
            showJSONDownloadOption(movies);
            
        } catch (error) {
            console.error('Error adding movie:', error);
            showNotification('Gagal menambahkan film: ' + error.message, 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

/**
 * Tampilkan opsi download JSON setelah save
 */
function showJSONDownloadOption(movies) {
    const existingAlert = document.querySelector('.json-download-alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    const data = { movies: movies };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const alertDiv = document.createElement('div');
    alertDiv.className = 'info-text json-download-alert';
    alertDiv.style.marginTop = '20px';
    alertDiv.innerHTML = `
        <strong><i class="fas fa-download"></i> Download Updated JSON</strong><br><br>
        Data tersimpan di browser. Untuk update website:<br>
        <a href="${url}" download="movies.json" class="btn-primary" style="display: inline-block; margin-top: 10px; padding: 10px 20px; font-size: 0.9rem;">
            <i class="fas fa-download"></i> Download movies.json
        </a>
        <br><br>
        <small>Upload file ini ke folder <code>data/</code> di hosting Anda</small>
    `;
    
    const form = document.getElementById('addMovieForm');
    if (form) {
        form.after(alertDiv);
    }
}

// ==================== UPLOAD VIDEO FORM ====================

/**
 * Initialize form upload video
 */
function initUploadVideoForm() {
    const form = document.getElementById('uploadVideoForm');
    if (!form) return;
    
    // File input handling
    const fileInput = document.getElementById('videoFile');
    const fileLabel = document.querySelector('.file-upload-label');
    
    if (fileInput && fileLabel) {
        const originalLabelHTML = fileLabel.innerHTML;
        
        fileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                const file = this.files[0];
                const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
                fileLabel.innerHTML = `
                    <i class="fas fa-file-video" style="color: var(--success);"></i>
                    <p><strong>${file.name}</strong></p>
                    <span>${sizeMB} MB - ${file.type}</span>
                `;
            } else {
                fileLabel.innerHTML = originalLabelHTML;
            }
        });
        
        // Drag and drop
        const fileUpload = document.querySelector('.file-upload');
        if (fileUpload) {
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                fileUpload.addEventListener(eventName, preventDefaults, false);
            });
            
            function preventDefaults(e) {
                e.preventDefault();
                e.stopPropagation();
            }
            
            ['dragenter', 'dragover'].forEach(eventName => {
                fileUpload.addEventListener(eventName, () => {
                    fileLabel.style.borderColor = 'var(--primary)';
                    fileLabel.style.background = 'rgba(229, 9, 20, 0.1)';
                });
            });
            
            ['dragleave', 'drop'].forEach(eventName => {
                fileUpload.addEventListener(eventName, () => {
                    fileLabel.style.borderColor = '';
                    fileLabel.style.background = '';
                });
            });
            
            fileUpload.addEventListener('drop', (e) => {
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    fileInput.files = files;
                    fileInput.dispatchEvent(new Event('change'));
                }
            });
        }
    }
    
    // Form submit
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const movieId = form.querySelector('[name="movie_id"]').value;
        const provider = form.querySelector('[name="provider"]').value;
        const quality = form.querySelector('[name="quality"]').value;
        const videoFile = fileInput?.files[0];
        
        if (!movieId) {
            showNotification('Pilih film terlebih dahulu!', 'error');
            return;
        }
        
        if (!videoFile) {
            showNotification('Pilih file video terlebih dahulu!', 'error');
            return;
        }
        
        // Cek ukuran file (max 2GB)
        if (videoFile.size > 2 * 1024 * 1024 * 1024) {
            showNotification('Ukuran file maksimal 2GB!', 'error');
            return;
        }
        
        // Show progress
        const progressDiv = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const submitBtn = form.querySelector('button[type="submit"]');
        
        if (progressDiv) progressDiv.style.display = 'block';
        if (submitBtn) submitBtn.disabled = true;
        
        // Upload dengan XMLHttpRequest untuk tracking progress
        const xhr = new XMLHttpRequest();
        const formData = new FormData();
        formData.append('action', 'upload');
        formData.append('video', videoFile);
        formData.append('movie_id', movieId);
        formData.append('provider', provider);
        formData.append('quality', quality);
        
        xhr.upload.addEventListener('progress', function(e) {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                if (progressFill) progressFill.style.width = percent + '%';
                if (progressText) progressText.textContent = `Uploading... ${percent}%`;
            }
        });
        
        xhr.addEventListener('load', function() {
            if (progressDiv) progressDiv.style.display = 'none';
            if (submitBtn) submitBtn.disabled = false;
            if (progressFill) progressFill.style.width = '0%';
            
            try {
                const result = JSON.parse(xhr.responseText);
                if (result.success) {
                    showNotification('Video berhasil diupload!');
                    form.reset();
                    if (fileLabel) fileLabel.innerHTML = originalLabelHTML;
                } else {
                    showNotification(result.error || 'Gagal upload video', 'error');
                }
            } catch (error) {
                showNotification('Terjadi kesalahan saat upload', 'error');
            }
        });
        
        xhr.addEventListener('error', function() {
            if (progressDiv) progressDiv.style.display = 'none';
            if (submitBtn) submitBtn.disabled = false;
            showNotification('Koneksi gagal. Pastikan server PHP aktif.', 'error');
        });
        
        xhr.addEventListener('abort', function() {
            if (progressDiv) progressDiv.style.display = 'none';
            if (submitBtn) submitBtn.disabled = false;
            showNotification('Upload dibatalkan', 'error');
        });
        
        xhr.open('POST', API_URL);
        xhr.send(formData);
    });
}

// ==================== UPLOAD FROM URL FORM ====================

/**
 * Initialize form upload dari URL
 */
function initUploadUrlForm() {
    const form = document.getElementById('uploadUrlForm');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
        submitBtn.disabled = true;
        
        try {
            const formData = new FormData(form);
            const data = {
                movie_id: formData.get('movie_id'),
                url: formData.get('url'),
                provider: formData.get('provider'),
                quality: formData.get('quality') || '720p'
            };
            
            if (!data.movie_id) {
                showNotification('Pilih film terlebih dahulu!', 'error');
                return;
            }
            
            if (!data.url) {
                showNotification('URL video harus diisi!', 'error');
                return;
            }
            
            const result = await fetchAPI('upload_url', data);
            
            if (result.success) {
                showNotification('Remote upload sedang diproses! Cek status di dashboard provider.');
                form.reset();
            } else {
                showNotification(result.error || 'Gagal upload dari URL', 'error');
            }
        } catch (error) {
            showNotification('Terjadi kesalahan: ' + error.message, 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// ==================== ADD SOURCE FORM ====================

/**
 * Initialize form tambah source manual
 */
function initAddSourceForm() {
    const form = document.getElementById('addSourceForm');
    if (!form) return;
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
        submitBtn.disabled = true;
        
        try {
            const formData = new FormData(form);
            const movieId = formData.get('movie_id');
            const sourceData = {
                provider: formData.get('provider') || 'other',
                embed_url: formData.get('embed_url') || '',
                download_url: formData.get('download_url') || '',
                quality: formData.get('quality') || '720p'
            };
            
            // Validasi
            if (!movieId) {
                showNotification('Pilih film terlebih dahulu!', 'error');
                return;
            }
            
            if (!sourceData.embed_url) {
                showNotification('Embed URL harus diisi!', 'error');
                return;
            }
            
            // Validasi URL
            try {
                new URL(sourceData.embed_url);
            } catch {
                showNotification('Format Embed URL tidak valid!', 'error');
                return;
            }
            
            // Coba save via API
            try {
                const result = await fetchAPI('add_source', { movie_id: movieId, ...sourceData });
                if (result.success) {
                    showNotification('Source berhasil ditambahkan!');
                    form.reset();
                    return;
                }
            } catch (apiError) {
                console.log('API not available, saving locally');
            }
            
            // Fallback: Save ke localStorage
            let movies = JSON.parse(localStorage.getItem('movies') || '[]');
            const movieIndex = movies.findIndex(m => m.id === movieId);
            
            if (movieIndex === -1) {
                showNotification('Film tidak ditemukan!', 'error');
                return;
            }
            
            if (!movies[movieIndex].sources) {
                movies[movieIndex].sources = [];
            }
            
            // Cek duplikat
            const isDuplicate = movies[movieIndex].sources.some(
                s => s.embed_url === sourceData.embed_url
            );
            
            if (isDuplicate) {
                showNotification('Source dengan URL ini sudah ada!', 'error');
                return;
            }
            
            movies[movieIndex].sources.push(sourceData);
            movies[movieIndex].updated_at = new Date().toISOString();
            
            saveMoviesToLocalStorage(movies);
            
            showNotification('Source berhasil ditambahkan!');
            form.reset();
            
            // Show download option
            showJSONDownloadOption(movies);
            
        } catch (error) {
            console.error('Error adding source:', error);
            showNotification('Gagal menambahkan source: ' + error.message, 'error');
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    });
}

// ==================== MOVIES TABLE ====================

/**
 * Load dan tampilkan tabel film
 */
async function loadMoviesTable() {
    const tableBody = document.querySelector('#moviesTable tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 40px;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--primary);"></i>
                <p style="margin-top: 10px; color: var(--text-muted);">Memuat data...</p>
            </td>
        </tr>
    `;
    
    try {
        // Get dari JSON dan localStorage
        let movies = [];
        
        try {
            const jsonMovies = await getMoviesFromJSON();
            movies = [...jsonMovies];
        } catch (e) {
            console.log('Could not load from JSON');
        }
        
        // Merge dengan localStorage
        const localMovies = JSON.parse(localStorage.getItem('movies') || '[]');
        localMovies.forEach(lm => {
            if (!movies.find(m => m.id === lm.id)) {
                movies.push(lm);
            }
        });
        
        // Sort by created_at descending
        movies.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        
        if (movies.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 40px;">
                        <i class="fas fa-film" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 15px;"></i>
                        <p style="color: var(--text-muted);">Belum ada film. Tambahkan film pertama Anda!</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tableBody.innerHTML = movies.map(movie => `
            <tr data-id="${movie.id}">
                <td>
                    <img src="${movie.poster || 'https://via.placeholder.com/60x80/1f1f1f/808080?text=No+Image'}" 
                         alt="${movie.title}"
                         style="width: 60px; height: 80px; object-fit: cover; border-radius: 5px;"
                         onerror="this.src='https://via.placeholder.com/60x80/1f1f1f/808080?text=No+Image'">
                </td>
                <td>
                    <strong>${escapeHtml(movie.title)}</strong>
                    ${movie.alternative_title ? `<br><small style="color: var(--text-muted);">${escapeHtml(movie.alternative_title)}</small>` : ''}
                    <br><small style="color: var(--text-muted);">${movie.year || '-'}</small>
                </td>
                <td>
                    <span class="type-badge" style="font-size: 0.75rem; padding: 4px 10px; display: inline-block;">
                        ${movie.type === 'series' ? 'Series' : 'Movie'}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${movie.status || 'completed'}" style="font-size: 0.75rem; padding: 4px 10px; display: inline-block;">
                        ${movie.status === 'ongoing' ? 'Ongoing' : 'Completed'}
                    </span>
                </td>
                <td>
                    <span style="display: flex; align-items: center; gap: 5px;">
                        <i class="fas fa-server" style="color: var(--primary);"></i>
                        ${movie.sources ? movie.sources.length : 0} server
                    </span>
                </td>
                <td>
                    <div class="actions" style="display: flex; gap: 8px;">
                        <button class="btn-edit" onclick="viewMovieSources('${movie.id}')" title="Lihat Sources">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-edit" onclick="editMovie('${movie.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" onclick="deleteMovie('${movie.id}')" title="Hapus">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
        
    } catch (error) {
        console.error('Error loading movies:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: var(--primary);">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>
                    <p>Gagal memuat data</p>
                </td>
            </tr>
        `;
    }
}

/**
 * Escape HTML untuk mencegah XSS
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== VIEW MOVIE SOURCES ====================

/**
 * Tampilkan modal sources dari film
 */
async function viewMovieSources(movieId) {
    const movies = await getMoviesFromJSON();
    const localMovies = JSON.parse(localStorage.getItem('movies') || '[]');
    const allMovies = [...movies];
    localMovies.forEach(lm => {
        if (!allMovies.find(m => m.id === lm.id)) {
            allMovies.push(lm);
        }
    });
    
    const movie = allMovies.find(m => m.id === movieId);
    
    if (!movie) {
        showNotification('Film tidak ditemukan!', 'error');
        return;
    }
    
    // Create modal
    let modal = document.getElementById('sourcesModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'sourcesModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }
    
    const sources = movie.sources || [];
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="fas fa-server"></i> Sources: ${escapeHtml(movie.title)}</h3>
                <button class="modal-close" onclick="closeModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                ${sources.length === 0 ? `
                    <p style="text-align: center; color: var(--text-muted); padding: 30px;">
                        Belum ada source untuk film ini
                    </p>
                ` : `
                    <div class="sources-list">
                        ${sources.map((source, index) => `
                            <div class="source-item">
                                <div class="source-info">
                                    <strong>${getProviderName(source.provider)}</strong>
                                    <span class="quality-badge">${source.quality}</span>
                                </div>
                                <div class="source-urls">
                                    <small>Embed: <a href="${source.embed_url}" target="_blank">${source.embed_url.substring(0, 50)}...</a></small>
                                    ${source.download_url ? `<br><small>Download: <a href="${source.download_url}" target="_blank">${source.download_url.substring(0, 50)}...</a></small>` : ''}
                                </div>
                                <button class="btn-delete" onclick="deleteSource('${movieId}', ${index})" title="Hapus Source">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                `}
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
    
    // Add styles jika belum ada
    if (!document.getElementById('modalStyles')) {
        const styles = document.createElement('style');
        styles.id = 'modalStyles';
        styles.textContent = `
            .modal-overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.8);
                z-index: 10000;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .modal-content {
                background: var(--bg-card);
                border-radius: var(--border-radius);
                max-width: 600px;
                width: 100%;
                max-height: 80vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
            }
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 20px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            .modal-header h3 {
                margin: 0;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .modal-close {
                background: none;
                border: none;
                color: var(--text-secondary);
                font-size: 1.5rem;
                cursor: pointer;
                padding: 5px;
            }
            .modal-close:hover {
                color: var(--primary);
            }
            .modal-body {
                padding: 20px;
                overflow-y: auto;
            }
            .sources-list {
                display: flex;
                flex-direction: column;
                gap: 15px;
            }
            .source-item {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 15px;
                background: rgba(255,255,255,0.05);
                border-radius: var(--border-radius);
            }
            .source-info {
                display: flex;
                flex-direction: column;
                gap: 5px;
                min-width: 100px;
            }
            .quality-badge {
                background: var(--primary);
                padding: 2px 8px;
                border-radius: 10px;
                font-size: 0.75rem;
                display: inline-block;
                width: fit-content;
            }
            .source-urls {
                flex: 1;
                word-break: break-all;
            }
            .source-urls a {
                color: var(--primary);
            }
        `;
        document.head.appendChild(styles);
    }
}

/**
 * Tutup modal
 */
function closeModal() {
    const modal = document.getElementById('sourcesModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Get provider name
 */
function getProviderName(provider) {
    const names = {
        'doodstream': 'Doodstream',
        'streamtape': 'Streamtape',
        'gdrive': 'Google Drive',
        'mega': 'Mega',
        'fembed': 'Fembed',
        'mixdrop': 'Mixdrop',
        'streamsb': 'StreamSB',
        'other': 'Other'
    };
    return names[provider] || provider;
}

// ==================== DELETE SOURCE ====================

/**
 * Hapus source dari film
 */
async function deleteSource(movieId, sourceIndex) {
    if (!confirm('Hapus source ini?')) return;
    
    let movies = JSON.parse(localStorage.getItem('movies') || '[]');
    const movieIndex = movies.findIndex(m => m.id === movieId);
    
    if (movieIndex === -1) {
        showNotification('Film tidak ditemukan!', 'error');
        return;
    }
    
    if (!movies[movieIndex].sources || !movies[movieIndex].sources[sourceIndex]) {
        showNotification('Source tidak ditemukan!', 'error');
        return;
    }
    
    movies[movieIndex].sources.splice(sourceIndex, 1);
    movies[movieIndex].updated_at = new Date().toISOString();
    
    saveMoviesToLocalStorage(movies);
    showNotification('Source berhasil dihapus!');
    
    // Refresh modal
    viewMovieSources(movieId);
    loadMoviesTable();
    
    showJSONDownloadOption(movies);
}

// ==================== EDIT MOVIE ====================

/**
 * Edit movie (tampilkan form edit)
 */
async function editMovie(movieId) {
    const movies = await getMoviesFromJSON();
    const localMovies = JSON.parse(localStorage.getItem('movies') || '[]');
    const allMovies = [...movies];
    localMovies.forEach(lm => {
        if (!allMovies.find(m => m.id === lm.id)) {
            allMovies.push(lm);
        }
    });
    
    const movie = allMovies.find(m => m.id === movieId);
    
    if (!movie) {
        showNotification('Film tidak ditemukan!', 'error');
        return;
    }
    
    // Create modal
    let modal = document.getElementById('editModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'editModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <h3><i class="fas fa-edit"></i> Edit Film</h3>
                <button class="modal-close" onclick="closeEditModal()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <form id="editMovieForm" class="admin-form">
                    <input type="hidden" name="id" value="${movie.id}">
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Judul Film *</label>
                            <input type="text" name="title" value="${escapeHtml(movie.title)}" required>
                        </div>
                        <div class="form-group">
                            <label>Judul Alternatif</label>
                            <input type="text" name="alternative_title" value="${escapeHtml(movie.alternative_title || '')}">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Deskripsi</label>
                        <textarea name="description" rows="3">${escapeHtml(movie.description || '')}</textarea>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>URL Poster *</label>
                            <input type="url" name="poster" value="${movie.poster || ''}" required>
                        </div>
                        <div class="form-group">
                            <label>URL Backdrop</label>
                            <input type="url" name="backdrop" value="${movie.backdrop || ''}">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Tahun</label>
                            <input type="text" name="year" value="${movie.year || ''}">
                        </div>
                        <div class="form-group">
                            <label>Durasi</label>
                            <input type="text" name="duration" value="${movie.duration || ''}">
                        </div>
                        <div class="form-group">
                            <label>Rating</label>
                            <input type="text" name="rating" value="${movie.rating || ''}">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>Genre (pisah koma)</label>
                            <input type="text" name="genres" value="${(movie.genres || []).join(', ')}">
                        </div>
                        <div class="form-group">
                            <label>Tipe</label>
                            <select name="type">
                                <option value="movie" ${movie.type === 'movie' ? 'selected' : ''}>Movie</option>
                                <option value="series" ${movie.type === 'series' ? 'selected' : ''}>Series</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Status</label>
                            <select name="status">
                                <option value="completed" ${movie.status === 'completed' ? 'selected' : ''}>Completed</option>
                                <option value="ongoing" ${movie.status === 'ongoing' ? 'selected' : ''}>Ongoing</option>
                            </select>
                        </div>
                    </div>
                    
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-save"></i> Simpan Perubahan
                    </button>
                </form>
            </div>
        </div>
    `;
    
    modal.style.display = 'flex';
    
    // Handle form submit
    document.getElementById('editMovieForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const updatedMovie = {
            ...movie,
            title: formData.get('title'),
            alternative_title: formData.get('alternative_title'),
            description: formData.get('description'),
            poster: formData.get('poster'),
            backdrop: formData.get('backdrop'),
            year: formData.get('year'),
            duration: formData.get('duration'),
            rating: formData.get('rating'),
            genres: formData.get('genres').split(',').map(g => g.trim()).filter(g => g),
            type: formData.get('type'),
            status: formData.get('status'),
            updated_at: new Date().toISOString()
        };
        
        // Update di localStorage
        let localMovies = JSON.parse(localStorage.getItem('movies') || '[]');
        const localIndex = localMovies.findIndex(m => m.id === movieId);
        
        if (localIndex !== -1) {
            localMovies[localIndex] = updatedMovie;
        } else {
            localMovies.push(updatedMovie);
        }
        
        saveMoviesToLocalStorage(localMovies);
        showNotification('Film berhasil diupdate!');
        closeEditModal();
        loadMoviesTable();
        
        showJSONDownloadOption(localMovies);
    });
}

/**
 * Tutup edit modal
 */
function closeEditModal() {
    const modal = document.getElementById('editModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// ==================== DELETE MOVIE ====================

/**
 * Hapus film
 */
async function deleteMovie(movieId) {
    if (!confirm('Apakah Anda yakin ingin menghapus film ini?\n\nSemua source juga akan dihapus!')) {
        return;
    }
    
    try {
        // Coba hapus via API
        const result = await fetchAPI('delete_movie', { id: movieId });
        
        if (result.success) {
            showNotification('Film berhasil dihapus!');
            loadMoviesTable();
            loadMovieSelects();
            return;
        }
    } catch (error) {
        console.log('API not available, deleting locally');
    }
    
    // Fallback: Hapus dari localStorage
    let movies = JSON.parse(localStorage.getItem('movies') || '[]');
    movies = movies.filter(m => m.id !== movieId);
    saveMoviesToLocalStorage(movies);
    
    showNotification('Film berhasil dihapus!');
    loadMoviesTable();
    loadMovieSelects();
    
    if (movies.length > 0) {
        showJSONDownloadOption(movies);
    }
}

// ==================== EXPORT / IMPORT ====================

/**
 * Initialize export button
 */
function initExportImport() {
    const manageTab = document.getElementById('manage-movies');
    if (!manageTab) return;
    
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;';
    buttonContainer.innerHTML = `
        <button class="btn-primary" onclick="exportMoviesJSON()" style="background: var(--success);">
            <i class="fas fa-download"></i> Export JSON
        </button>
        <label class="btn-primary" style="background: var(--secondary); cursor: pointer;">
            <i class="fas fa-upload"></i> Import JSON
            <input type="file" id="importFileInput" accept=".json" style="display: none;">
        </label>
        <button class="btn-primary" onclick="clearLocalStorage()" style="background: var(--primary);">
            <i class="fas fa-trash"></i> Clear Local Data
        </button>
    `;
    
    const h2 = manageTab.querySelector('h2');
    if (h2) {
        h2.after(buttonContainer);
    }
    
    // Import handler
    document.getElementById('importFileInput')?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const data = JSON.parse(event.target.result);
                
                if (!data.movies || !Array.isArray(data.movies)) {
                    showNotification('Format JSON tidak valid! Harus memiliki array "movies"', 'error');
                    return;
                }
                
                // Merge dengan existing
                let existingMovies = JSON.parse(localStorage.getItem('movies') || '[]');
                let importedCount = 0;
                
                data.movies.forEach(movie => {
                    if (!existingMovies.find(m => m.id === movie.id)) {
                        existingMovies.push(movie);
                        importedCount++;
                    }
                });
                
                saveMoviesToLocalStorage(existingMovies);
                showNotification(`${importedCount} film berhasil di-import!`);
                loadMoviesTable();
                loadMovieSelects();
                
            } catch (error) {
                showNotification('Gagal membaca file JSON: ' + error.message, 'error');
            }
        };
        reader.readAsText(file);
        
        // Reset input
        this.value = '';
    });
}

/**
 * Export movies ke JSON file
 */
async function exportMoviesJSON() {
    try {
        // Gabungkan dari JSON dan localStorage
        let movies = [];
        
        try {
            const jsonMovies = await getMoviesFromJSON();
            movies = [...jsonMovies];
        } catch (e) {}
        
        const localMovies = JSON.parse(localStorage.getItem('movies') || '[]');
        localMovies.forEach(lm => {
            const existingIndex = movies.findIndex(m => m.id === lm.id);
            if (existingIndex !== -1) {
                // Update existing dengan local (local lebih baru)
                movies[existingIndex] = lm;
            } else {
                movies.push(lm);
            }
        });
        
        if (movies.length === 0) {
            showNotification('Tidak ada data untuk di-export!', 'error');
            return;
        }
        
        // Sort by created_at
        movies.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        
        const data = { movies: movies };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'movies.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showNotification(`${movies.length} film berhasil di-export!`);
        
    } catch (error) {
        showNotification('Gagal export: ' + error.message, 'error');
    }
}

/**
 * Clear localStorage
 */
function clearLocalStorage() {
    if (!confirm('Hapus semua data lokal?\n\nData di file movies.json tidak akan terpengaruh.')) {
        return;
    }
    
    localStorage.removeItem('movies');
    showNotification('Data lokal berhasil dihapus!');
    loadMoviesTable();
    loadMovieSelects();
}

// ==================== CLOSE MODAL ON OUTSIDE CLICK ====================

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.style.display = 'none';
    }
});

// ==================== INITIALIZE ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin Panel Initialized');
    
    // Initialize semua komponen
    initTabs();
    initAddMovieForm();
    initUploadVideoForm();
    initUploadUrlForm();
    initAddSourceForm();
    initExportImport();
    
    // Load initial data
    loadMovieSelects();
    
    // Load movies table jika tab aktif
    const activeTab = document.querySelector('.tab-content.active');
    if (activeTab && activeTab.id === 'manage-movies') {
        loadMoviesTable();
    }
});

// ==================== GLOBAL FUNCTIONS ====================

window.viewMovieSources = viewMovieSources;
window.editMovie = editMovie;
window.deleteMovie = deleteMovie;
window.deleteSource = deleteSource;
window.closeModal = closeModal;
window.closeEditModal = closeEditModal;
window.exportMoviesJSON = exportMoviesJSON;
window.clearLocalStorage = clearLocalStorage;
