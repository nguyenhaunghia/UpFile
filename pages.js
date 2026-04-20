// ============================================================
// 6. LOGIN LOGIC
// ============================================================
function handleLoginPage() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;
    if (localStorage.getItem('upfile_user')) window.location.href = 'index.html';

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('username').value.trim();
        const p = document.getElementById('password').value.trim();
        showLoading('Đang xác thực...');
        try {
            const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'login', username: u, password: p }) });
            const result = await response.json();
            hideLoading();
            if (result.status === 'success') {
                const user = result.user;
                showToast(`Xin chào ${user.Name}`, 'success');
                if (user.Password === 'A12345678!') {
                    document.getElementById('changePassModal').classList.add('show');
                    localStorage.setItem('temp_user_id', user.UserID);
                } else {
                    localStorage.setItem('upfile_user', JSON.stringify(user));
                    setTimeout(() => window.location.href = 'index.html', 1000);
                }
            } else { showToast(result.message || 'Đăng nhập thất bại', 'error'); }
        } catch (err) { hideLoading(); showToast('Lỗi kết nối server!', 'error'); }
    });

    const changeForm = document.getElementById('changePassForm');
    if (changeForm) {
        changeForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Chức năng đổi mật khẩu cần gọi API (Chưa cài đặt Backend).');
        });
    }
}

async function handleCredentialResponse(response) {
    showLoading('Đang xác thực Google...');
    try {
        const apiResponse = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'googleLogin', token: response.credential }) });
        const result = await apiResponse.json();
        hideLoading();
        if (result.status === 'success') {
            const user = result.user;
            showToast(`Xin chào ${user.Name}`, 'success');
            localStorage.setItem('upfile_user', JSON.stringify(user));
            setTimeout(() => window.location.href = 'index.html', 1000);
        } else { showToast(result.message, 'error'); }
    } catch (err) { hideLoading(); showToast('Lỗi kết nối server!', 'error'); }
}

// ============================================================
// 7. LOGIC TRANG PHÂN CÔNG (ASSIGN.HTML)
// ============================================================

async function initAssignPage() {
    checkAuth();
    showLoading('Đang tải dữ liệu...');
    
    const data = await fetchData();
    hideLoading();
    if (!data) return;

    fillSelect('selYear', data.SchoolYear, 'SchoolYearID', 'SchoolYearName');
    fillSelect('selFolder', data.Folder, 'FolderID', 'FolderName');
    fillSelect('selSubject', data.Subject, 'SubjectID', 'SubjectName');
    fillSelect('selBlock', data.Block, 'BlockID', 'BlockName');
    fillSelect('selObject', data.Object, 'ObjectID', 'ObjectName');

    const teachers = data.User.filter(u => u.Permissions !== 'Admin');
    const docTypes = data.DocType;

    renderTeacherTable(teachers, docTypes);

    document.querySelectorAll('.required-select').forEach(sel => {
        sel.addEventListener('change', checkPart1Status);
    });
    document.getElementById('teacherBody').addEventListener('change', checkPart2Status);
}

function checkPart1Status() {
    const year = document.getElementById('selYear').value;
    const folder = document.getElementById('selFolder').value;
    const subject = document.getElementById('selSubject').value;
    const block = document.getElementById('selBlock').value;
    const object = document.getElementById('selObject').value;
    const part2 = document.getElementById('part2Container');
    const btnSave = document.getElementById('btnSave');

    if (year && folder && subject && block && object) {
        part2.classList.remove('section-disabled');
    } else {
        part2.classList.add('section-disabled');
        btnSave.disabled = true;
    }
}

function checkPart2Status() {
    const btnSave = document.getElementById('btnSave');
    let hasSelection = false;
    const rows = document.querySelectorAll('#teacherBody tr');

    for (let row of rows) {
        const teacherChk = row.querySelector('.chk-teacher-row');
        if (teacherChk && teacherChk.checked) {
            const docChecked = row.querySelector('.chk-doctype:checked');
            if (docChecked) {
                hasSelection = true; break;
            }
        }
    }
    btnSave.disabled = !hasSelection;
}

function fillSelect(elementId, dataArray, valueKey, textKey) {
    const sel = document.getElementById(elementId);
    if(!sel) return;
    sel.innerHTML = '<option value="">-- Chọn --</option>';
    if(dataArray) {
        dataArray.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item[valueKey]; opt.innerText = item[textKey];
            sel.appendChild(opt);
        });
    }
}

