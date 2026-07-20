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
        <table class="tape-table"><tbody>${Utils.skeletonRows(6, 5)}</tbody></table>
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

  function renderLogRow(log) {
    return `
      <tr>
        <td>${Utils.formatDate(log.Date)}</td>
        <td>${Utils.escapeHtml(log.Site || '-')}</td>
        <td>${Utils.escapeHtml(log.WorkerName || '-')}</td>
        <td class="font-mono">${Utils.money(log.RawWage)}</td>
        <td class="font-mono font-semibold" style="color:var(--blueprint-dark)">${Utils.money(log.TotalWithMarkup)}</td>
        <td>
          <button class="btn btn-danger btn-sm" data-delete-group="${Utils.escapeHtml(log.GroupID)}">ลบชุดนี้</button>
        </td>
      </tr>
    `;
  }

  function renderData(data) {
    content.innerHTML = `
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        ${kpiCard('จำนวนคนงานทั้งหมด', data.totalWorkers, 'var(--blueprint)')}
        ${kpiCard('ใบงานที่บันทึกแล้ว', data.totalLogGroups, 'var(--amber-dark)')}
        ${kpiCard('ยอดค่าแรงดิบสะสม', Utils.money(data.totalRawWage), 'var(--green)', '฿')}
        ${kpiCard('ยอดค่าแรงสะสมรวม (+20%)', Utils.money(data.totalMarkupWage), 'var(--red)', '฿')}
      </div>

      <div class="ledger-card p-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-display text-lg font-semibold">บันทึกล่าสุด</h2>
          <a href="daily-log.html" class="btn btn-amber btn-sm">+ บันทึกงานใหม่</a>
        </div>
        <div class="overflow-x-auto">
          <table class="tape-table">
            <thead>
              <tr>
                <th>วันที่</th><th>ไซต์งาน</th><th>คนงาน</th><th>ค่าแรงดิบ</th><th>รวม (+20%)</th><th></th>
              </tr>
            </thead>
            <tbody id="log-rows">
              ${data.recentLogs.length
                ? data.recentLogs.map(renderLogRow).join('')
                : `<tr><td colspan="6" class="text-center py-6" style="color:var(--ink-soft)">ยังไม่มีบันทึกงาน — เริ่มบันทึกได้ที่ปุ่มด้านบน</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    `;

    content.querySelectorAll('[data-delete-group]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const groupId = btn.getAttribute('data-delete-group');
        if (!confirm('ยืนยันการลบบันทึกชุดนี้ทั้งหมด?')) return;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner spinner-dark"></span>';
        try {
          await Api.deleteLogGroup({ groupId });
          Utils.toast('ลบบันทึกเรียบร้อย', 'success');
          load();
        } catch (err) {
          Utils.toast(err.message, 'error');
          btn.disabled = false;
          btn.textContent = 'ลบชุดนี้';
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
