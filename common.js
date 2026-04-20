const API_URL = 'https://script.google.com/macros/s/AKfycbx5XX2B1axnps6JpIGhhFQM6EHOpDf_13NOvs04CZbQCsTRD7cmiXdeuUgBz4Sjx6R6/exec'; 

let appState = {
    allData: {}
};

const ICONS = {
    'Năm học': '🗓️',
    'Kỳ': '📂',
    'Môn': '📘',
    'Khối': '🏗️',
    'Đối tượng': '👥',
    'Giáo viên': '👤'
};

// ============================================================
// 1. CÁC HÀM UI CƠ BẢN
// ============================================================

function showLoading(msg = 'Đang xử lý...') {
    let overlay = document.querySelector('.loading-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'loading-overlay';
        overlay.innerHTML = `<div class="spinner"></div><div class="loading-text" id="loadingText"></div>`;
        document.body.appendChild(overlay);
    }
    document.getElementById('loadingText').innerText = msg;
    overlay.classList.add('active');
}

function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) overlay.classList.remove('active');
}

function showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = '🔔';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '❌';

    toast.innerHTML = `<i>${icon}</i><span class="toast-message">${message}</span><span class="toast-close" onclick="this.parentElement.remove()">✕</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s forwards';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// --- SYSTEM MODAL (CHỈ DÙNG ĐỂ XÁC NHẬN) ---
function initSystemModal() {
    if (document.getElementById('sys-modal')) return;
    const modalHtml = `
    <div id="sys-modal" class="modal" style="z-index: 99999;">
        <div class="sys-modal-box">
            <div id="sys-icon" class="sys-modal-icon-box sys-type-warning">❓</div>
            <h3 id="sys-title" class="sys-modal-title">Xác nhận</h3>
            <p id="sys-msg" class="sys-modal-msg">...</p>
            <div class="sys-modal-actions">
                <button id="sys-btn-cancel" class="btn btn-secondary">Hủy bỏ</button>
                <button id="sys-btn-ok" class="btn btn-primary">Đồng ý</button>
            </div>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}
initSystemModal();

function sysConfirm(title, msg) {
    return new Promise((resolve) => {
        const modal = document.getElementById('sys-modal');
        const titleEl = document.getElementById('sys-title');
        const msgEl = document.getElementById('sys-msg');
        const btnOk = document.getElementById('sys-btn-ok');
        const btnCancel = document.getElementById('sys-btn-cancel');

        titleEl.innerText = title;
        msgEl.innerHTML = msg;
        
        modal.classList.add('show');

        btnOk.onclick = () => { modal.classList.remove('show'); resolve(true); };
        btnCancel.onclick = () => { modal.classList.remove('show'); resolve(false); };
    });
}

// ============================================================
// 2. HELPER & AUTH
// ============================================================

function createAccordion(title, label, level) {
    const div = document.createElement('div');
    div.className = `level-group level-${level}`;
    const icon = ICONS[label] || label; 
    div.innerHTML = `
        <div class="level-header" onclick="this.classList.toggle('active'); this.nextElementSibling.classList.toggle('show')">
            <span style="display:flex; align-items:center; gap:10px;">
                <span style="font-size:1.2rem;">${icon}</span> 
                <span>${title}</span>
            </span>
            <small>▼</small>
        </div>
        <div class="level-content"></div>
    `;
    return div;
}

function checkAuth() {
    const userStr = localStorage.getItem('upfile_user');
    if (!userStr) {
        if (!window.location.pathname.includes('login.html')) window.location.href = 'login.html';
        return;
    }
    const user = JSON.parse(userStr);
    const nameEl = document.getElementById('displayUserName');
    if(nameEl) nameEl.innerText = user.Name;
    const roleEl = document.getElementById('displayUserRole');
    if (roleEl) {
        roleEl.innerText = user.Permissions;
        roleEl.className = user.Permissions === 'Admin' ? 'user-role-badge admin' : 'user-role-badge';
    }
    const avatarEl = document.getElementById('userAvatar');
    if(avatarEl) avatarEl.innerText = user.Name ? user.Name.charAt(0).toUpperCase() : 'U';
    const btnAssign = document.getElementById('btnAssign');
    if (btnAssign) {
        btnAssign.style.display = user.Permissions === 'Admin' ? 'inline-block' : 'none';
    }
}

function logout() {
    localStorage.removeItem('upfile_user');
    window.location.href = 'login.html';
}

async function fetchData() {
    try {
        const response = await fetch(API_URL + '?action=getData');
        return await response.json();
    } catch (error) {
        console.error("Lỗi kết nối:", error);
        showToast("Không thể tải dữ liệu.", "error");
        return null;
    }
}

// ============================================================
// 5. HELPER FUNCTIONS
// ============================================================
function updateStats(data) {
    const total = data.length;
    const done = data.filter(i => i.isUploaded).length;
    if(document.getElementById('statTotal')) document.getElementById('statTotal').innerText = total;
    if(document.getElementById('statDone')) document.getElementById('statDone').innerText = done;
    if(document.getElementById('statPending')) document.getElementById('statPending').innerText = total - done;
}
function groupBy(xs, key) { return xs.reduce(function(rv, x) { (rv[x[key]] = rv[x[key]] || []).push(x); return rv; }, {}); }
function findName(arr, idKey, idVal, nameKey) { if(!arr) return ''; const f = arr.find(x => x[idKey] == idVal); return f ? f[nameKey] : `(${idVal})`; }
function formatDate(dateStr) { if(!dateStr) return ''; const d = new Date(dateStr); return d.toLocaleDateString('vi-VN'); }
function formatDateTimeFull(dateStr) { if (!dateStr) return ''; const d = new Date(dateStr); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`; }