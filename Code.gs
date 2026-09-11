/**
 * ระบบคิดค่าแรงคนงาน — Backend (Google Apps Script) v2.3
 * =======================================================
 * 
 * วิธีติดตั้ง:
 * 1. สร้าง Google Sheets ใหม่
 * 2. เปิด Extensions > Apps Script
 * 3. วางโค้ดนี้ใน Code.gs
 * 4. รัน setupSheets() หนึ่งครั้ง
 * 5. Deploy > New deployment > Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 6. คัดลอก Web app URL ไปใส่ใน assets/js/config.js
 *
 * การอัปโหลดรูปภาพ:
 * - ต้องสร้าง Folder ใน Google Drive และใส่ Folder ID ด้านล่าง
 * - Apps Script ต้องได้รับอนุญาตให้เข้าถึง Drive
 * - รูปจะถูกจัดเก็บในโฟลเดอร์: {วันที่}_A{timestamp}_{GroupID4ตัวแรก}/
 * - ชื่อไฟล์: {groupId8ตัว}_{index}.jpg
 * - ข้อมูล URLs เก็บในชีต Images (แยกจาก DailyLogs)
 */

// ============================================================
// CONFIGURATION
// ============================================================
var DRIVE_FOLDER_ID = '1Os8Ntkx2DR5xbzK0JHE_hPG1OjA0WAgp'; // โฟลเดอร์หลักสำหรับเก็บรูปภาพ
var BACKUP_FOLDER_ID = '1Ixsqd83JazQOqf5QFhfVqLIQcF28AEFU'; // โฟลเดอร์สำหรับเก็บไฟล์สำรอง (Backup) ของ Spreadsheet
var BACKUP_NAME_PREFIX = 'เบิกงวด'; // คำนำหน้าชื่อไฟล์ backup — ใช้กรองไม่ให้ listBackups() ดึงไฟล์อื่นในโฟลเดอร์เดียวกันมาด้วย
var MARKUP_RATE = 1.2; // +20%
var HOURLY_DIVISOR = 8; // 1 วัน = 8 ชม.
var FERN_NAME = 'เฟิร์น'; // ชื่อคนงานที่ยกเว้น markup

// ============================================================
// SHEET NAMES
// ============================================================
var SHEET_WORKERS = 'Workers';
var SHEET_LOGS = 'DailyLogs';
var SHEET_IMAGES = 'Images';

// ============================================================
// SETUP — รันครั้งแรกเพื่อสร้างชีต
// ============================================================
function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // --- Workers ---
  var ws = ss.getSheetByName(SHEET_WORKERS);
  if (!ws) ws = ss.insertSheet(SHEET_WORKERS);
  ws.clear();
  ws.appendRow(['ID', 'FullName', 'DailyWage', 'Status']);
  ws.getRange('A1:D1').setFontWeight('bold');

  // --- DailyLogs (v2) ---
  var ls = ss.getSheetByName(SHEET_LOGS);
  if (!ls) ls = ss.insertSheet(SHEET_LOGS);
  ls.clear();
  ls.appendRow([
    'ID', 'GroupID', 'Date', 'Site', 'JobDetail', 'RequestedBy',
    'WorkerName', 'DailyWage', 'WageType', 'Hours', 'OTHours', 'FixedAmount',
    'RawWage', 'TotalWithMarkup', 'CreatedAt'
  ]);
  ls.getRange('A1:O1').setFontWeight('bold');

  // --- Images ---
  var im = ss.getSheetByName(SHEET_IMAGES);
  if (!im) im = ss.insertSheet(SHEET_IMAGES);
  im.clear();
  im.appendRow(['GroupID', 'ImageUrls']);
  im.getRange('A1:B1').setFontWeight('bold');

  // สร้าง Folder ใน Drive ถ้ายังไม่มี
  try {
    DriveApp.getFolderById(DRIVE_FOLDER_ID);
  } catch (e) {
    var parent = DriveApp.getRootFolder();
    parent.createFolder('WageSystem-Images');
    Logger.log('กรุณาสร้าง Folder และใส่ ID ใน DRIVE_FOLDER_ID');
  }

  SpreadsheetApp.flush();
  Logger.log('ตั้งค่า Sheets เรียบร้อย');
}

