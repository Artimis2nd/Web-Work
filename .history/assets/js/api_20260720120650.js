/**
 * โมดูลกลางสำหรับเรียก Google Apps Script Web App
 * ใช้ Content-Type: text/plain เพื่อให้ browser ส่งเป็น "simple request"
 * (หลีกเลี่ยงปัญหา CORS preflight ที่ Apps Script ไม่รองรับ)
 */
const Api = (() => {
  async function call(action, payload = {}) {
    if (!window.API_URL || window.API_URL.includes('YOUR_DEPLOYMENT_ID')) {
      throw new Error('ยังไม่ได้ตั้งค่า API_URL — กรุณาแก้ไขไฟล์ assets/js/config.js');
    }

    let response;
    try {
      response = await fetch(window.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, payload })
      });
    } catch (networkErr) {
      throw new Error('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตหรือ API_URL');
    }

    if (!response.ok) {
      throw new Error('เซิร์ฟเวอร์ตอบกลับผิดพลาด (HTTP ' + response.status + ')');
    }

    let json;
    try {
      json = await response.json();
    } catch (parseErr) {
      throw new Error('รูปแบบข้อมูลที่ได้รับไม่ถูกต้อง');
    }

    if (!json.ok) {
      throw new Error(json.error || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
    }

    return json.data;
  }

  return {
    getDashboard: () => call('getDashboard'),
    getWorkers: () => call('getWorkers'),
    addWorker: (payload) => call('addWorker', payload),
    updateWorker: (payload) => call('updateWorker', payload),
    deleteWorker: (payload) => call('deleteWorker', payload),
    getLogs: (payload) => call('getLogs', payload),
    addLogs: (payload) => call('addLogs', payload),
    deleteLogGroup: (payload) => call('deleteLogGroup', payload),
    getReport: (payload) => call('getReport', payload),
    getPivotReport: (payload) => call('getPivotReport', payload),
    // === ฟังก์ชันใหม่สำหรับระบบใบงาน v2 ===
    getLogGroup: (payload) => call('getLogGroup', payload),
    updateLogGroup: (payload) => call('updateLogGroup', payload),
    getSiteHistory: () => call('getSiteHistory'),
    getRequesterHistory: () => call('getRequesterHistory')
  };
})();