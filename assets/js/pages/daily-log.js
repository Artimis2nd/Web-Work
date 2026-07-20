(() => {
  Utils.renderShell('daily-log.html', 'บันทึกงานประจำวัน');
  const content = document.getElementById('page-content');

  const MARKUP_RATE = 1.2;
  let allWorkers = [];
  let selected = new Map(); // id -> worker

  function layout() {
    content.innerHTML = `
      <div class="grid lg:grid-cols-3 gap-6">
        <form id="log-form" class="ledger-card p-5 lg:col-span-2 space-y-4">
          <div class="grid sm:grid-cols-2 gap-4">
            <div>
              <label class="field-label">วันที่</label>
              <input type="date" id="f-date" class="field-input" required>
            </div>
            <div>
              <label class="field-label">ไซต์งาน / โครงการ</label>
              <input type="text" id="f-site" class="field-input" required placeholder="เช่น โครงการบ้านคุณเอ - ถนนสุขุมวิท">
            </div>
          </div>
          <div>
            <label class="field-label">รายละเอียดงาน</label>
            <textarea id="f-detail" class="field-input" rows="3" required placeholder="เช่น เทปูนพื้นชั้น 2, ผูกเหล็กเสา"></textarea>
          </div>
          <div>
            <label class="field-label">ผู้สั่งงาน</label>
            <input type="text" id="f-requester" class="field-input" required placeholder="ชื่อหัวหน้างาน / ผู้ควบคุมงาน">
          </div>

          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="field-label mb-0">เลือกคนงาน (เลือกได้หลายคน)</label>
              <span id="worker-loading" class="text-xs" style="color:var(--ink-soft)">กำลังโหลด...</span>
            </div>
            <div id="worker-list" class="grid sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto pr-1"></div>
          </div>

          <div id="form-error"></div>

          <button type="submit" id="f-submit" class="btn btn-primary w-full sm:w-auto">
            <span id="f-submit-label">บันทึกงาน</span>
          </button>
        </form>

        <div class="ledger-card p-5 h-fit lg:sticky lg:top-6">
          <h2 class="font-display text-lg font-semibold mb-3">สรุปยอดก่อนบันทึก</h2>
          <div id="summary-list" class="space-y-2 mb-4 text-sm"></div>
          <div class="pt-3 space-y-1" style="border-top:1.5px dashed var(--line)">
            <div class="flex justify-between text-sm">
              <span style="color:var(--ink-soft)">คนงานที่เลือก</span>
              <span class="font-mono" id="sum-count">0 คน</span>
            </div>
            <div class="flex justify-between text-sm">
              <span style="color:var(--ink-soft)">รวมค่าแรงดิบ</span>
              <span class="font-mono" id="sum-raw">฿0.00</span>
            </div>
            <div class="flex justify-between text-base font-semibold" style="color:var(--blueprint-dark)">
              <span>รวมทั้งสิ้น (+20%)</span>
              <span class="font-mono" id="sum-total">฿0.00</span>
            </div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('f-date').value = Utils.toInputDate();
    document.getElementById('log-form').addEventListener('submit', onSubmit);
  }

  function renderWorkerList() {
    const list = document.getElementById('worker-list');
    if (!allWorkers.length) {
      list.innerHTML = `<div class="text-sm sm:col-span-2" style="color:var(--ink-soft)">ยังไม่มีรายชื่อคนงาน — เพิ่มได้ที่หน้า "จัดการคนงาน"</div>`;
      return;
    }
    list.innerHTML = allWorkers.map(w => `
      <label class="worker-check" data-id="${w.ID}">
        <span>
          <span class="font-medium block">${Utils.escapeHtml(w.FullName)}</span>
          <span class="text-xs font-mono" style="color:var(--ink-soft)">฿${Utils.money(w.DailyWage)}/วัน</span>
        </span>
        <input type="checkbox" data-checkbox-id="${w.ID}">
      </label>
    `).join('');

    list.querySelectorAll('.worker-check').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.getAttribute('data-id');
        const checkbox = el.querySelector('input');
        const worker = allWorkers.find(w => String(w.ID) === id);
        if (selected.has(id)) {
          selected.delete(id);
          checkbox.checked = false;
          el.classList.remove('checked');
        } else {
          selected.set(id, worker);
          checkbox.checked = true;
          el.classList.add('checked');
        }
        updateSummary();
      });
    });
  }

  function updateSummary() {
    const summaryList = document.getElementById('summary-list');
    const workers = Array.from(selected.values());

    if (!workers.length) {
      summaryList.innerHTML = `<div style="color:var(--ink-soft)">ยังไม่ได้เลือกคนงาน</div>`;
    } else {
      summaryList.innerHTML = workers.map(w => `
        <div class="flex justify-between">
          <span>${Utils.escapeHtml(w.FullName)}</span>
          <span class="font-mono">฿${Utils.money(w.DailyWage)}</span>
        </div>
      `).join('');
    }

    const totalRaw = workers.reduce((s, w) => s + (Number(w.DailyWage) || 0), 0);
    document.getElementById('sum-count').textContent = workers.length + ' คน';
    document.getElementById('sum-raw').textContent = '฿' + Utils.money(totalRaw);
    document.getElementById('sum-total').textContent = '฿' + Utils.money(totalRaw * MARKUP_RATE);
  }

  async function loadWorkers() {
    try {
      allWorkers = (await Api.getWorkers()).filter(w => w.Status === 'Active');
      document.getElementById('worker-loading').textContent = '';
      renderWorkerList();
    } catch (err) {
      document.getElementById('worker-loading').textContent = '';
      document.getElementById('worker-list').appendChild(Utils.errorBanner(err.message, loadWorkers));
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    const errorBox = document.getElementById('form-error');
    errorBox.innerHTML = '';

    if (selected.size === 0) {
      errorBox.appendChild(Utils.errorBanner('กรุณาเลือกคนงานอย่างน้อย 1 คน'));
      return;
    }

    const payload = {
      date: document.getElementById('f-date').value,
      site: document.getElementById('f-site').value.trim(),
      jobDetail: document.getElementById('f-detail').value.trim(),
      requestedBy: document.getElementById('f-requester').value.trim(),
      workers: Array.from(selected.values()).map(w => ({ name: w.FullName, dailyWage: w.DailyWage }))
    };

    const submitBtn = document.getElementById('f-submit');
    submitBtn.disabled = true;
    document.getElementById('f-submit-label').innerHTML = '<span class="spinner"></span> กำลังบันทึก...';

    try {
      const result = await Api.addLogs(payload);
      Utils.toast(`บันทึกสำเร็จ ${result.count} รายการ (รวม ฿${Utils.money(result.totalMarkup)})`, 'success');
      document.getElementById('log-form').reset();
      document.getElementById('f-date').value = Utils.toInputDate();
      selected.clear();
      renderWorkerList();
      updateSummary();
    } catch (err) {
      errorBox.innerHTML = '';
      errorBox.appendChild(Utils.errorBanner(err.message));
    } finally {
      submitBtn.disabled = false;
      document.getElementById('f-submit-label').textContent = 'บันทึกงาน';
    }
  }

  layout();
  updateSummary();
  loadWorkers();
})();