/**
 * ฟังก์ชันซ่อมแซมข้อมูล — เรียงเลข ID คนงานในชีต Workers ใหม่ให้เป็นตัวเลขเรียง 1,2,3...
 * ใช้แก้ปัญหา ID เก่าที่เป็น string แปลกๆ (เช่น "W1784178589597") ซึ่งทำให้เพิ่ม/แก้ไข/ลบคนงานพัง
 * วิธีใช้: เลือกฟังก์ชันนี้จาก dropdown ด้านบนของ Apps Script editor แล้วกด Run (รันครั้งเดียว)
 * ปลอดภัย — ไม่กระทบข้อมูลใบงาน (DailyLogs) เพราะระบบอ้างอิงคนงานด้วยชื่อ ไม่ใช่ ID
 */
function renumberWorkerIds() {
  var sheet = getSheet(SHEET_WORKERS);
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  for (var i = 2; i <= lastRow; i++) {
    sheet.getRange(i, 1).setValue(i - 1);
  }
  SpreadsheetApp.flush();
  Logger.log('เรียงเลข ID คนงานใหม่เรียบร้อย ' + (lastRow - 1) + ' คน');
}

// ============================================================
// DO GET/POST
// ============================================================
function doGet() {
  return HtmlService.createHtmlOutput('API is running. Use POST.');
}

function doPost(e) {
  var response = { ok: false, error: null, data: null };
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var payload = body.payload || {};

    switch (action) {
      case 'getWorkers': response.data = getWorkers(); break;
      case 'addWorker': response.data = addWorker(payload); break;
      case 'updateWorker': response.data = updateWorker(payload); break;
      case 'deleteWorker': response.data = deleteWorker(payload); break;
      case 'getDashboard': response.data = getDashboard(); break;
      case 'getLogs': response.data = getLogs(payload); break;
      case 'addLogs': response.data = addLogs(payload); break;
      case 'deleteLogGroup': response.data = deleteLogGroup(payload); break;
      case 'getLogGroup': response.data = getLogGroup(payload); break;
      case 'updateLogGroup': response.data = updateLogGroup(payload); break;
      case 'getReport': response.data = getReport(payload); break;
      case 'getPivotReport': response.data = getPivotReport(payload); break;
      case 'getSiteHistory': response.data = getSiteHistory(); break;
      case 'getRequesterHistory': response.data = getRequesterHistory(); break;
      case 'backupSpreadsheet': response.data = backupSpreadsheet(); break;
      case 'clearAllLogs': response.data = clearAllLogs(); break;
      case 'listBackups': response.data = listBackups(); break;
      case 'getBackupData': response.data = getBackupData(payload); break;
      case 'restoreBackupGroups': response.data = restoreBackupGroups(payload); break;
      default: throw new Error('Unknown action: ' + action);
    }
    response.ok = true;
  } catch (err) {
    response.error = err.message || 'Unknown error';
    Logger.log('Error: ' + err.message);
  }
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// HELPERS
// ============================================================
function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error('Sheet "' + name + '" not found. Run setupSheets() first.');
  return sheet;
}

function getData(sheet) {
  var rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];
  var headers = rows[0];
  var result = [];
  for (var i = 1; i < rows.length; i++) {
    var row = rows[i];
    if (!row[0]) continue;
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    result.push(obj);
  }
  return result;
}

function generateId() { return Utilities.getUuid(); }
function nowISO() { return new Date().toISOString(); }

function calcWage(dailyWage, wageType, hours, otHours, fixedAmount) {
  dailyWage = Number(dailyWage) || 0;
  hours = Number(hours) || 0;
  otHours = Number(otHours) || 0;
  fixedAmount = Number(fixedAmount) || 0;
  if (wageType === 'fixed') return fixedAmount;
  var hourlyRate = dailyWage / HOURLY_DIVISOR;
  return (hourlyRate * hours) + (hourlyRate * 2 * otHours);
}

function calcTotal(rawWage, workerName, wageType) {
  if (wageType === 'fixed') return rawWage;
  if (workerName && workerName.indexOf(FERN_NAME) !== -1) return rawWage;
  return rawWage * MARKUP_RATE;
}

