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
          <div>
            <!-- Label ว่างเพื่อให้ปุ่มจัดตำแหน่งตรงกับ input อื่นๆ -->
            <label class="field-label">&nbsp;</label>
            <button type="submit" class="btn btn-primary w-full">กรองข้อมูล</button>
          </div>
        </form>
      </div>

      <div class="ledger-card p-4 mb-6 text-center">
        <div class="kpi-label">ยอดรวมของช่วงวันที่ที่เลือก</div>
        <div id="report-grand-total" class="font-mono font-bold text-2xl mt-1" style="color:var(--blueprint-dark)">
          -
        </div>
      </div>

      <div class="ledger-card p-4">
        <div class="overflow-x-auto">
          <table class="tape-table">
            <thead>
              <tr><th>ชื่อคนงาน</th><th>วันที่มาทำงานรวม</th><th>ยอดค่าแรงรวมดิบ</th><th>เพิ่ม+20%</th><th>ค่าแรงเหมา</th><th>ค่าแรง OT</th><th>รวมค่าแรงทั้งหมด</th></tr>
            </thead>
            <tbody id="rows"><tr><td colspan="6" class="text-center py-6" style="color:var(--ink-soft)">กรุณาเลือกเงื่อนไขและกด 'กรองข้อมูล' เพื่อแสดงรายงาน</td></tr></tbody>
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
      autoApply: true // ทำให้ปฏิทินปิดเองเมื่อเลือกวันที่เสร็จ
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

  /**
   * Processes raw log data and groups it by worker for the new report format.
   * @param {Array<Object>} logs - The raw log data from the API.
   * @returns {Array<Object>} An array of aggregated worker report objects.
   */
  function processReportData(logs) {
    const workerData = new Map();

    for (const log of logs) {
      if (!workerData.has(log.WorkerName)) {
        workerData.set(log.WorkerName, {
          workerName: log.WorkerName,
          dailyWage: log.DailyWage,
          fullDays: 0,
          partialHours: 0,
          otHours: 0,
          fixedDays: 0,
          totalRawWage: 0,
          totalMarkup: 0,
          totalFixedWage: 0,
          totalOtWage: 0,
        });
      }

      const data = workerData.get(log.WorkerName);
      data.totalRawWage += log.RawWage;
      data.totalMarkup += (log.TotalWithMarkup - log.RawWage);

      if (log.WageType === 'fixed') {
        data.fixedDays += 1;
        data.totalFixedWage += log.FixedAmount;
      } else { // hourly
        if (log.Hours === 8) {
          data.fullDays += 1;
        } else {
          data.partialHours += log.Hours;
        }

        if (log.OTHours > 0) {
          data.otHours += log.OTHours;
          // คำนวณค่าแรง OT จาก RawWage เพื่อความแม่นยำและหลีกเลี่ยงการหารด้วยศูนย์
          const totalHoursEquivalent = log.Hours + (log.OTHours * 2);
          if (totalHoursEquivalent > 0) {
            data.totalOtWage += (log.RawWage / totalHoursEquivalent) * (log.OTHours * 2);
          }
        }
      }
    }

    return Array.from(workerData.values());
  }

  function renderRow(workerReport) {
    const {
      workerName, dailyWage, fullDays, partialHours, otHours, fixedDays,
      totalRawWage, totalMarkup, totalFixedWage, totalOtWage
    } = workerReport;

    // Format "วันที่มาทำงานรวม"
    const workParts = [];
    if (fullDays > 0) workParts.push(`${fullDays} วัน`);
    if (fixedDays > 0) workParts.push(`เหมา ${fixedDays} วัน`);
    if (partialHours > 0) workParts.push(`${partialHours} ชม.`);
    if (otHours > 0) workParts.push(`OT ${otHours} ชม.`);
    const workSummary = workParts.length > 0 ? workParts.join(' - ') : '0 วัน';

    const grandTotal = totalRawWage + totalMarkup;

    return `
      <tr>
        <td>${Utils.escapeHtml(workerName)} <span class="text-xs" style="color:var(--ink-soft)">(${Utils.money(dailyWage)} บาท)</span></td>
        <td>${workSummary}</td>
        <td class="font-mono">฿${Utils.money(totalRawWage)}</td>
        <td class="font-mono" style="color:var(--green)">฿${Utils.money(totalMarkup)}</td>
        <td class="font-mono">฿${Utils.money(totalFixedWage)}</td>
        <td class="font-mono">฿${Utils.money(totalOtWage)}</td>
        <td class="font-mono font-semibold" style="color:var(--blueprint-dark)">฿${Utils.money(grandTotal)}</td>
      </tr>
    `;
  }

  async function load() {
    const tbody = document.getElementById('rows');
    tbody.innerHTML = Utils.skeletonRows(6, 7);

    const startDate = datepicker ? Utils.toApiDate(datepicker.getStartDate()) : null;
    const endDate = datepicker ? Utils.toApiDate(datepicker.getEndDate()) : null;

    const payload = {
      workerName: document.getElementById('f-worker').value || null,
      startDate,
      endDate
    };

    try {
      const data = await Api.getReport(payload);
      const totalDisplay = document.getElementById('report-grand-total');

      if (data.logs.length > 0) {
        const processedData = processReportData(data.logs);
        const grandTotal = processedData.reduce((sum, worker) => sum + worker.totalRawWage + worker.totalMarkup, 0);
        totalDisplay.textContent = '฿' + Utils.money(grandTotal);
        tbody.innerHTML = processedData.map(renderRow).join('');
      } else {
        totalDisplay.textContent = '฿0.00';
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-6" style="color:var(--ink-soft)">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</td></tr>`;
      }
    } catch (err) {
      tbody.innerHTML = '';
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 7;
      td.appendChild(Utils.errorBanner(err.message, load));
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
  }

  async function initializePage() {
    layout();
    // โหลดเฉพาะรายชื่อคนงานมาใส่ใน dropdown
    await loadWorkerOptions();
  }
  initializePage();
})();
