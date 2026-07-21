(() => {
  Utils.renderShell('index.html', 'แดชบอร์ด');

  const content = document.getElementById('page-content');

  function skeletonKpis() {
    content.innerHTML = `
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        ${[0,1,2,3].map(() => `
          <div class="ledger-card p-4">
            <div class="skeleton" style="height:12px;width:60%;margin-bottom:10px"></div>
            <div class="skeleton" style="height:26px;width:80%"></div>
          </div>
        `).join('')}
      </div>
      <div class="ledger-card p-4">
        <div class="skeleton" style="height:18px;width:200px;margin-bottom:16px"></div>
        <table class="tape-table"><tbody>${Utils.skeletonRows(6, 6)}</tbody></table>
      </div>
    `;
  }

  function kpiCard(label, value, colorVar, prefix = '') {
    return `
      <div class="ledger-card kpi-card p-4" style="--tick-color:${colorVar}">
        <div class="kpi-label">${label}</div>
        <div class="kpi-value text-2xl mt-1">${prefix}${value}</div>
      </div>
    `;
  }

  function renderGroupRow(group) {
    return `
      <tr>
        <td class="text-center"><input type="checkbox" class="group-checkbox" value="${Utils.escapeHtml(group.groupId)}"></td>
        <td class="text-center">${Utils.formatDate(group.date)}</td>
        <td class="text-center text-truncate" title="${Utils.escapeHtml(group.site || '-')}">${Utils.escapeHtml(group.site || '-')}</td>
        <td class="text-truncate" title="${Utils.escapeHtml(group.jobDetail || '-')}">${Utils.escapeHtml(group.jobDetail || '-')}</td>
        <td class="font-mono text-center">${group.workerCount || 0} คน</td>
        <td class="font-mono font-semibold text-center" style="color:var(--blueprint-dark)">฿${Utils.money(group.totalNormal + group.totalFixed)}</td>
        <td class="text-center">${Utils.escapeHtml(group.requestedBy || '-')}</td>
        <td>
          <div class="flex gap-1 justify-center">
            <button class="btn btn-outline btn-sm" data-edit-group="${Utils.escapeHtml(group.groupId)}">&#9998;</button>
            <button class="btn btn-danger btn-sm" data-delete-group="${Utils.escapeHtml(group.groupId)}">&#128465;</button>
          </div>
        </td>
      </tr>
    `;
  }

  function renderData(data) {
    content.innerHTML = `
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        ${kpiCard('จำนวนคนงานทั้งหมด', data.totalWorkers, 'var(--blueprint)')}
        ${kpiCard('ใบงานที่บันทึกแล้ว', data.totalLogGroups, 'var(--amber-dark)')}
        ${kpiCard('ยอดค่าแรงปกติ+OT สะสม', Utils.money(data.totalNormalWage), 'var(--green)', '฿')}
        ${kpiCard('ยอดค่าแรงเหมาสะสม', Utils.money(data.totalFixedWage), 'var(--red)', '฿')}
      </div>

      <div class="ledger-card p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-display text-lg font-semibold">รายการใบงานล่าสุด</h2>
          <div class="flex gap-2">
            <button id="view-selected-btn" class="btn btn-outline btn-sm">📋 ดูรายการ</button>
            <a href="daily-log.html" class="btn btn-amber btn-sm">+ บันทึกงานใหม่</a>
          </div>
        </div>
        <div class="overflow-x-auto">
          <table class="tape-table" style="table-layout: fixed; width: 100%;">
            <thead>
              <tr>
                <th style="width: 40px;"><input type="checkbox" id="select-all-checkbox" title="เลือกทั้งหมด"></th>
                <th style="width: 100px;">วันที่</th>
                <th style="width: 120px;">ไซต์งาน</th>
                <th>รายละเอียดงาน</th>
                <th style="width: 80px;">จำนวนคน</th>
                <th style="width: 100px;">รวมจ่าย</th>
                <th style="width: 100px;">ผู้สั่งงาน</th>
                <th style="width: 80px;"></th>
              </tr>
            </thead>
            <tbody id="log-rows">
              ${data.recentGroups && data.recentGroups.length
                ? data.recentGroups.map(renderGroupRow).join('')
                : `<tr><td colspan="6" class="text-center py-6" style="color:var(--ink-soft)">ยังไม่มีบันทึกงาน — เริ่มบันทึกได้ที่ปุ่มด้านบน</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Edit buttons
    content.querySelectorAll('[data-edit-group]').forEach(btn => {
      btn.addEventListener('click', () => {
        const groupId = btn.getAttribute('data-edit-group');
        window.location.href = 'daily-log.html?edit=' + encodeURIComponent(groupId);
      });
    });

    // Delete buttons
    content.querySelectorAll('[data-delete-group]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const groupId = btn.getAttribute('data-delete-group');
        if (!confirm('ยืนยันการลบใบงานนี้ทั้งหมด?')) return;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner spinner-dark"></span>';
        try {
          await Api.deleteLogGroup({ groupId });
          Utils.toast('ลบใบงานเรียบร้อย', 'success');
          load();
        } catch (err) {
          Utils.toast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = '🗑️';
        }
      });
    });

    // Select All checkbox
    const selectAllCheckbox = document.getElementById('select-all-checkbox');
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', () => {
        const checkboxes = document.querySelectorAll('.group-checkbox');
        checkboxes.forEach(cb => cb.checked = selectAllCheckbox.checked);
      });
    }

    // View selected button
    const viewBtn = document.getElementById('view-selected-btn');
    if (viewBtn) {
      viewBtn.addEventListener('click', () => {
        const checked = document.querySelectorAll('.group-checkbox:checked');
        const ids = Array.from(checked).map(cb => cb.value);
        if (ids.length === 0) {
          Utils.toast('กรุณาเลือกรายการใบงานก่อน', 'error');
          return;
        }
        sessionStorage.setItem('printGroups', JSON.stringify(ids));
        window.open('summary-print.html', '_blank');
      });
    }
  }

  async function load() {
    skeletonKpis();
    try {
      const data = await Api.getDashboard();
      renderData(data);
    } catch (err) {
      content.innerHTML = '';
      content.appendChild(Utils.errorBanner(err.message, load));
    }
  }

  load();
})();