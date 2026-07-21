(() => {
  Utils.renderShell('pivot-report.html', 'รายงานสรุปค่าแรงรายวัน / ไซต์งาน');
  const content = document.getElementById('page-content');

  function layout() {
    content.innerHTML = `
      <div class="ledger-card p-4 mb-6">
        <form id="filter-form" class="grid sm:grid-cols-4 gap-3 items-end">
          <div>
            <label class="field-label">มุมมอง</label>
            <select id="f-groupby" class="field-input">
              <option value="date">แยกตามวัน</option>
              <option value="site">แยกตามไซต์งาน</option>
            </select>
          </div>
          <div>
            <label class="field-label">จากวันที่</label>
            <input type="date" id="f-start" class="field-input">
          </div>
          <div>
            <label class="field-label">ถึงวันที่</label>
            <input type="date" id="f-end" class="field-input">
          </div>
          <div>
            <button type="submit" class="btn btn-primary w-full">สร้างรายงาน</button>
          </div>
        </form>
      </div>

      <div class="grid sm:grid-cols-2 gap-4 mb-6">
        <div class="ledger-card kpi-card p-4" style="--tick-color:var(--green)">
          <div class="kpi-label">รวมค่าแรงดิบทั้งหมด</div>
          <div class="kpi-value text-2xl mt-1" id="sum-raw">฿0.00</div>
        </div>
        <div class="ledger-card kpi-card p-4" style="--tick-color:var(--red)">
          <div class="kpi-label">รวมยอดจ่ายทั้งหมด (+20%)</div>
          <div class="kpi-value text-2xl mt-1" id="sum-total">฿0.00</div>
        </div>
      </div>

      <div class="ledger-card p-4">
        <div class="overflow-x-auto">
          <table class="tape-table">
            <thead>
              <tr id="table-head"><th>วันที่</th><th>จำนวนคนงาน</th><th>จำนวนรายการ</th><th>ค่าแรงดิบ</th><th>รวม (+20%)</th></tr>
            </thead>
            <tbody id="rows">${Utils.skeletonRows(6, 5)}</tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('filter-form').addEventListener('submit', (e) => {
      e.preventDefault();
      load();
    });
  }

  function renderRow(r, groupBy) {
    const keyDisplay = groupBy === 'Site' ? Utils.escapeHtml(r.key || '(ไม่ระบุไซต์งาน)') : Utils.formatDate(r.key);
    return `
      <tr>
        <td class="font-medium">${keyDisplay}</td>
        <td class="font-mono">${r.workerCount}</td>
        <td class="font-mono">${r.logCount}</td>
        <td class="font-mono">฿${Utils.money(r.totalRaw)}</td>
        <td class="font-mono font-semibold" style="color:var(--blueprint-dark)">฿${Utils.money(r.totalMarkup)}</td>
      </tr>
    `;
  }

  async function load() {
    const tbody = document.getElementById('rows');
    tbody.innerHTML = Utils.skeletonRows(6, 5);

    const groupBy = document.getElementById('f-groupby').value;
    document.getElementById('table-head').innerHTML =
      `<th>${groupBy === 'site' ? 'ไซต์งาน' : 'วันที่'}</th><th>จำนวนคนงาน</th><th>จำนวนรายการ</th><th>ค่าแรงดิบ</th><th>รวม (+20%)</th>`;

    const payload = {
      groupBy,
      startDate: document.getElementById('f-start').value || null,
      endDate: document.getElementById('f-end').value || null
    };

    try {
      const data = await Api.getPivotReport(payload);
      document.getElementById('sum-raw').textContent = '฿' + Utils.money(data.grandTotalRaw);
      document.getElementById('sum-total').textContent = '฿' + Utils.money(data.grandTotalMarkup);
      tbody.innerHTML = data.rows.length
        ? data.rows.map(r => renderRow(r, data.groupBy)).join('')
        : `<tr><td colspan="5" class="text-center py-6" style="color:var(--ink-soft)">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</td></tr>`;
    } catch (err) {
      tbody.innerHTML = '';
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.appendChild(Utils.errorBanner(err.message, load));
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
  }

  layout();
  load();
})();
