/**
 * ฟังก์ชันช่วยเหลือที่ใช้ร่วมกันทุกหน้า: จัดรูปแบบตัวเลข/วันที่, Toast, Layout, Loading, Error
 */
const Utils = (() => {
  const THB = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function money(n) {
    return THB.format(Number(n) || 0);
  }

  function formatDate(d) {
    if (!d) return '-';
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
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
          <div class="mt-auto px-2 pt-4 text-xs" style="color:#6B7684">ระบบคิดค่าแรงคนงาน<br>v1.0</div>
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
            <div class="mb-6">
              <h1 class="font-display text-2xl md:text-3xl font-semibold" style="color:var(--ink)">${pageTitle}</h1>
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
  }

  return { money, formatDate, toInputDate, toast, skeletonRows, errorBanner, escapeHtml, renderShell };
})();
