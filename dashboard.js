// ============================================================
// 3. ACTIONS (UPLOAD, DOWNLOAD, DELETE)
// ============================================================

function triggerDirectUpload(profileID) {
    const hiddenInput = document.getElementById('currentProfileID');
    if(hiddenInput) hiddenInput.value = profileID;
    const fileInput = document.getElementById('globalFileInput');
    if(fileInput) { fileInput.value = ''; fileInput.click(); } 
    else { showToast('Lỗi: Không tìm thấy input file hệ thống!', 'error'); }
}

async function handleFileSelected(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const profileID = document.getElementById('currentProfileID').value;
        const user = JSON.parse(localStorage.getItem('upfile_user'));

        showLoading(`Đang nộp: ${file.name}...`);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = async function() {
                const base64 = reader.result.split(',')[1]; 
                const payload = {
                    action: 'uploadFile', ProfileID: profileID,
                    fileName: file.name, mimeType: file.type,
                    data: base64, ActorID: user.UserID
                };
                const response = await fetch(API_URL, { method: 'POST', body: JSON.stringify(payload) });
                const result = await response.json();
                hideLoading();
                if (result.status === 'success') {
                    showToast('Đã nộp xong!', 'success'); loadDashboardData(); 
                } else { showToast('Lỗi: ' + result.message, 'error'); }
            };
        } catch (e) { hideLoading(); showToast('Lỗi đọc file.', 'error'); }
    }
}

async function downloadFile(fileId, profileID) {
    if (!fileId) return;
    const user = JSON.parse(localStorage.getItem('upfile_user'));

    // Bật Loading vì chuyển Base64 sẽ mất vài giây
    showLoading('Đang lấy dữ liệu file từ Server...'); 
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify({ 
                action: 'downloadFile', 
                fileId: fileId, 
                userID: user.UserID, 
                profileID: profileID 
            })
        });
        
        const result = await response.json();
        hideLoading();

        if (result.status === 'success') {
            
            // XỬ LÝ ĐỔI TÊN FILE TỰ ĐỘNG
            let finalFileName = result.fileName; 
            
            if (typeof appState !== 'undefined' && appState.allData && appState.allData.Profile) {
                const data = appState.allData;
                const profile = data.Profile.find(p => p.ProfileID === profileID);
                
                if (profile) {
                    const dtNick = findName(data.DocType, 'DocTypeID', profile.DocTypeID, 'DocTypeNickName') || '';
                    const subNick = findName(data.Subject, 'SubjectID', profile.SubjectID, 'SubjectNickName') || '';
                    const blkNick = findName(data.Block, 'BlockID', profile.BlockID, 'BlockNickName') || '';
                    const objNick = findName(data.Object, 'ObjectID', profile.ObjectID, 'ObjectNickName') || '';
                    const remName = findName(data.User, 'UserID', profile.AccountUpdate, 'ReminiscentName') || '';

                    let extension = "";
                    const dotIndex = result.fileName.lastIndexOf('.');
                    if (dotIndex !== -1) extension = result.fileName.substring(dotIndex);
                
                    let newName = `${dtNick} - ${subNick} ${blkNick}.${objNick} - ${remName.toUpperCase()}`;
                    newName = newName.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim();
                    
                    finalFileName = newName + extension;
                }
            }

            const byteCharacters = atob(result.base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], {type: result.mimeType});

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = finalFileName; 
            document.body.appendChild(a);
            a.click();
            
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            showToast('Lỗi tải file: ' + result.message, 'error');
        }
    } catch (e) {
        hideLoading();
        showToast('Lỗi kết nối khi tải file', 'error');
    }
}

async function adminDeleteRow(profileID) {
    const isAgree = await sysConfirm('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa dòng dữ liệu này?<br>File đính kèm cũng sẽ bị xóa.');
    if (!isAgree) return;

    showLoading("Đang xóa dòng...");
    const user = JSON.parse(localStorage.getItem('upfile_user'));
    try {
        const response = await fetch(API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'adminDeleteRow', ProfileID: profileID, ActorID: user.UserID })
        });
        const res = await response.json();
        hideLoading();
        if(res.status === 'success') { showToast("Đã xóa dòng!", "success"); loadDashboardData(); } 
        else { showToast("Lỗi: " + res.message, "error"); }
    } catch(e) { hideLoading(); showToast("Lỗi kết nối", "error"); }
}

