/**
 * 🎨 طلا یار - Mini App JavaScript
 * Telegram Mini App with real-time sync to database
 */

// ═══════════════════════════════════════════════════════════════
// 🔧 Configuration
// ═══════════════════════════════════════════════════════════════

const CONFIG = {
    API_BASE: 'https://your-worker-domain.com', // Update with your Cloudflare Worker URL
    POLLING_INTERVAL: 5000, // 5 seconds
    TOAST_DURATION: 3000, // 3 seconds
};

// ═══════════════════════════════════════════════════════════════
// 🌍 Telegram Web App API
// ═══════════════════════════════════════════════════════════════

const tg = window.Telegram.WebApp;

// Initialize Telegram Web App
if (tg) {
    tg.ready();
    tg.expand();
    tg.enableClosingConfirmation();

    // Set theme based on system preference
    if (tg.colorScheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
}

// ═══════════════════════════════════════════════════════════════
// 📱 State Management
// ═══════════════════════════════════════════════════════════════

let appState = {
    user: null,
    prices: { gold18: 0, gold24: 0 },
    portfolio: [],
    alerts: [],
    isDarkMode: localStorage.getItem('theme') === 'dark',
};

// ═══════════════════════════════════════════════════════════════
// 🎯 Initialize App
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', async () => {
    // Apply saved theme
    if (appState.isDarkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeButton();
    }

    // Get user data from Telegram
    const initData = tg?.initData;
    const userData = tg?.initDataUnsafe?.user;

    if (userData) {
        appState.user = userData;
        console.log('👤 User:', userData);
    } else {
        console.warn('⚠️ No user data from Telegram');
    }

    // Initialize event listeners
    initializeEventListeners();

    // Load initial data
    await loadInitialData();

    // Start polling for updates
    startPolling();
});

// ═══════════════════════════════════════════════════════════════
// 🎛️ Event Listeners
// ═══════════════════════════════════════════════════════════════

function initializeEventListeners() {
    // Theme Toggle
    document.getElementById('theme-toggle').addEventListener('click', toggleTheme);

    // Navigation Tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const tabName = e.currentTarget.dataset.tab;
            switchTab(tabName);
        });
    });

    // Portfolio Modal
    document.getElementById('add-portfolio-btn').addEventListener('click', openPortfolioModal);
    document.getElementById('add-portfolio-btn-2').addEventListener('click', openPortfolioModal);
    document.getElementById('portfolio-form').addEventListener('submit', handlePortfolioSubmit);

    // Alert Modal
    document.getElementById('add-alert-btn').addEventListener('click', openAlertModal);
    document.getElementById('add-alert-btn-2').addEventListener('click', openAlertModal);
    document.getElementById('alert-form').addEventListener('submit', handleAlertSubmit);

    // Modal Close
    document.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    // Profile Settings
    document.getElementById('notification-toggle').addEventListener('change', handleNotificationToggle);
    document.getElementById('notification-time').addEventListener('change', handleNotificationTimeChange);
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Close modals on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModals();
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════════
// 🏠 Tab Navigation
// ═══════════════════════════════════════════════════════════════

function switchTab(tabName) {
    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });

    // Reload tab data if needed
    if (tabName === 'portfolio') {
        loadPortfolio();
    } else if (tabName === 'prices') {
        loadPrices();
    } else if (tabName === 'alerts') {
        loadAlerts();
    } else if (tabName === 'profile') {
        loadProfile();
    }
}

// ═══════════════════════════════════════════════════════════════
// 🌙 Theme Management
// ═══════════════════════════════════════════════════════════════

function toggleTheme() {
    appState.isDarkMode = !appState.isDarkMode;
    document.documentElement.setAttribute(
        'data-theme',
        appState.isDarkMode ? 'dark' : 'light'
    );
    localStorage.setItem('theme', appState.isDarkMode ? 'dark' : 'light');
    updateThemeButton();
}