function renderTeacherTable(teachers, docTypes) {
    const tbody = document.getElementById('teacherBody');
    if(!tbody) return;
    tbody.innerHTML = '';

    teachers.forEach(t => {
        const tr = document.createElement('tr');
        
        let docTypeHtml = `<div class="doctype-grid">`;
        docTypes.forEach(dt => {
            const uniqueID = `chk-${t.UserID}-${dt.DocTypeID}`;
            docTypeHtml += `
                <div class="doctype-chip">
                    <input type="checkbox" id="${uniqueID}" class="chk-doctype" value="${dt.DocTypeID}" data-teacher="${t.UserID}">
                    <label for="${uniqueID}">${dt.DocTypeName}</label>
                </div>
            `;
        });
        docTypeHtml += `</div>`;

        let supervisorHtml = `
            <div class="multi-select-container">
                <div class="multi-select-btn" onclick="this.nextElementSibling.classList.toggle('show'); event.stopPropagation();">
                    <span class="sel-text">Chọn GS...</span> <span>▼</span>
                </div>
                <div class="multi-select-dropdown" onclick="event.stopPropagation();">
        `;
        teachers.forEach(gs => {
            if (gs.UserID !== t.UserID) { 
                const chkId = `gs-${t.UserID}-${gs.UserID}`;
                supervisorHtml += `
                    <label class="multi-select-item" for="${chkId}">
                        <input type="checkbox" id="${chkId}" class="chk-supervisor" value="${gs.UserID}">
                        ${gs.Name}
                    </label>
                `;
            }
        });
        supervisorHtml += `</div></div>`;

        tr.innerHTML = `
            <td style="text-align:center;">
                <input type="checkbox" class="chk-teacher-row" value="${t.UserID}">
            </td>
            <td>
                <div style="font-weight:600; color:var(--primary);">${t.Name}</div>
                <div class="text-muted" style="font-size:0.8rem;">${t.Account}</div>
            </td>
            <td>${docTypeHtml}</td>
            <td>${supervisorHtml}</td>
        `;
        tbody.appendChild(tr);
    });

    document.querySelectorAll('.chk-teacher-row').forEach(chk => {
        chk.addEventListener('change', function() {
            const row = this.closest('tr');
            const docChecks = row.querySelectorAll('.chk-doctype');
            docChecks.forEach(d => d.checked = this.checked);
            checkPart2Status();
        });
    });

    document.querySelectorAll('.chk-supervisor').forEach(chk => {
        chk.addEventListener('change', function() {
            const container = this.closest('.multi-select-container');
            const checked = container.querySelectorAll('.chk-supervisor:checked');
            const textSpan = container.querySelector('.sel-text');
            textSpan.innerHTML = checked.length === 0 ? 'Chọn GS...' : `<b style="color:var(--primary)">Đã chọn (${checked.length})</b>`;
        });
    });

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.multi-select-container')) {
            document.querySelectorAll('.multi-select-dropdown.show').forEach(d => d.classList.remove('show'));
        }
    });
}

async function handleSaveAssign() {
    const year = document.getElementById('selYear').value;
    const folder = document.getElementById('selFolder').value;
    const subject = document.getElementById('selSubject').value;
    const block = document.getElementById('selBlock').value;
    const object = document.getElementById('selObject').value;

    let assignments = [];
    const rows = document.querySelectorAll('#teacherBody tr');

    rows.forEach(row => {
        const teacherChk = row.querySelector('.chk-teacher-row');
        if (teacherChk && teacherChk.checked) {
            const teacherID = teacherChk.value;
            const docTypeChks = row.querySelectorAll('.chk-doctype:checked');
            
            const supervisorChks = row.querySelectorAll('.chk-supervisor:checked');
            const previewers = Array.from(supervisorChks).map(c => c.value).join(',');

            docTypeChks.forEach(dt => {
                assignments.push({
                    SchoolYearID: year, FolderID: folder,
                    SubjectID: subject, BlockID: block,
                    ObjectID: object, TeacherID: teacherID,
                    DocTypeID: dt.value,
                    AccountPreview: previewers 
                });
            });
        }
    });

    if (assignments.length === 0) { 
        showToast('Chưa chọn giáo viên hoặc nội dung nào!', 'error'); 
        return; 
    }

    const isAgree = await sysConfirm(
        "Xác nhận Lưu",
        `Bạn sắp phân công <b>${assignments.length}</b> nhiệm vụ cho giáo viên.<br>Dữ liệu sẽ được ghi nhận vào hệ thống.`
    );

    if (!isAgree) return; 

    showLoading('Đang lưu phân công...');
    try {
        const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'assignTasks', assignments: assignments }) });
        const result = await response.json();
        hideLoading();
        if (result.status === 'success') {
            showToast(`Đã tạo thành công ${result.count} mục phân công!`, 'success');
            document.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
            document.querySelectorAll('.sel-text').forEach(el => el.innerHTML = 'Chọn GS...');
            checkPart2Status();
        } else { 
            showToast('Lỗi: ' + result.message, 'error'); 
        }
    } catch (e) { 
        hideLoading(); 
        showToast('Lỗi kết nối server', 'error'); 
    }
}