// ============================================================
// IMAGES SHEET HELPERS
// ============================================================
function getImageUrlsByGroupId(groupId) {
  var sheet = getSheet(SHEET_IMAGES);
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(groupId)) {
      var urls = [];
      try { urls = JSON.parse(data[i][1]) || []; } catch (e) { return []; }
      // แปลง URL เก่า (uc?export=view) ให้เป็น thumbnail เพื่อให้แสดงรูปใน <img> ได้
      return urls.map(function(url) {
        if (url.indexOf('uc?export=view') !== -1) {
          var match = url.match(/id=([^&]+)/);
          if (match) return 'https://drive.google.com/thumbnail?id=' + match[1] + '&sz=w1000';
        }
        return url;
      });
    }
  }
  return [];
}

function saveImageUrls(groupId, urls) {
  var sheet = getSheet(SHEET_IMAGES);
  var data = sheet.getDataRange().getValues();
  var urlsJson = JSON.stringify(urls);
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(groupId)) {
      sheet.getRange(i + 1, 2).setValue(urlsJson);
      SpreadsheetApp.flush();
      return;
    }
  }
  sheet.appendRow([groupId, urlsJson]);
  SpreadsheetApp.flush();
}

function deleteImageUrls(groupId) {
  var sheet = getSheet(SHEET_IMAGES);
  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === String(groupId)) {
      sheet.deleteRow(i + 1);
    }
  }
  SpreadsheetApp.flush();
}

// ============================================================
// WORKERS
// ============================================================
function getWorkers() { return getData(getSheet(SHEET_WORKERS)); }

function addWorker(payload) {
  var sheet = getSheet(SHEET_WORKERS);
  var data = sheet.getDataRange().getValues();
  var maxId = 0;
  for (var i = 1; i < data.length; i++) {
    var idNum = Number(data[i][0]);
    if (!isNaN(idNum)) maxId = Math.max(maxId, idNum); // ข้าม ID เก่าที่ไม่ใช่ตัวเลข (เช่น "W...") ไม่ให้ NaN ทำให้ ID ใหม่พัง
  }
  sheet.appendRow([maxId + 1, payload.fullName, Number(payload.dailyWage) || 0, payload.status || 'Active']);
  SpreadsheetApp.flush();
  return { id: maxId + 1 };
}

function updateWorker(payload) {
  var sheet = getSheet(SHEET_WORKERS);
  var data = sheet.getDataRange().getValues();
  var id = String(payload.id);
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      sheet.getRange(i + 1, 2).setValue(payload.fullName);
      sheet.getRange(i + 1, 3).setValue(Number(payload.dailyWage) || 0);
      sheet.getRange(i + 1, 4).setValue(payload.status || 'Active');
      SpreadsheetApp.flush();
      return { id: id };
    }
  }
  throw new Error('ไม่พบคนงาน ID: ' + id);
}

function deleteWorker(payload) {
  var sheet = getSheet(SHEET_WORKERS);
  var data = sheet.getDataRange().getValues();
  var id = String(payload.id);
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id) {
      sheet.deleteRow(i + 1);
      SpreadsheetApp.flush();
      return { deleted: true };
    }
  }
  throw new Error('ไม่พบคนงาน ID: ' + id);
}

