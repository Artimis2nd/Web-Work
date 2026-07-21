(() => {
  Utils.renderShell('report.html', 'สรุปยอดค่าแรงรายบุคคล');
  const content = document.getElementById('page-content');

  let datepicker = null;

  function layout() {
    content.innerHTML = `
      <div class="ledger-card p-4 mb-6">
        <form id="filter-form" class="grid sm:grid-cols-4 gap-3 items-end">
          <div>
            <label class="field-label">ชื่อคนงาน</label>
            <select id="f-worker" class="field-input">
              <option value="">-- ทุกคน --</option>
            </select>
          </div>
          <div>
            <label class="field-label">ช่วงวันที่</label>
            <input type="text" id="f-daterange" class="field-input" placeholder="เลือกช่วงวันที่">
          </div>
          <div class="sm:col-span-4">
            <button type="submit" class="btn btn-primary">กรองข้อมูล</button>
          </div>
        </form>
      </div>

      <div class="grid sm:grid-cols-2 gap-4 mb-6">
        <div class="ledger-card kpi-card p-4" style="--tick-color:var(--green)">
          <div class="kpi-label">รวมค่าแรงดิบ</div>
          <div class="kpi-value text-2xl mt-1" id="sum-raw">฿0.00</div>
        </div>
        <div class="ledger-card kpi-card p-4" style="--tick-color:var(--red)">
          <div class="kpi-label">รวมยอดที่ต้องจ่าย (+20%)</div>
          <div class="kpi-value text-2xl mt-1" id="sum-total">฿0.00</div>
        </div>
      </div>

      <div class="ledger-card p-4">
        <div class="overflow-x-auto">
          <table class="tape-table">
            <thead>
              <tr><th>วันที่</th><th>ไซต์งาน</th><th>รายละเอียดงาน</th><th>ผู้สั่งงาน</th><th>ค่าแรงดิบ</th><th>รวม (+20%)</th></tr>
            </thead>
            <tbody id="rows">${Utils.skeletonRows(6, 6)}</tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById('filter-form').addEventListener('submit', (e) => {
      e.preventDefault();
      load();
    });

    // Initialize Litepicker
    datepicker = new Litepicker({
      element: document.getElementById('f-daterange'),
      singleMode: false,
      format: 'DD/MM/YYYY',
      lang: 'th-TH',
      setup: (picker) => {
        picker.on('selected', (date1, date2) => load());
      }
    });
  }

  async function loadWorkerOptions() {
    try {
      const workers = await Api.getWorkers();
      const select = document.getElementById('f-worker');
      workers.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w.FullName;
        opt.textContent = w.FullName;
        select.appendChild(opt);
      });
    } catch (err) {
      Utils.toast('โหลดรายชื่อคนงานไม่สำเร็จ: ' + err.message, 'error');
    }
  }

  function renderRow(l) {
    return `
      <tr>
        <td>${Utils.formatDate(l.Date)}</td>
        <td>${Utils.escapeHtml(l.Site || '-')}</td>
        <td>${Utils.escapeHtml(l.JobDetail || '-')}</td>
        <td>${Utils.escapeHtml(l.RequestedBy || '-')}</td>
        <td class="font-mono">฿${Utils.money(l.RawWage)}</td>
        <td class="font-mono font-semibold" style="color:var(--blueprint-dark)">฿${Utils.money(l.TotalWithMarkup)}</td>
      </tr>
    `;
  }

  async function load() {
    const tbody = document.getElementById('rows');
    tbody.innerHTML = Utils.skeletonRows(6, 6);

    const startDate = datepicker && datepicker.getStartDate() ? datepicker.getStartDate().toJSDate().toISOString().split('T')[0] : null;
    const endDate = datepicker && datepicker.getEndDate() ? datepicker.getEndDate().toJSDate().toISOString().split('T')[0] : null;

    const payload = {
      workerName: document.getElementById('f-worker').value || null,
      startDate: startDate,
      endDate: endDate
    };

    try {
      const data = await Api.getReport(payload);
      document.getElementById('sum-raw').textContent = '฿' + Utils.money(data.totalRaw);
      document.getElementById('sum-total').textContent = '฿' + Utils.money(data.totalMarkup);
      tbody.innerHTML = data.logs.length
        ? data.logs.map(renderRow).join('')
        : `<tr><td colspan="6" class="text-center py-6" style="color:var(--ink-soft)">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</td></tr>`;
    } catch (err) {
      tbody.innerHTML = '';
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 6;
      td.appendChild(Utils.errorBanner(err.message, load));
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
  }

  layout();
  loadWorkerOptions();
  load();
})();
