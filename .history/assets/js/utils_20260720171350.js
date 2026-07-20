/**
 * ฟังก์ชันช่วยเหลือที่ใช้ร่วมกันทุกหน้า: จัดรูปแบบตัวเลข/วันที่, Toast, Layout, Loading, Error
 */
const Utils = (() => {
  const APP_VERSION = '2.1';
  const THB = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function money(n) {
    return THB.format(Number(n) || 0);
  }

  function formatDate(d) {
    if (!d) return '-';
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString('th-TH', { year: '2-digit', month: '2-digit', day: 'numeric' });
  }

  function toInputDate(d) {
    const date = d ? new Date(d) : new Date();
    if (isNaN(date.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }

  function toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    container.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity 0.25s ease';
      el.style.opacity = '0';
      setTimeout(() => el.remove(), 250);
    }, 3200);
  }

  function skeletonRows(count, cols) {
    let html = '';
    for (let i = 0; i < count; i++) {
      html += '<tr>';
      for (let c = 0; c < cols; c++) {
        html += `<td><div class="skeleton" style="height:14px;width:${60 + (c * 13) % 80}%"></div></td>`;
      }
      html += '</tr>';
    }
    return html;
  }

  function errorBanner(message, onRetry) {
    const div = document.createElement('div');
    div.className = 'error-banner';
    div.innerHTML = `
      <span>&#9888;</span>
      <div class="flex-1">
        <div class="font-semibold">เชื่อมต่อไม่สำเร็จ</div>
        <div>${escapeHtml(message)}</div>
      </div>
    `;
    if (onRetry) {
      const btn = document.createElement('button');
      btn.className = 'btn btn-outline btn-sm';
      btn.textContent = 'ลองใหม่';
      btn.onclick = onRetry;
      div.appendChild(btn);
    }
    return div;
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  }

  const NAV_ITEMS = [
    { href: 'index.html', label: 'แดชบอร์ด', icon: '&#128202;' },
    { href: 'daily-log.html', label: 'บันทึกงานประจำวัน', icon: '&#128221;' },
    { href: 'report.html', label: 'สรุปรายบุคคล', icon: '&#128100;' },
    { href: 'pivot-report.html', label: 'สรุปรายวัน/ไซต์งาน', icon: '&#128203;' },
    { href: 'workers.html', label: 'จัดการคนงาน', icon: '&#128119;' }
  ];

  function renderShell(activePage, pageTitle) {
    const navHtml = NAV_ITEMS.map(item => `
      <a href="${item.href}" class="nav-tab ${item.href === activePage ? 'active' : ''}">
        <span>${item.icon}</span><span>${item.label}</span>
      </a>
    `).join('');

    document.getElementById('app-shell').innerHTML = `
      <div class="flex min-h-screen">
        <aside class="sidebar w-64 shrink-0 hidden md:flex flex-col p-4 gap-1">
          <div class="brand text-lg text-white px-2 pb-4 pt-2 flex items-center gap-2">
            <span style="color:var(--amber)">&#128736;</span>
            <span>SITE LEDGER</span>
          </div>
          ${navHtml}
          <div class="mt-auto px-2 pt-4 text-xs" style="color:#6B7684">ระบบคิดค่าแรงคนงาน<br>v${APP_VERSION}</div>
        </aside>

        <div class="flex-1 min-w-0 flex flex-col">
          <header class="md:hidden sidebar flex items-center justify-between px-4 py-3">
            <div class="brand text-white text-base flex items-center gap-2">
              <span style="color:var(--amber)">&#128736;</span> SITE LEDGER
            </div>
            <button id="mobile-nav-toggle" class="text-white text-xl px-2">&#9776;</button>
          </header>
          <nav id="mobile-nav" class="md:hidden hidden sidebar flex flex-col p-3 gap-1 border-t border-white/10">
            ${navHtml}
          </nav>

          <main class="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
            <div class="mb-6 flex items-center justify-between gap-4">
              <h1 class="font-display text-2xl md:text-3xl font-semibold" style="color:var(--ink)">${pageTitle}</h1>
              <div id="status-badge" class="status-badge status-loading">
                <span class="status-progress-label">⏳ 0%</span>
                <div class="status-progress-track"><div id="status-progress-fill" class="status-progress-fill" style="width:0%"></div></div>
              </div>
            </div>
            <div id="page-content"></div>
          </main>
        </div>
      </div>
      <div id="toast-container"></div>
    `;

    const toggle = document.getElementById('mobile-nav-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        document.getElementById('mobile-nav').classList.toggle('hidden');
      });
    }

    // ตรวจสอบสถานะเชื่อมต่อหลังจาก DOM พร้อม
    setTimeout(checkStatus, 300);
  }

  /**
   * ตรวจสอบสถานะการเชื่อมต่อกับ Google Sheets ผ่าน API
   * แสดง progress bar 0%→100% แบบสมจริง + Online/Offline
   */
  async function checkStatus() {
    const badge = document.getElementById('status-badge');
    if (!badge) return;

    const label = badge.querySelector('.status-progress-label');
    const fill = document.getElementById('status-progress-fill');
    if (!label || !fill) return;

    // เริ่ม progress animation
    let pct = 0;
    badge.className = 'status-badge status-loading';

    const interval = setInterval(() => {
      // 0→60% เร็ว (4.5วิแรก) 60→85% ช้าลง
      if (pct < 60) pct += 2;
      else if (pct < 85) pct += 0.8;
      if (pct > 85) pct = Math.min(pct, 85);
      fill.style.width = pct + '%';
      label.textContent = '⏳ ' + Math.floor(pct) + '%';
    }, 150);

    // ยิง API จริง
    try {
      await Api.getWorkers();
      clearInterval(interval);
      // พุ่ง 100% เร็วๆ
      pct = 100;
      fill.style.width = '100%';
      label.textContent = '✅ 100%';
      // delay สั้นให้เห็น 100% ก่อนเปลี่ยน
      await new Promise(r => setTimeout(r, 200));
      badge.className = 'status-badge status-online';
      badge.innerHTML = '🟢 Online v' + APP_VERSION;
    } catch (e) {
      clearInterval(interval);
      pct = 100;
      fill.style.width = '100%';
      label.textContent = '❌ 100%';
      await new Promise(r => setTimeout(r, 200));
      badge.className = 'status-badge status-offline';
      badge.innerHTML = '🔴 Offline v' + APP_VERSION;
    }
  }

  /**
   * บีบอัดรูปภาพด้วย Canvas — resize + ลด quality
   * @param {File} file - ไฟล์รูปจาก input
   * @param {number} maxWidth - ความกว้างสูงสุด (default 1000px)
   * @param {number} quality - คุณภาพ JPEG 0-1 (default 0.7)
   * @returns {Promise<string>} Base64 string
   */
  function compressImage(file, maxWidth = 1000, quality = 0.7) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width;
          let h = img.height;
          if (w > maxWidth) {
            h = (maxWidth / w) * h;
            w = maxWidth;
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => reject(new Error('ไม่สามารถโหลดรูปภาพได้'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
      reader.readAsDataURL(file);
    });
  }

  return { money, formatDate, toInputDate, toast, skeletonRows, errorBanner, escapeHtml, renderShell, compressImage };
})();