// ============================================================
// DASHBOARD
// ============================================================
function getDashboard() {
  var workers = getWorkers();
  var logs = getData(getSheet(SHEET_LOGS));
  var totalWorkers = workers.filter(function(w) { return w.Status === 'Active'; }).length;
  var groups = {};
  logs.forEach(function(row) {
    var gid = row.GroupID;
    if (!gid) return;
    if (!groups[gid]) {
      groups[gid] = { groupId: gid, date: row.Date, site: row.Site, jobDetail: row.JobDetail, requestedBy: row.RequestedBy, workers: [], totalRaw: 0, totalNormal: 0, totalFixed: 0, createdAt: row.CreatedAt };
    }
    // Fallback: ถ้าแถวแรกไม่มีข้อมูล JobDetail/RequestedBy ให้ลองหาจากแถวถัดไปในกลุ่มเดียวกัน
    if (!groups[gid].jobDetail && row.JobDetail) { groups[gid].jobDetail = row.JobDetail; }
    if (!groups[gid].requestedBy && row.RequestedBy) { groups[gid].requestedBy = row.RequestedBy; }

    var g = groups[gid];
    g.workers.push(row.WorkerName);
    g.totalRaw += Number(row.RawWage) || 0;
    if (row.WageType === 'fixed') {
      g.totalFixed += Number(row.TotalWithMarkup) || 0;
    } else {
      g.totalNormal += Number(row.TotalWithMarkup) || 0;
    }
  });
  var groupList = Object.keys(groups).map(function(gid) { return groups[gid]; });
  groupList.sort(function(a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
  var totalNormalWage = 0, totalFixedWage = 0;
  groupList.forEach(function(g) { totalNormalWage += g.totalNormal; totalFixedWage += g.totalFixed; });
  var recentGroups = groupList.slice(0, 50).map(function(g) {
    return { groupId: g.groupId, date: g.date, site: g.site, jobDetail: g.jobDetail, requestedBy: g.requestedBy, workerCount: g.workers.length, totalNormal: g.totalNormal, totalFixed: g.totalFixed };
  });
  return { totalWorkers: totalWorkers, totalLogGroups: groupList.length, totalNormalWage: totalNormalWage, totalFixedWage: totalFixedWage, recentGroups: recentGroups };
}

// ============================================================
// DATE HELPER — แปลง Date object → YYYY-MM-DD string (local time)
// ============================================================
function toLocalDateStr(d) {
  if (!d) return '';
  var date = new Date(d);
  if (isNaN(date.getTime())) return '';
  var y = date.getFullYear();
  var m = date.getMonth() + 1;
  var day = date.getDate();
  return y + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
}

// ============================================================
// LOGS
// ============================================================
function getLogs(payload) {
  var logs = getData(getSheet(SHEET_LOGS));

  // Filter by date range if provided — ใช้ toLocalDateStr เพื่อหลีกเลี่ยงปัญหา timezone offset
  if (payload.startDate) {
    logs = logs.filter(function(row) { return row.Date && toLocalDateStr(row.Date) >= payload.startDate; });
  }
  if (payload.endDate) {
    logs = logs.filter(function(row) { return row.Date && toLocalDateStr(row.Date) <= payload.endDate; });
  }

  // Group rows by GroupID
  var groups = {};
  logs.forEach(function(row) {
    var gid = row.GroupID;
    if (!gid) return;

    if (!groups[gid]) {
      groups[gid] = {
        GroupID: gid,
        Date: row.Date,
        Site: row.Site,
        JobDetail: row.JobDetail,
        RequestedBy: row.RequestedBy,
        Workers: [] // This is the array the frontend expects
      };
    }
    groups[gid].Workers.push(row); // Push the full row object for the worker
  });

  var groupList = Object.keys(groups).map(function(gid) { return groups[gid]; });
  groupList.sort(function(a, b) {
    var dateA = a.Date ? toLocalDateStr(a.Date) : '';
    var dateB = b.Date ? toLocalDateStr(b.Date) : '';
    return dateB.localeCompare(dateA);
  });

  return { logs: groupList }; // Return in the expected { logs: [...] } format
}

function addLogs(payload) {
  var sheet = getSheet(SHEET_LOGS);
  var groupId = generateId();
  var date = payload.date;
  var site = payload.site;
  var jobDetail = payload.jobDetail;
  var requestedBy = payload.requestedBy;
  var workers = payload.workers || [];
  var images = payload.images || [];
  var now = nowISO();

  // อัปโหลดรูป — สร้างโฟลเดอร์ใหม่โดยตรง
  var imageUrls = [];
  if (images.length > 0) {
    try {
      var folder = createGroupFolder(date, groupId);
      imageUrls = uploadImages(images, groupId, date, folder);
      Logger.log('Uploaded ' + imageUrls.length + ' images for ' + groupId);
    } catch (e) {
      Logger.log('Image upload failed (non-fatal): ' + e.message);
      imageUrls = [];
    }
    saveImageUrls(groupId, imageUrls);
  }

  var data = sheet.getDataRange().getValues();
  var maxId = 0;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0]) maxId = Math.max(maxId, Number(data[i][0]));
  }
  var totalMarkup = 0, count = 0;

  workers.forEach(function(w) {
    maxId++;
    var rawWage = calcWage(w.dailyWage, w.wageType, w.hours, w.otHours, w.fixedAmount);
    var totalWage = calcTotal(rawWage, w.workerName, w.wageType);
    totalMarkup += totalWage;
    count++;
    sheet.appendRow([maxId, groupId, date, site, jobDetail, requestedBy, w.workerName, Number(w.dailyWage) || 0, w.wageType || 'hourly', Number(w.hours) || 0, Number(w.otHours) || 0, Number(w.fixedAmount) || 0, rawWage, totalWage, now]);
  });

  SpreadsheetApp.flush();
  return { count: count, totalMarkup: totalMarkup, groupId: groupId, imageCount: imageUrls.length };
}

