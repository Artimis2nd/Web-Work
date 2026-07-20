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
        <td>${Utils.formatDate(group.date)}</td>
        <td>${Utils.escapeHtml(group.site || '-')}</td>
        <td class="text-truncate" title="${Utils.escapeHtml(group.jobDetail || '-').replace(/"/g, '"')}">${Utils.escapeHtml(group.jobDetail || '-')}</td>
        <td class="font-mono">${group.workerCount} คน</td>
        <td class="font-mono font-semibold" style="color:var(--blueprint-dark)">฿${Utils.money(group.totalNormal + group.totalFixed)}</td>
        <td>${Utils.escapeHtml(group.requestedBy || '-')}</td>
        <td>
          <div class="flex gap-1">
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
          <a href="daily-log.html" class="btn btn-amber btn-sm">+ บันทึกงานใหม่</a>
        </div>
        <div class="overflow-x-auto">
          <table class="tape-table">
            <thead>
              <tr>
                <th>วันที่</th>
                <th>ไซต์งาน</th>
                <th>จำนวนคน</th>
                <th>ค่าแรงปกติ+OT</th>
                <th>ค่าแรงเหมา</th>
                <th>รวมจ่าย</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="log-rows">
              ${data.recentGroups && data.recentGroups.length
                ? data.recentGroups.map(renderGroupRow).join('')
                : `<tr><td colspan="7" class="text-center py-6" style="color:var(--ink-soft)">ยังไม่มีบันทึกงาน — เริ่มบันทึกได้ที่ปุ่มด้านบน</td></tr>`}
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