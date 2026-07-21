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
        <h2 id="report-title" class="text-lg font-semibold mb-4">สรุปค่าแรงรายวัน</h2>
        <div class="overflow-x-auto">
          <table class="tape-table" style="min-width: 1200px;">
            <thead>
              <tr id="table-head">
                <th>ลำดับ</th>
                <th>วันที่</th>
                <th>โครงการ</th>
                <th style="min-width: 200px;">รายละเอียด</th>
                <th style="min-width: 250px;">คนงาน</th>
                <th>ค่าแรงดิบ</th>
                <th>ปกติ+OT</th>
                <th>เหมา</th>
                <th>รวมทั้งหมด</th>
                <th>ผู้สั่งงาน</th>
              </tr>
            </thead>
            <tbody id="rows">
              <tr><td colspan="10" class="text-center py-6" style="color:var(--ink-soft)">กรุณากด 'สร้างรายงาน' เพื่อดูข้อมูล</td></tr>
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

  function renderRow(log, index) {
    const workersList = log.workers.map(w => `${Utils.escapeHtml(w.WorkerName)}(${w.DailyWage})`).join(', ');

    // Calculate totals for the log group
    let totalRaw = 0;
    let totalNormalOt = 0;
    let totalFixed = 0;

    log.workers.forEach(w => {
      totalRaw += w.RawWage;
      if (w.WageType === 'fixed') {
        totalFixed += w.TotalWithMarkup; // For fixed, TotalWithMarkup is same as RawWage
      } else {
        totalNormalOt += w.TotalWithMarkup;
      }
    });
    const grandTotal = totalNormalOt + totalFixed;

    return `
      <tr>
        <td>${index + 1}</td>
        <td>${Utils.formatDate(log.Date)}</td>
        <td>${Utils.escapeHtml(log.Site)}</td>
        <td class="text-truncate" title="${Utils.escapeHtml(log.JobDetail)}">${Utils.escapeHtml(log.JobDetail)}</td>
        <td class="text-truncate" title="${workersList}">${workersList}</td>
        <td class="font-mono">฿${Utils.money(totalRaw)}</td>
        <td class="font-mono">฿${Utils.money(totalNormalOt)}</td>
        <td class="font-mono">฿${Utils.money(totalFixed)}</td>
        <td class="font-mono font-semibold" style="color:var(--blueprint-dark)">฿${Utils.money(grandTotal)}</td>
        <td>${Utils.escapeHtml(log.RequestedBy)}</td>
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


    const tbody = document.getElementById('rows');
    tbody.innerHTML = Utils.skeletonRows(8, 10);

    const payload = {
      startDate: startDate.toJSDate().toISOString().split('T')[0],
      endDate: endDate.toJSDate().toISOString().split('T')[0]
    };

    try {
      const data = await Api.getLogs(payload); // Changed from getPivotReport to getLogs
      tbody.innerHTML = data.logs && data.logs.length
        ? data.logs.map((log, index) => renderRow(log, index)).join('')
        : `<tr><td colspan="10" class="text-center py-6" style="color:var(--ink-soft)">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</td></tr>`;
    } catch (err) {
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 10;
      td.appendChild(Utils.errorBanner(err.message, load));
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
  }

  layout();
})();