function deleteLogGroup(payload) {
  var sheet = getSheet(SHEET_LOGS);
  var data = sheet.getDataRange().getValues();
  var groupId = payload.groupId;
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][1]) === String(groupId)) sheet.deleteRow(i + 1);
  }
  deleteImageUrls(groupId);
  SpreadsheetApp.flush();
  return { deleted: true };
}

function getLogGroup(payload) {
  var logs = getData(getSheet(SHEET_LOGS));
  var groupId = payload.groupId;
  var groupRows = logs.filter(function(row) { return String(row.GroupID) === String(groupId); });
  if (!groupRows.length) throw new Error('ไม่พบใบงานที่ระบุ');
  var first = groupRows[0];
  var imageUrls = getImageUrlsByGroupId(groupId);
  var workers = groupRows.map(function(row) {
    return { workerName: row.WorkerName, dailyWage: Number(row.DailyWage) || 0, wageType: row.WageType || 'hourly', hours: Number(row.Hours) || 0, otHours: Number(row.OTHours) || 0, fixedAmount: Number(row.FixedAmount) || 0, RawWage: Number(row.RawWage) || 0, TotalWithMarkup: Number(row.TotalWithMarkup) || 0 };
  });
  return { groupId: groupId, date: first.Date, site: first.Site, jobDetail: first.JobDetail, requestedBy: first.RequestedBy, imageUrls: imageUrls, workers: workers };
}

function updateLogGroup(payload) {
  var sheet = getSheet(SHEET_LOGS);
  var groupId = payload.groupId;
  if (!groupId) throw new Error('ต้องระบุ GroupId สำหรับการแก้ไข');
  var date = payload.date;
  var site = payload.site;
  var jobDetail = payload.jobDetail;
  var requestedBy = payload.requestedBy;
  var workers = payload.workers || [];
  var images = payload.images || [];
  var now = nowISO();

  // ลบรายการเก่า
  var data = sheet.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (String(data[i][1]) === String(groupId)) sheet.deleteRow(i + 1);
  }

  // จัดการรูป — แยก Base64 กับ URL
  var base64Images = [];
  var existingUrls = [];
  images.forEach(function(img) {
    if (img.indexOf('data:') === 0) base64Images.push(img);
    else existingUrls.push(img);
  });

  var finalUrls = existingUrls;
  if (base64Images.length > 0) {
    try {
      // สร้างหรือใช้โฟลเดอร์ที่มีอยู่
      var folder = createGroupFolder(date, groupId);
      var newUrls = uploadImages(base64Images, groupId, date, folder);
      finalUrls = finalUrls.concat(newUrls);
    } catch (e) {
      Logger.log('Image upload failed during update (non-fatal): ' + e.message);
    }
  }
  saveImageUrls(groupId, finalUrls);

  var newData = sheet.getDataRange().getValues();
  var maxId = 0;
  for (var j = 1; j < newData.length; j++) {
    if (newData[j][0]) maxId = Math.max(maxId, Number(newData[j][0]));
  }
  var totalMarkup = 0, count = 0;

  workers.forEach(function(w) {
    maxId++;
    var rawWage = calcWage(w.dailyWage, w.wageType, w.hours, w.otHours, w.fixedAmount);
    var totalWage = calcTotal(rawWage, w.workerName, w.wageType);
    totalMarkup += totalWage;
    count++;
    sheet.appendRow([maxId, groupId, date, site, jobDetail, requestedBy, w.workerName, Number(w.dailyWage) || 0, w.wageType || 'hourly', Number(w.hours) || 0, Number(w.otHours) || 0, Number(w.fixedAmount) || 0, rawWage, totalWage, now]);
  });

  SpreadsheetApp.flush();
  return { count: count, totalMarkup: totalMarkup, groupId: groupId, imageCount: finalUrls.length };
}

// ============================================================
// IMAGE UPLOAD
// ============================================================

/**
 * สร้างโฟลเดอร์สำหรับใบงาน
 * ชื่อ: {date}_A{timestamp5}_{groupId4}/
 */
