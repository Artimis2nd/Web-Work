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

      <div class="ledger-card p-4">
        <div class="overflow-x-auto">
          <table class="tape-table">
            <thead>
              <tr id="table-head"><th>วันที่</th><th>จำนวนคนงาน</th><th>ค่าแรงดิบ</th><th>รวม (+20%)</th></tr>
            </thead>
            <tbody id="rows">${Utils.skeletonRows(6, 4)}</tbody>
          </table>
        </div>
      </div>
    `;

    picker = new Litepicker({
      element: document.getElementById('date-range'),
      singleMode: false,
      format: 'DD/MM/YYYY',
      setup: (picker) => {
        picker.on('selected', (date1, date2) => {
          // auto-run on select
          load();
        });
      }
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

    const tbody = document.getElementById('rows');
    tbody.innerHTML = Utils.skeletonRows(6, 4);

    const payload = {
      groupBy: 'date', // Hardcoded to group by date as per new design
      startDate: picker.getStartDate().toJSDate().toISOString().split('T')[0],
      endDate: picker.getEndDate().toJSDate().toISOString().split('T')[0]
    };

    try {
      const data = await Api.getPivotReport(payload);
      tbody.innerHTML = data.rows.length
        ? data.rows.map(r => renderRow(r, data.groupBy)).join('')
        : `<tr><td colspan="4" class="text-center py-6" style="color:var(--ink-soft)">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</td></tr>`;
    } catch (err) {
      tbody.innerHTML = '';
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
