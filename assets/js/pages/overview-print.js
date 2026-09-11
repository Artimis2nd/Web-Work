(() => {
  const { thaiDateShort, buildOverview } = OverviewLogic;

  function renderRunRow(run) {
    const rangeLabel = run.startDate === run.endDate
      ? thaiDateShort(run.startDate)
      : `${thaiDateShort(run.startDate)} – ${thaiDateShort(run.endDate)}`;
    return `
      <tr>
        <td>${rangeLabel}</td>
        <td class="text-center">${run.days}</td>
        <td>${Utils.escapeHtml(run.jobDetail || '(ไม่ระบุรายละเอียด)')}</td>
        <td class="text-center">${run.avgWorkersPerDay.toFixed(1)}</td>
      </tr>
    `;
  }

  function renderStreakLine(site) {
    if (!site.streaks.length) return 'ยังไม่มีข้อมูลวันทำงาน';
    return site.streaks.map(s => {
      const rangeLabel = s.startDate === s.endDate ? thaiDateShort(s.startDate) : `${thaiDateShort(s.startDate)} – ${thaiDateShort(s.endDate)}`;
      let text = `ทำงานต่อเนื่อง ${s.days} วัน (${rangeLabel})`;
      if (s.gapDays > 0) {
        const gapLabel = s.gapStart === s.gapEnd ? thaiDateShort(s.gapStart) : `${thaiDateShort(s.gapStart)} – ${thaiDateShort(s.gapEnd)}`;
        text += ` → หยุด ${s.gapDays} วัน (${gapLabel})`;
      }
      return text;
    }).join(' → ');
  }

  function renderSite(site) {
    const dateRangeLabel = site.firstDate
      ? (site.firstDate === site.lastDate ? thaiDateShort(site.firstDate) : `${thaiDateShort(site.firstDate)} – ${thaiDateShort(site.lastDate)}`)
      : '-';

    const requesterBlocks = site.requesterReports.map(r => `
      <div class="req-block">
        <div class="req-title">สั่งงานโดย: ${Utils.escapeHtml(r.requester)} (${r.totalGroups} ใบงาน)</div>
        <table class="doc-table">
          <thead>
            <tr><th>ช่วงวันที่</th><th class="text-center">จำนวนวัน</th><th>รายละเอียดงาน</th><th class="text-center">เฉลี่ยคนงาน/วัน</th></tr>
          </thead>
          <tbody>${r.runs.map(renderRunRow).join('')}</tbody>
        </table>
      </div>
    `).join('');

    return `
      <div class="site-block">
        <h2>${Utils.escapeHtml(site.site)}</h2>
        <div class="site-meta">${site.totalGroups} ใบงาน · ${dateRangeLabel}</div>
        <div class="site-streak"><strong>สรุปวันทำงาน:</strong> ${renderStreakLine(site)}</div>
        ${requesterBlocks}
      </div>
    `;
  }

  async function load() {
    const container = document.getElementById('sites-container');
    document.getElementById('generated-at').textContent = new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' });
    try {
      const data = await Api.getLogs({});
      const logs = data.logs || [];
      if (!logs.length) {
        container.innerHTML = '<p>ยังไม่มีข้อมูลใบงาน</p>';
        return;
      }
      const siteReports = buildOverview(logs);
      container.innerHTML = siteReports.map(renderSite).join('');
      document.getElementById('print-btn').disabled = false;
    } catch (err) {
      container.innerHTML = `<p style="color:#c1443c">โหลดข้อมูลไม่สำเร็จ: ${Utils.escapeHtml(err.message)}</p>`;
    }
  }

  load();
})();