function createGroupFolder(dateStr, groupId) {
  var parent = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  var shortId = groupId.substring(0, 4);
  var ts = String(Math.floor(new Date().getTime() / 1000)).slice(-5);
  var folderName = dateStr + '_A' + ts + '_' + shortId;
  return parent.createFolder(folderName);
}

/**
 * อัปโหลดรูปภาพหลายรูปไปยังโฟลเดอร์
 */
function uploadImages(base64Array, groupId, date, folder) {
  if (!base64Array || base64Array.length === 0 || !folder) return [];
  var urls = [];
  base64Array.forEach(function(base64, idx) {
    try {
      urls.push(uploadSingleImage(base64, groupId, idx, folder));
    } catch (e) {
      Logger.log('Upload image ' + idx + ' failed: ' + e.message);
    }
  });
  return urls;
}

/**
 * อัปโหลดรูปภาพเดี่ยว
 * ชื่อไฟล์: {groupId8ตัว}_{index}.jpg
 */
function uploadSingleImage(base64, groupId, index, folder) {
  var matches = base64.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/);
  if (!matches) throw new Error('รูปแบบ Base64 ไม่ถูกต้อง');
  var ext = matches[1] === 'png' ? 'png' : 'jpg';
  var data = Utilities.base64Decode(matches[2]);
  var shortId = groupId.substring(0, 8);
  var fileName = shortId + '_' + index + '.' + ext;
  var blob = Utilities.newBlob(data, 'image/' + ext, fileName);
  var file = folder.createFile(blob);
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    Logger.log('setSharing failed (non-fatal): ' + e.message);
  }
  return 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1000';
}

// ============================================================
// HISTORY
// ============================================================
function getSiteHistory() {
  var logs = getData(getSheet(SHEET_LOGS));
  var sites = {};
  logs.forEach(function(row) { if (row.Site) sites[row.Site] = true; });
  return Object.keys(sites).sort();
}

function getRequesterHistory() {
  var logs = getData(getSheet(SHEET_LOGS));
  var requesters = {};
  logs.forEach(function(row) { if (row.RequestedBy) requesters[row.RequestedBy] = true; });
  return Object.keys(requesters).sort();
}

// ============================================================
// REPORTS
// ============================================================
function getReport(payload) {
  var logs = getData(getSheet(SHEET_LOGS));
  if (payload.workerName) logs = logs.filter(function(row) { return row.WorkerName === payload.workerName; });
  if (payload.startDate) logs = logs.filter(function(row) { return row.Date && toLocalDateStr(row.Date) >= payload.startDate; });
  if (payload.endDate) logs = logs.filter(function(row) { return row.Date && toLocalDateStr(row.Date) <= payload.endDate; });
  var totalRaw = 0, totalMarkup = 0;
  var logList = logs.map(function(row) {
    var raw = Number(row.RawWage) || 0, markup = Number(row.TotalWithMarkup) || 0;
    totalRaw += raw; totalMarkup += markup;
    return { Date: row.Date, Site: row.Site, JobDetail: row.JobDetail, RequestedBy: row.RequestedBy, WorkerName: row.WorkerName, WageType: row.WageType, Hours: row.Hours, OTHours: row.OTHours, FixedAmount: row.FixedAmount, RawWage: raw, TotalWithMarkup: markup };
  });
  return { totalRaw: totalRaw, totalMarkup: totalMarkup, logs: logList };
}

function getPivotReport(payload) {
  var logs = getData(getSheet(SHEET_LOGS));
  if (payload.startDate) logs = logs.filter(function(row) { return row.Date && toLocalDateStr(row.Date) >= payload.startDate; });
  if (payload.endDate) logs = logs.filter(function(row) { return row.Date && toLocalDateStr(row.Date) <= payload.endDate; });
  var groupBy = payload.groupBy === 'site' ? 'Site' : 'Date';
  var groups = {};
  logs.forEach(function(row) {
    var key = row[groupBy] || '(ไม่ระบุ)';
    if (!groups[key]) groups[key] = { key: key, workerSet: {}, logCount: 0, totalRaw: 0, totalMarkup: 0 };
    var g = groups[key];
    g.workerSet[row.WorkerName] = true;
    g.logCount++;
    g.totalRaw += Number(row.RawWage) || 0;
    g.totalMarkup += Number(row.TotalWithMarkup) || 0;
  });
  var rows = Object.keys(groups).map(function(key) {
    var g = groups[key];
    return { key: g.key, workerCount: Object.keys(g.workerSet).length, logCount: g.logCount, totalRaw: g.totalRaw, totalMarkup: g.totalMarkup };
  });
  rows.sort(function(a, b) { return String(a.key).localeCompare(String(b.key)); });
  var grandTotalRaw = 0, grandTotalMarkup = 0;
  rows.forEach(function(r) { grandTotalRaw += r.totalRaw; grandTotalMarkup += r.totalMarkup; });
  return { groupBy: groupBy, grandTotalRaw: grandTotalRaw, grandTotalMarkup: grandTotalMarkup, rows: rows };
}

