(() => {
  Utils.renderShell('pivot-report.html', 'รายงานสรุปค่าแรงรายวัน / ไซต์งาน');
  const content = document.getElementById('page-content');

  let picker;

  function layout() {
    content.innerHTML = `
      <div class="ledger-card p-4 mb-4">
        <div class="grid sm:grid-cols-3 gap-3 items-end">
            <div>
                <label class="field-label">เลือกช่วงวันที่</label>
                <input type="text" id="date-range" class="field-input" placeholder="เลือกวันที่...">
            </div>
            <div>
                <button id="run-report-btn" class="btn btn-primary w-full">สร้างรายงาน</button>
            </div>
        </div>
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
        <h2 id="report-title" class="text-lg font-semibold mb-4">สรุปค่าแรงรายวัน</h2>
        <div class="overflow-x-auto">
          <table class="tape-table">
            <thead>
              <tr id="table-head"><th>วันที่</th><th>จำนวนคนงาน</th><th>ค่าแรงดิบ</th><th>รวม (+20%)</th></tr>
            </thead>
            <tbody id="rows">
              <tr><td colspan="4" class="text-center py-6" style="color:var(--ink-soft)">กรุณากด 'สร้างรายงาน' เพื่อดูข้อมูล</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    picker = new Litepicker({
      element: document.getElementById('date-range'),
      singleMode: false,
      format: 'DD/MM/YYYY',
    });

    document.getElementById('run-report-btn').addEventListener('click', () => {
        load();
    });
  }

  function renderRow(r, groupBy) {
    const keyDisplay = groupBy === 'Site' ? Utils.escapeHtml(r.key || '(ไม่ระบุไซต์งาน)') : Utils.formatDate(r.key);
    return `
      <tr>
        <td class="font-medium">${keyDisplay}</td>
        <td class="font-mono text-center">${r.workerCount}</td>
        <td class="font-mono">฿${Utils.money(r.totalRaw)}</td>
        <td class="font-mono font-semibold" style="color:var(--blueprint-dark)">฿${Utils.money(r.totalMarkup)}</td>
      </tr>
    `;
  }


  async function load() {
    if (!picker.getStartDate() || !picker.getEndDate()) {
        return; // Don't load if no date is selected
    }

    const startDate = picker.getStartDate();
    const endDate = picker.getEndDate();
    const reportTitle = document.getElementById('report-title');
    reportTitle.textContent = `ค่าแรงรายวันประจำ วันที่ ${startDate.format('DD/MM/YYYY')} - วันที่ ${endDate.format('DD/MM/YYYY')}`;


    document.getElementById('sum-raw').innerHTML = `<div class="skeleton w-32 h-6"></div>`;
    document.getElementById('sum-total').innerHTML = `<div class="skeleton w-32 h-6"></div>`;

    const tbody = document.getElementById('rows');
    tbody.innerHTML = Utils.skeletonRows(6, 4);

    const payload = {
      groupBy: 'date', // Hardcoded to group by date as per new design
      startDate: startDate.toJSDate().toISOString().split('T')[0],
      endDate: endDate.toJSDate().toISOString().split('T')[0]
    };

    try {
      const data = await Api.getPivotReport(payload);
      document.getElementById('sum-raw').textContent = '฿' + Utils.money(data.grandTotalRaw);
      document.getElementById('sum-total').textContent = '฿' + Utils.money(data.grandTotalMarkup);
      tbody.innerHTML = data.rows.length
        ? data.rows.map(r => renderRow(r, data.groupBy)).join('')
        : `<tr><td colspan="4" class="text-center py-6" style="color:var(--ink-soft)">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</td></tr>`;
    } catch (err) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 4;
      td.appendChild(Utils.errorBanner(err.message, load));
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
  }

  layout();
})();
