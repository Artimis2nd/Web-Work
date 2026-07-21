(() => {
  const container = document.getElementById('cards-container');
  const imagesContainer = document.getElementById('images-container');

  function formatDateForPrint(d) {
    if (!d) return '-';
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = (date.getFullYear() + 543).toString().slice(-2);
    return `${day} ${month} ${year}`;
  }

  function formatWage(n) {
    return Number(n || 0).toLocaleString();
  }

  function formatWorkerLine(w) {
    const name = w.workerName || '(ไม่ระบุ)';
    const wageType = w.wageType || 'hourly';
    const hours = Number(w.hours) || 0;
    const otHours = Number(w.otHours) || 0;
    const fixedAmount = Number(w.fixedAmount) || 0;
    const rawWage = Number(w.RawWage || 0);
    const totalWage = Number(w.TotalWithMarkup || rawWage);

    let detail = '';
    let wageDisplay = 0;

    if (wageType === 'fixed') {
      detail = 'เหมา';
      wageDisplay = fixedAmount;
    } else {
      const parts = [];
      if (hours > 0) parts.push(`${hours} ชม.`);
      if (otHours > 0) parts.push(`OT ${otHours} ชม.`);
      detail = parts.join(' ') || '0 ชม.';
      wageDisplay = totalWage;
    }

    return {
      name,
      detail,
      wageDisplay
    };
  }

  function calcGroupTotal(workers) {
    let total = 0;
    workers.forEach(w => {
      const rawWage = Number(w.RawWage || 0);
      const totalWage = Number(w.TotalWithMarkup || rawWage);
      if (w.wageType === 'fixed') {
        total += Number(w.FixedAmount || rawWage);
      } else {
        total += totalWage;
      }
    });
    return total;
  }

  function renderCard(group, index) {
    const dateStr = formatDateForPrint(group.date);
    const site = group.site || '(ไม่ระบุโครงการ)';
    const requestedBy = group.requestedBy || '(ไม่ระบุ)';
    const workers = group.Workers || [];
    const grandTotal = calcGroupTotal(workers);

    let workersHtml = '';
    workers.forEach(w => {
      const info = formatWorkerLine(w);
      workersHtml += `
        <div class="worker-item">
          - ${info.name} จำนวน ${info.detail} ค่าแรงวันนี้ ${formatWage(info.wageDisplay)} บาท
        </div>
      `;
    });

    return `
      <div class="print-card">
        <div class="card-header">
          <div class="row"><span class="label">โครงการ :</span>${Utils.escapeHtml(site)}</div>
          <div class="row"><span class="label">วันที่ :</span>${dateStr}</div>
          <div class="row"><span class="label">ผู้สั่งงาน :</span>${Utils.escapeHtml(requestedBy)}</div>
        </div>
        <div class="card-workers">
          ${workersHtml || '<div class="worker-item" style="color:#999;">ไม่มีข้อมูลคนงาน</div>'}
        </div>
        <div class="card-footer">
          <span class="total-label">รวมค่าแรงวันนี้ :</span> ${formatWage(grandTotal)} บาท
        </div>
      </div>
    `;
  }

  function renderImages(allGroups) {
    // Collect all images with their group date
    const imageEntries = [];
    allGroups.forEach(group => {
      const urls = group.imageUrls || [];
      urls.forEach(url => {
        imageEntries.push({
          url: url,
          date: group.date,
          dateStr: formatDateForPrint(group.date)
        });
      });
    });

    if (imageEntries.length === 0) {
      imagesContainer.innerHTML = '';
      return;
    }

    // Sort by date
    imageEntries.sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return da - db;
    });

    // Group into pages of 12 (2 columns × 6 rows)
    const IMAGES_PER_PAGE = 12;
    let html = '';

    for (let pageIdx = 0; pageIdx < imageEntries.length; pageIdx += IMAGES_PER_PAGE) {
      const pageItems = imageEntries.slice(pageIdx, pageIdx + IMAGES_PER_PAGE);
      html += `<div class="image-page">`;
      html += `<div class="image-grid">`;
      pageItems.forEach(item => {
        html += `
          <div class="img-cell">
            <img src="${Utils.escapeHtml(item.url)}" alt="รูปภาพ ${item.dateStr}" loading="lazy">
            <div class="img-date">📅 ${item.dateStr}</div>
          </div>
        `;
      });
      html += `</div>`; // close grid
      html += `</div>`; // close page
    }

    imagesContainer.innerHTML = html;
  }

  async function initialize() {
    // Read selected group IDs from sessionStorage
    let groupIds = [];
    try {
      const stored = sessionStorage.getItem('printGroups');
      if (stored) groupIds = JSON.parse(stored);
    } catch (e) {
      // ignore
    }

    if (!groupIds || groupIds.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:#999;">ไม่พบข้อมูลที่เลือก กรุณากลับไปเลือกข้อมูลที่หน้าแดชบอร์ด</div>';
      return;
    }

    // Fetch all groups in parallel
    try {
      const groupPromises = groupIds.map(gid => Api.getLogGroup({ groupId: gid }));
      const groupsData = await Promise.all(groupPromises);

      // Sort groups by date ascending
      groupsData.sort((a, b) => {
        const da = a.date ? new Date(a.date).getTime() : 0;
        const db = b.date ? new Date(b.date).getTime() : 0;
        return da - db;
      });

      // Render cards
      container.innerHTML = groupsData.map((g, i) => renderCard(g, i)).join('');

      // Render images
      renderImages(groupsData);

    } catch (err) {
      container.innerHTML = `<div style="text-align:center;padding:40px;color:red;">เกิดข้อผิดพลาด: ${Utils.escapeHtml(err.message)}</div>`;
    }
  }

  initialize();
})();