// ============================================================
// BACKUP / CLEAR
// ============================================================

/**
 * สำเนาไฟล์ Spreadsheet ปัจจุบัน (WageSystem-Data) ไปเก็บไว้ใน BACKUP_FOLDER_ID
 * ตั้งชื่อไฟล์สำเนาเป็น "เบิกงวด DD-MM-YYYY"
 */
function backupSpreadsheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var file = DriveApp.getFileById(ss.getId());
  var folder = DriveApp.getFolderById(BACKUP_FOLDER_ID);
  var newName = BACKUP_NAME_PREFIX + ' ' + formatBackupDate();
  var copy = file.makeCopy(newName, folder);
  return { fileId: copy.getId(), fileName: copy.getName(), url: copy.getUrl() };
}

function formatBackupDate() {
  var d = new Date();
  var day = String(d.getDate()).padStart(2, '0');
  var month = String(d.getMonth() + 1).padStart(2, '0');
  var year = d.getFullYear();
  return day + '-' + month + '-' + year;
}

/**
 * ล้างรายการใบงานทั้งหมดในชีต DailyLogs และ Images (คงหัวคอลัมน์ไว้)
 * ไม่ยุ่งกับชีต Workers และไม่ลบไฟล์รูปภาพใน Drive
 */
function clearAllLogs() {
  var logSheet = getSheet(SHEET_LOGS);
  var logLastRow = logSheet.getLastRow();
  if (logLastRow > 1) logSheet.deleteRows(2, logLastRow - 1);

  var imgSheet = getSheet(SHEET_IMAGES);
  var imgLastRow = imgSheet.getLastRow();
  if (imgLastRow > 1) imgSheet.deleteRows(2, imgLastRow - 1);

  SpreadsheetApp.flush();
  return { cleared: true };
}

/**
 * แสดงรายชื่อไฟล์ Backup ทั้งหมดในโฟลเดอร์ BACKUP_FOLDER_ID เรียงจากใหม่ไปเก่า
 */
function listBackups() {
  var folder = DriveApp.getFolderById(BACKUP_FOLDER_ID);
  var files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  var result = [];
  while (files.hasNext()) {
    var f = files.next();
    if (f.getName().indexOf(BACKUP_NAME_PREFIX) !== 0) continue; // ข้ามไฟล์ที่ไม่ใช่ backup (เช่นไฟล์ฐานข้อมูลจริง หรือไฟล์อื่นในโฟลเดอร์เดียวกัน)
    result.push({ id: f.getId(), name: f.getName(), createdDate: f.getDateCreated().toISOString() });
  }
  result.sort(function(a, b) { return b.createdDate.localeCompare(a.createdDate); });
  return result;
}

/**
 * อ่านข้อมูลใบงาน (DailyLogs) จากไฟล์ Backup ที่ระบุ — อ่านอย่างเดียว ไม่แก้ไขไฟล์ backup หรือข้อมูลปัจจุบัน
 */
function getBackupData(payload) {
  var fileId = payload.fileId;
  if (!fileId) throw new Error('ต้องระบุ fileId ของไฟล์ backup');

  var backupSs = SpreadsheetApp.openById(fileId);
  var logSheet = backupSs.getSheetByName(SHEET_LOGS);
  if (!logSheet) throw new Error('ไม่พบชีต "' + SHEET_LOGS + '" ในไฟล์ backup นี้');

  var logs = getData(logSheet);
  var groups = {};
  logs.forEach(function(row) {
    var gid = row.GroupID;
    if (!gid) return;
    if (!groups[gid]) {
      groups[gid] = { GroupID: gid, Date: row.Date, Site: row.Site, JobDetail: row.JobDetail, RequestedBy: row.RequestedBy, Workers: [] };
    }
    groups[gid].Workers.push(row);
  });

  var groupList = Object.keys(groups).map(function(gid) { return groups[gid]; });
  groupList.sort(function(a, b) {
    var dateA = a.Date ? toLocalDateStr(a.Date) : '';
    var dateB = b.Date ? toLocalDateStr(b.Date) : '';
    return dateB.localeCompare(dateA);
  });

  return { fileName: backupSs.getName(), logs: groupList };
}