async function adminDeleteFile(profileID) {
    const isAgree = await sysConfirm('Xác nhận xóa file', 'Bạn có chắc chắn muốn xóa file đính kèm này?');
    if (!isAgree) return;

    showLoading("Đang xóa file...");
    const user = JSON.parse(localStorage.getItem('upfile_user'));
    try {
        const response = await fetch(API_URL, {
            method: 'POST', body: JSON.stringify({ action: 'adminDeleteFile', ProfileID: profileID, ActorID: user.UserID })
        });
        const res = await response.json();
        hideLoading();
        if(res.status === 'success') { showToast("Đã xóa file!", "success"); loadDashboardData(); } 
        else { showToast("Lỗi: " + res.message, "error"); }
    } catch(e) { hideLoading(); showToast("Lỗi kết nối", "error"); }
}

// ============================================================
// 4. RENDER DASHBOARD (CÂY ACCORDION TỔNG HỢP)
// ============================================================

async function loadDashboardData() {
    const container = document.getElementById('dashboardContent');
    if (!container) return; 
    showLoading('Đang tải dữ liệu hồ sơ...');
    const rawData = await fetchData();
    hideLoading();
    if (!rawData) { container.innerHTML = '<div style="text-align:center; color:red;">Lỗi kết nối server!</div>'; return; }
    appState.allData = rawData;
    renderDashboard(rawData);
}

function renderDashboard(data) {
    const { Profile, SchoolYear, Folder, Subject, Block, Object: ObjectList, DocType, User } = data;
    const currentUser = JSON.parse(localStorage.getItem('upfile_user'));
    const isAdmin = currentUser.Permissions === 'Admin';
    const container = document.getElementById('dashboardContent');
    container.innerHTML = ''; 

    let enrichedData = Profile.map(p => {
        let isUploader = p.AccountUpdate == currentUser.UserID;
        let isPreviewer = p.AccountPreview && p.AccountPreview.toString().split(',').includes(String(currentUser.UserID));
        
        let roleContext = isAdmin ? 'admin' : (isUploader ? 'uploader' : (isPreviewer ? 'previewer' : 'none'));

        if (roleContext === 'none') return null; 

        const folderObj = Folder.find(f => f.FolderID == p.FolderID);
        
        // ✨ LOGIC DEADLINE MỚI: Ưu tiên lấy từ Profile, nếu trống lấy từ Folder
        let finalDeadline = null;
        if (p.Deadline && p.Deadline.toString().trim() !== "") {
            finalDeadline = p.Deadline;
        } else if (folderObj && folderObj.Deadline) {
            finalDeadline = folderObj.Deadline;
        }

        return {
            ...p,
            RoleContext: roleContext, 
            SchoolYearName: findName(SchoolYear, 'SchoolYearID', p.SchoolYearID, 'SchoolYearName'),
            FolderName: folderObj ? folderObj.FolderName : '',
            SubjectName: findName(Subject, 'SubjectID', p.SubjectID, 'SubjectName'),
            BlockName: findName(Block, 'BlockID', p.BlockID, 'BlockName'),
            ObjectName: findName(ObjectList, 'ObjectID', p.ObjectID, 'ObjectName'),
            DocTypeName: findName(DocType, 'DocTypeID', p.DocTypeID, 'DocTypeName'),
            UserName: findName(User, 'UserID', p.AccountUpdate, 'Name'),
            isUploaded: p.FileID && p.FileID !== "",
            Deadline: finalDeadline // Đã được chốt chuẩn xác
        };
    }).filter(item => item !== null);

    updateStats(enrichedData);
    const groups = groupBy(enrichedData, 'SchoolYearName');
    if (Object.keys(groups).length === 0) { container.innerHTML = '<div style="text-align:center; padding:50px;">Không có dữ liệu hiển thị.</div>'; return; }

    for (const [year, yearItems] of Object.entries(groups)) {
        const lv1 = createAccordion(year, 'Năm học', 1);
        const folderGroups = groupBy(yearItems, 'FolderName');
        for (const [folder, folderItems] of Object.entries(folderGroups)) {
            const lv2 = createAccordion(folder, 'Kỳ', 2);
            const subjectGroups = groupBy(folderItems, 'SubjectName');
            for (const [sub, subItems] of Object.entries(subjectGroups)) {
                const lv3 = createAccordion(sub, 'Môn', 3);
                const blockGroups = groupBy(subItems, 'BlockName');
                for (const [block, blockItems] of Object.entries(blockGroups)) {
                    const lv4 = createAccordion(block, 'Khối', 4);
                    const objectGroups = groupBy(blockItems, 'ObjectName');
                    for (const [obj, objItems] of Object.entries(objectGroups)) {
                        const lv5 = createAccordion(obj, 'Đối tượng', 5);
                        if (isAdmin) {
                            const userGroups = groupBy(objItems, 'UserName');
                            for (const [usr, usrItems] of Object.entries(userGroups)) {
                                const lv6 = createAccordion(usr, 'Giáo viên', 6);
                                lv6.querySelector('.level-content').appendChild(renderLevel7(usrItems));
                                lv5.querySelector('.level-content').appendChild(lv6);
                            }
                        } else {
                            lv5.querySelector('.level-content').appendChild(renderLevel7(objItems));
                        }
                        lv4.querySelector('.level-content').appendChild(lv5);
                    }
                    lv3.querySelector('.level-content').appendChild(lv4);
                }
                lv2.querySelector('.level-content').appendChild(lv3);
            }
            lv1.querySelector('.level-content').appendChild(lv2);
        }
        container.appendChild(lv1);
    }
}

