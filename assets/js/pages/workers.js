(() => {
  Utils.renderShell('workers.html', 'จัดการรายชื่อคนงาน');
  const content = document.getElementById('page-content');

  let editingId = null;

  function layout() {
    content.innerHTML = `
      <div class="grid lg:grid-cols-3 gap-6">
        <div class="ledger-card p-5 lg:col-span-1 h-fit">
          <h2 class="font-display text-lg font-semibold mb-4" id="form-title">เพิ่มคนงานใหม่</h2>
          <form id="worker-form" class="space-y-4">
            <div>
              <label class="field-label">ชื่อ-นามสกุล</label>
              <input type="text" id="f-name" class="field-input" required placeholder="เช่น สมชาย ใจดี">
            </div>
            <div>
              <label class="field-label">ค่าแรงขั้นต่ำต่อวัน (บาท)</label>
              <input type="number" id="f-wage" class="field-input" required min="0" step="1" placeholder="เช่น 400">
            </div>
            <div>
              <label class="field-label">สถานะ</label>
              <select id="f-status" class="field-input">
                <option value="Active">ทำงานอยู่ (Active)</option>
                <option value="Inactive">พักงาน (Inactive)</option>
              </select>
            </div>
            <div class="flex gap-2 pt-1">
              <button type="submit" id="f-submit" class="btn btn-primary flex-1">
                <span id="f-submit-label">บันทึกคนงาน</span>
              </button>
              <button type="button" id="f-cancel" class="btn btn-outline hidden">ยกเลิก</button>
            </div>
          </form>
        </div>

        <div class="ledger-card p-4 lg:col-span-2">
          <div class="overflow-x-auto">
            <table class="tape-table">
              <thead>
                <tr><th>ID</th><th>ชื่อ-นามสกุล</th><th>ค่าแรง/วัน</th><th>สถานะ</th><th></th></tr>
              </thead>
              <tbody id="worker-rows">${Utils.skeletonRows(5, 5)}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    document.getElementById('worker-form').addEventListener('submit', onSubmit);
    document.getElementById('f-cancel').addEventListener('click', resetForm);
  }

  function resetForm() {
    editingId = null;
    document.getElementById('form-title').textContent = 'เพิ่มคนงานใหม่';
    document.getElementById('f-submit-label').textContent = 'บันทึกคนงาน';
    document.getElementById('f-cancel').classList.add('hidden');
    document.getElementById('worker-form').reset();
  }

  function fillForm(w) {
    editingId = w.ID;
    document.getElementById('form-title').textContent = 'แก้ไขข้อมูลคนงาน #' + w.ID;
    document.getElementById('f-submit-label').textContent = 'บันทึกการแก้ไข';
    document.getElementById('f-cancel').classList.remove('hidden');
    document.getElementById('f-name').value = w.FullName;
    document.getElementById('f-wage').value = w.DailyWage;
    document.getElementById('f-status').value = w.Status;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderRow(w) {
    const stampClass = w.Status === 'Active' ? 'stamp-active' : 'stamp-inactive';
    const stampLabel = w.Status === 'Active' ? 'ทำงานอยู่' : 'พักงาน';
    return `
      <tr>
        <td class="font-mono" style="color:var(--ink-soft)">#${w.ID}</td>
        <td class="font-semibold">${Utils.escapeHtml(w.FullName)}</td>
        <td class="font-mono">฿${Utils.money(w.DailyWage)}</td>
        <td><span class="stamp ${stampClass}">${stampLabel}</span></td>
        <td class="flex gap-2">
          <button class="btn btn-outline btn-sm" data-edit="${w.ID}">แก้ไข</button>
          <button class="btn btn-danger btn-sm" data-delete="${w.ID}">ลบ</button>
        </td>
      </tr>
    `;
  }

  async function loadTable() {
    const tbody = document.getElementById('worker-rows');
    try {
      const workers = await Api.getWorkers();
      if (!workers.length) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6" style="color:var(--ink-soft)">ยังไม่มีรายชื่อคนงาน</td></tr>`;
        return;
      }
      tbody.innerHTML = workers.map(renderRow).join('');
      window.__workersCache = workers;

      tbody.querySelectorAll('[data-edit]').forEach(btn => {
        btn.addEventListener('click', () => {
          const w = workers.find(x => String(x.ID) === btn.getAttribute('data-edit'));
          if (w) fillForm(w);
        });
      });
      tbody.querySelectorAll('[data-delete]').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('ยืนยันการลบคนงานคนนี้?')) return;
          try {
            await Api.deleteWorker({ id: btn.getAttribute('data-delete') });
            Utils.toast('ลบคนงานเรียบร้อย', 'success');
            loadTable();
          } catch (err) {
            Utils.toast(err.message, 'error');
          }
        });
      });
    } catch (err) {
      tbody.innerHTML = '';
      const tr = document.createElement('tr');
      const td = document.createElement('td');
      td.colSpan = 5;
      td.appendChild(Utils.errorBanner(err.message, loadTable));
      tr.appendChild(td);
      tbody.appendChild(tr);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    const submitBtn = document.getElementById('f-submit');
    const payload = {
      fullName: document.getElementById('f-name').value.trim(),
      dailyWage: document.getElementById('f-wage').value,
      status: document.getElementById('f-status').value
    };
    if (!payload.fullName) return;

    submitBtn.disabled = true;
    const originalLabel = document.getElementById('f-submit-label').textContent;
    document.getElementById('f-submit-label').innerHTML = '<span class="spinner"></span>';

    try {
      if (editingId) {
        await Api.updateWorker({ id: editingId, ...payload });
        Utils.toast('แก้ไขข้อมูลเรียบร้อย', 'success');
      } else {
        await Api.addWorker(payload);
        Utils.toast('เพิ่มคนงานเรียบร้อย', 'success');
      }
      resetForm();
      loadTable();
    } catch (err) {
      Utils.toast(err.message, 'error');
      document.getElementById('f-submit-label').textContent = originalLabel;
    } finally {
      submitBtn.disabled = false;
    }
  }

  layout();
  loadTable();
})();