/**
 * กู้คืนใบงานที่เลือก (ตาม GroupID) จากไฟล์ Backup กลับเข้าระบบปัจจุบัน
 * - ใบงานที่ GroupID ซ้ำกับที่มีอยู่แล้วในระบบจะถูกข้าม (ไม่เขียนทับ)
 * - คัดลอกรูปภาพ (Images) ของใบงานที่กู้คืนสำเร็จมาด้วย — ไฟล์รูปจริงยังอยู่ที่ Drive เดิม ไม่ได้ถูกลบตอน "ล้างบันทึก"
 */
function restoreBackupGroups(payload) {
  var fileId = payload.fileId;
  var groupIds = payload.groupIds || [];
  if (!fileId) throw new Error('ต้องระบุ fileId ของไฟล์ backup');
  if (!groupIds.length) throw new Error('กรุณาเลือกใบงานที่ต้องการกู้คืนอย่างน้อย 1 รายการ');

  var backupSs = SpreadsheetApp.openById(fileId);
  var backupLogSheet = backupSs.getSheetByName(SHEET_LOGS);
  if (!backupLogSheet) throw new Error('ไม่พบชีต "' + SHEET_LOGS + '" ในไฟล์ backup นี้');

  var backupLogs = getData(backupLogSheet);
  var backupGroupRows = {};
  backupLogs.forEach(function(row) {
    var gid = String(row.GroupID);
    if (!backupGroupRows[gid]) backupGroupRows[gid] = [];
    backupGroupRows[gid].push(row);
  });

  var liveSheet = getSheet(SHEET_LOGS);
  var liveData = liveSheet.getDataRange().getValues();
  var existingGroupIds = {};
  var maxId = 0;
  for (var i = 1; i < liveData.length; i++) {
    if (liveData[i][1]) existingGroupIds[String(liveData[i][1])] = true;
    if (liveData[i][0]) maxId = Math.max(maxId, Number(liveData[i][0]));
  }

  var restoredGroupIds = [];
  var skippedGroupIds = [];
  var rowsToAppend = [];

  groupIds.forEach(function(gidRaw) {
    var gid = String(gidRaw);
    if (existingGroupIds[gid] || !backupGroupRows[gid]) {
      skippedGroupIds.push(gid);
      return;
    }
    backupGroupRows[gid].forEach(function(row) {
      maxId++;
      rowsToAppend.push([
        maxId, row.GroupID, row.Date, row.Site, row.JobDetail, row.RequestedBy,
        row.WorkerName, row.DailyWage, row.WageType, row.Hours, row.OTHours,
        row.FixedAmount, row.RawWage, row.TotalWithMarkup, row.CreatedAt
      ]);
    });
    restoredGroupIds.push(gid);
  });

  if (rowsToAppend.length > 0) {
    liveSheet.getRange(liveSheet.getLastRow() + 1, 1, rowsToAppend.length, rowsToAppend[0].length).setValues(rowsToAppend);
  }

  if (restoredGroupIds.length > 0) {
    var backupImgSheet = backupSs.getSheetByName(SHEET_IMAGES);
    if (backupImgSheet) {
      var backupImgData = backupImgSheet.getDataRange().getValues();
      var liveImgSheet = getSheet(SHEET_IMAGES);
      var restoredSet = {};
      restoredGroupIds.forEach(function(gid) { restoredSet[gid] = true; });
      for (var k = 1; k < backupImgData.length; k++) {
        var imgGid = String(backupImgData[k][0]);
        if (restoredSet[imgGid]) {
          liveImgSheet.appendRow([backupImgData[k][0], backupImgData[k][1]]);
        }
      }
    }
  }

  SpreadsheetApp.flush();
  return { restored: restoredGroupIds, skipped: skippedGroupIds };
}