function updateThemeButton() {
    const btn = document.getElementById('theme-toggle');
    btn.querySelector('.theme-icon').textContent = appState.isDarkMode ? '☀️' : '🌙';
}

// ═══════════════════════════════════════════════════════════════
// 📊 Load Initial Data
// ═══════════════════════════════════════════════════════════════

async function loadInitialData() {
    try {
        await Promise.all([
            loadPrices(),
            loadPortfolio(),
            loadProfile(),
            loadStats()
        ]);
    } catch (error) {
        console.error('❌ Error loading initial data:', error);
        showToast('خطا در بارگیری داده‌ها', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════
// 💰 Load Prices
// ═══════════════════════════════════════════════════════════════

async function loadPrices() {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/api/gold-prices`, {
            headers: {
                'Authorization': `tg ${tg?.initData}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch prices');

        const data = await response.json();
        appState.prices = data;

        renderPrices();
        renderPriceDetails();
    } catch (error) {
        console.error('❌ Error loading prices:', error);
    }
}

function renderPrices() {
    const container = document.getElementById('prices-container');

    const html = `
        <div class="price-card">
            <div class="price-card-title">طلای 18 عیار</div>
            <div class="price-card-value">${formatNumber(appState.prices.gold18)}</div>
            <div class="price-card-change ${appState.prices.change18Percent >= 0 ? 'positive' : 'negative'}">
                ${appState.prices.change18Percent >= 0 ? '📈' : '📉'} 
                ${Math.abs(appState.prices.change18Percent)}%
            </div>
        </div>

        <div class="price-card">
            <div class="price-card-title">طلای 24 عیار</div>
            <div class="price-card-value">${formatNumber(appState.prices.gold24)}</div>
            <div class="price-card-change ${appState.prices.change24Percent >= 0 ? 'positive' : 'negative'}">
                ${appState.prices.change24Percent >= 0 ? '📈' : '📉'} 
                ${Math.abs(appState.prices.change24Percent)}%
            </div>
        </div>
    `;

    container.innerHTML = html;
}

function renderPriceDetails() {
    const container18 = document.getElementById('price-details-18');
    const container24 = document.getElementById('price-details-24');

    const html18 = `
        <div class="price-detail-title">طلای 18 عیار</div>
        <div class="price-detail-value">${formatNumber(appState.prices.gold18)}</div>
        <div class="price-detail-info">
            <div>تغییر: ${formatNumber(appState.prices.change18)} تومان</div>
            <div>درصد: ${appState.prices.change18Percent}%</div>
            <div>24 ساعت پیش: ${formatNumber(appState.prices.prev18)}</div>
        </div>
    `;

    const html24 = `
        <div class="price-detail-title">طلای 24 عیار</div>
        <div class="price-detail-value">${formatNumber(appState.prices.gold24)}</div>
        <div class="price-detail-info">
            <div>تغییر: ${formatNumber(appState.prices.change24)} تومان</div>
            <div>درصد: ${appState.prices.change24Percent}%</div>
            <div>24 ساعت پیش: ${formatNumber(appState.prices.prev24)}</div>
        </div>
    `;

    container18.innerHTML = html18;
    container24.innerHTML = html24;
}

// ═══════════════════════════════════════════════════════════════
// 💎 Load Portfolio
// ═══════════════════════════════════════════════════════════════

async function loadPortfolio() {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/api/portfolio`, {
            headers: {
                'Authorization': `tg ${tg?.initData}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch portfolio');

        const data = await response.json();
        appState.portfolio = data.items || [];

        renderPortfolio();
    } catch (error) {
        console.error('❌ Error loading portfolio:', error);
        showToast('خطا در بارگیری دارایی‌ها', 'error');
    }
}

function renderPortfolio() {
    const container = document.getElementById('portfolio-list');
    const emptyState = document.getElementById('empty-portfolio');

    if (appState.portfolio.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    container.style.display = 'flex';
    emptyState.style.display = 'none';

    const html = appState.portfolio.map(item => `
        <div class="portfolio-item">
            <div class="portfolio-item-info">
                <div class="portfolio-item-title">
                    ${item.goldType === '24' ? '🥇' : '🔶'} طلای ${item.goldType} عیار
                </div>
                <div class="portfolio-item-details">
                    <span>${item.weight} گرم</span>
                    <span>•</span>
                    <span>${item.purchaseDate}</span>
                </div>
            </div>
            <div>
                <div class="portfolio-item-value">${formatNumber(item.totalPaid)}</div>
                <div class="portfolio-item-actions">
                    <button class="icon-btn" onclick="editPortfolio(${item.id})">✏️</button>
                    <button class="icon-btn delete" onclick="deletePortfolio(${item.id})">🗑️</button>
                </div>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
// 🔔 Load Alerts
// ═══════════════════════════════════════════════════════════════

async function loadAlerts() {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/api/alerts`, {
            headers: {
                'Authorization': `tg ${tg?.initData}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch alerts');

        const data = await response.json();
        appState.alerts = data.alerts || [];

        renderAlerts();
    } catch (error) {
        console.error('❌ Error loading alerts:', error);
    }
}

function renderAlerts() {
    const container = document.getElementById('alerts-list');
    const emptyState = document.getElementById('empty-alerts');

    if (appState.alerts.length === 0) {
        container.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    container.style.display = 'flex';
    emptyState.style.display = 'none';

    const html = appState.alerts.map(alert => `
        <div class="alert-item">
            <div class="alert-item-info">
                <div class="alert-item-title">
                    ${alert.goldType === '24' ? '🥇' : '🔶'} طلای ${alert.goldType} عیار
                </div>
                <div class="alert-item-details">
                    <span>${alert.alertType === 'above' ? '⬆️ بالاتر' : '⬇️ پایین‌تر'}</span>
                    <span>•</span>
                    <span>${formatNumber(alert.targetPrice)}</span>
                    <span>•</span>
                    <span>${alert.isActive ? '✅ فعال' : '❌ غیرفعال'}</span>
                </div>
            </div>
            <div class="alert-item-actions">
                <button class="icon-btn" onclick="toggleAlert(${alert.id})">
                    ${alert.isActive ? '⏸️' : '▶️'}
                </button>
                <button class="icon-btn delete" onclick="deleteAlert(${alert.id})">🗑️</button>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
// 👤 Load Profile
// ═══════════════════════════════════════════════════════════════

async function loadProfile() {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/api/profile`, {
            headers: {
                'Authorization': `tg ${tg?.initData}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch profile');

        const data = await response.json();
        appState.user = { ...appState.user, ...data };

        renderProfile();
    } catch (error) {
        console.error('❌ Error loading profile:', error);
    }
}

function renderProfile() {
    const nameEl = document.getElementById('profile-name');
    const usernameEl = document.getElementById('profile-username');
    const notificationToggle = document.getElementById('notification-toggle');
    const notificationTime = document.getElementById('notification-time');

    const displayName = appState.user.first_name || 'کاربر';
    const displayUsername = appState.user.username ? `@${appState.user.username}` : 'بدون نام کاربری';

    nameEl.textContent = displayName;
    usernameEl.textContent = displayUsername;
    notificationToggle.checked = appState.user.notification_enabled;
    notificationTime.value = appState.user.notification_time || '00:00';

    const profileDetails = document.getElementById('profile-details');
    profileDetails.innerHTML = `
        <div class="profile-detail-item">
            <span>🆔 شناسه کاربر</span>
            <strong>${appState.user.user_id || appState.user.id}</strong>
        </div>
        <div class="profile-detail-item">
            <span>📅 تاریخ عضویت</span>
            <strong>${appState.user.created_at ? new Date(appState.user.created_at).toLocaleDateString('fa-IR') : '-'}</strong>
        </div>
        <div class="profile-detail-item">
            <span>💎 کل دارایی</span>
            <strong>${calculateTotalPortfolio()}</strong>
        </div>
    `;
}

// ═══════════════════════════════════════════════════════════════
// 📈 Load Stats
// ═══════════════════════════════════════════════════════════════

async function loadStats() {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/api/portfolio/stats`, {
            headers: {
                'Authorization': `tg ${tg?.initData}`
            }
        });

        if (!response.ok) throw new Error('Failed to fetch stats');

        const data = await response.json();
        renderStats(data);
    } catch (error) {
        console.error('❌ Error loading stats:', error);
    }
}

function renderStats(stats) {
    const container = document.getElementById('stats-container');

    const profit = stats.currentValue - stats.totalInvested;
    const profitPercent = stats.totalInvested > 0
        ? ((profit / stats.totalInvested) * 100).toFixed(2)
        : 0;

    const html = `
        <div class="stat-card">
            <div class="stat-icon">💰</div>
            <div class="stat-label">سرمایه</div>
            <div class="stat-value">${formatNumber(stats.totalInvested)}</div>
        </div>

        <div class="stat-card">
            <div class="stat-icon">💎</div>
            <div class="stat-label">ارزش فعلی</div>
            <div class="stat-value">${formatNumber(stats.currentValue)}</div>
        </div>

        <div class="stat-card">
            <div class="stat-icon">${profit >= 0 ? '📈' : '📉'}</div>
            <div class="stat-label">سود/زیان</div>
            <div class="stat-value" style="color: ${profit >= 0 ? '#10B981' : '#EF4444'}">
                ${formatNumber(Math.abs(profit))}
            </div>
        </div>
    `;

    container.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
// 📝 Modal Handlers
// ═══════════════════════════════════════════════════════════════

function openPortfolioModal() {
    document.getElementById('portfolio-modal').classList.add('active');
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('purchase-date').value = today;
}

function openAlertModal() {
    document.getElementById('alert-modal').classList.add('active');
}

function closeModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
}

// ═══════════════════════════════════════════════════════════════
// 💾 Form Submissions
// ═══════════════════════════════════════════════════════════════

async function handlePortfolioSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const payload = {
        goldType: formData.get('goldType'),
        weight: parseFloat(formData.get('weight')),
        purchasePrice: parseInt(formData.get('purchasePrice')),
        purchaseDate: formData.get('purchaseDate'),
        notes: formData.get('notes')
    };

    try {
        const response = await fetch(`${CONFIG.API_BASE}/api/portfolio/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `tg ${tg?.initData}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to add portfolio');

        const result = await response.json();

        showToast('✅ دارایی با موفقیت اضافه شد', 'success');
        closeModals();
        document.getElementById('portfolio-form').reset();

        // Notify bot user
        if (tg?.sendData) {
            tg.sendData(JSON.stringify({
                action: 'portfolio_added',
                data: result
            }));
        }

        // Reload portfolio
        await loadPortfolio();
    } catch (error) {
        console.error('❌ Error adding portfolio:', error);
        showToast('خطا در افزودن دارایی', 'error');
    }
}

async function handleAlertSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const payload = {
        goldType: formData.get('goldType'),
        alertType: formData.get('alertType'),
        targetPrice: parseInt(formData.get('targetPrice'))
    };

    try {
        const response = await fetch(`${CONFIG.API_BASE}/api/alerts/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `tg ${tg?.initData}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to add alert');

        const result = await response.json();

        showToast('✅ هشدار با موفقیت تنظیم شد', 'success');
        closeModals();
        document.getElementById('alert-form').reset();

        // Reload alerts
        await loadAlerts();
    } catch (error) {
        console.error('❌ Error adding alert:', error);
        showToast('خطا در تنظیم هشدار', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════
// 🔧 Actions
// ═══════════════════════════════════════════════════════════════

async function deletePortfolio(id) {
    if (!confirm('آیا مطمئن هستید؟')) return;

    try {
        const response = await fetch(`${CONFIG.API_BASE}/api/portfolio/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `tg ${tg?.initData}`
            }
        });

        if (!response.ok) throw new Error('Failed to delete');

        showToast('✅ دارایی حذف شد', 'success');
        await loadPortfolio();
    } catch (error) {
        console.error('❌ Error deleting portfolio:', error);
        showToast('خطا در حذف دارایی', 'error');
    }
}

async function deleteAlert(id) {
    if (!confirm('آیا مطمئن هستید؟')) return;

    try {
        const response = await fetch(`${CONFIG.API_BASE}/api/alerts/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `tg ${tg?.initData}`
            }
        });

        if (!response.ok) throw new Error('Failed to delete');

        showToast('✅ هشدار حذف شد', 'success');
        await loadAlerts();
    } catch (error) {
        console.error('❌ Error deleting alert:', error);
        showToast('خطا در حذف هشدار', 'error');
    }
}

async function toggleAlert(id) {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/api/alerts/${id}/toggle`, {
            method: 'POST',
            headers: {
                'Authorization': `tg ${tg?.initData}`
            }
        });

        if (!response.ok) throw new Error('Failed to toggle alert');

        showToast('✅ هشدار بروزرسانی شد', 'success');
        await loadAlerts();
    } catch (error) {
        console.error('❌ Error toggling alert:', error);
    }
}

async function handleNotificationToggle(e) {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/api/profile/notification`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `tg ${tg?.initData}`
            },
            body: JSON.stringify({
                enabled: e.target.checked
            })
        });

        if (!response.ok) throw new Error('Failed to update');

        showToast('✅ تنظیمات بروزرسانی شد', 'success');
    } catch (error) {
        console.error('❌ Error updating notification:', error);
    }
}

async function handleNotificationTimeChange(e) {
    try {
        const response = await fetch(`${CONFIG.API_BASE}/api/profile/notification-time`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `tg ${tg?.initData}`
            },
            body: JSON.stringify({
                time: e.target.value
            })
        });

        if (!response.ok) throw new Error('Failed to update');

        showToast('✅ زمان نوتیفیکیشن تغییر کرد', 'success');
    } catch (error) {
        console.error('❌ Error updating notification time:', error);
    }
}

async function handleLogout() {
    if (!confirm('آیا می‌خواهید خروج کنید؟')) return;

    try {
        // Clear local data
        localStorage.clear();
        sessionStorage.clear();

        // Close the mini app
        if (tg?.close) {
            tg.close();
        } else {
            window.location.href = '/';
        }
    } catch (error) {
        console.error('❌ Error during logout:', error);
    }
}

// ═══════════════════════════════════════════════════════════════
// 🔄 Polling & Real-time Updates
// ═══════════════════════════════════════════════════════════════

function startPolling() {
    setInterval(async () => {
        // Only poll prices for real-time updates
        await loadPrices();
    }, CONFIG.POLLING_INTERVAL);
}

// ═══════════════════════════════════════════════════════════════
// 🎨 Utilities
// ═══════════════════════════════════════════════════════════════

function formatNumber(num) {
    if (!num) return '۰';

    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
        .replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
}

function calculateTotalPortfolio() {
    const total = appState.portfolio.reduce((sum, item) => sum + item.totalPaid, 0);
    return `${formatNumber(total)} تومان`;
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, CONFIG.TOAST_DURATION);
}

// ═══════════════════════════════════════════════════════════════
// 📱 Telegram Mini App Methods
// ═══════════════════════════════════════════════════════════════

// Handle back button
if (tg?.BackButton) {
    tg.BackButton.onClick(() => {
        // Go back to default tab
        switchTab('home');
    });
}

// Handle main button (optional)
if (tg?.MainButton) {
    tg.MainButton.hide();
}

// Handle viewport changed
if (tg) {
    tg.onEvent('viewportChanged', () => {
        console.log('Viewport changed:', tg.viewportStableHeight);
    });
}

console.log('✅ Mini App initialized successfully');