function renderLevel7(items) {
    const div = document.createElement('div');
    div.className = 'level-7-list';
    items.sort((a, b) => a.DocTypeID - b.DocTypeID);

    items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'doc-item';
        let isExpired = false;
        if (item.Deadline) {
            const deadlineDate = new Date(item.Deadline);
            const today = new Date();
            deadlineDate.setHours(23, 59, 59);
            if (today > deadlineDate) isExpired = true;
        }
        const isUploaded = item.isUploaded;
        let infoHtml = ''; let actionBtn = ''; 

        if (isUploaded) {
            const timeStr = formatDateTimeFull(item.TimeUpdate); 
            infoHtml = `<span class="status-text-small" style="color:#00b09b">✔ Đã nộp: ${timeStr}</span>`;
        } else {
            infoHtml = `<span class="status-text-small" style="color:#e74c3c">⏳ Chưa nộp</span>`;
        }
        
        const downloadBtn = isUploaded ? `<button class="btn-icon download" title="Tải về máy" onclick="downloadFile('${item.FileID}', '${item.ProfileID}')">📥</button>` : '';

        if (item.RoleContext === 'admin') {
            actionBtn += downloadBtn;
            if (isUploaded) actionBtn += `<button class="btn-icon delete-file" title="Xóa file" onclick="adminDeleteFile('${item.ProfileID}')">🗑</button>`;
            actionBtn += `<button class="btn-icon delete-row" title="Xóa dòng" onclick="adminDeleteRow('${item.ProfileID}')">✕</button>`;
        } 
        else if (item.RoleContext === 'uploader') {
            if (isExpired) {
                if (isUploaded) actionBtn = `${downloadBtn} <span class="status-expired">⛔ Đã khóa</span>`;
                else actionBtn = `<span class="status-expired">⛔ Quá hạn</span>`;
            } else {
                if (isUploaded) actionBtn = `${downloadBtn} <button class="btn-icon edit" title="Thay thế file khác" onclick="triggerDirectUpload('${item.ProfileID}')">✎</button>`;
                else actionBtn = `<button class="btn-icon upload" title="Nộp file ngay" onclick="triggerDirectUpload('${item.ProfileID}')">📤</button>`;
            }
        }
        else if (item.RoleContext === 'previewer') {
            actionBtn = isUploaded ? downloadBtn : `<span class="status-text-small" style="color:#aaa;">Chưa có file</span>`;
        }

        row.innerHTML = `
            <div style="flex: 1;">
                <div class="doc-info-title">📄 ${item.DocTypeName} ${infoHtml}</div>
                <div style="font-size: 0.8rem; margin-top: 4px; color: #666;">
                    ${item.Note ? `<span>📝 ${item.Note}</span> • ` : ''}
                    ${item.Deadline ? `<span>📅 Hạn: ${formatDate(item.Deadline)}</span>` : ''}
                </div>
            </div>
            <div style="display:flex; gap:8px; align-items:center;">${actionBtn}</div>
        `;
        div.appendChild(row);
    });
    return div;
}