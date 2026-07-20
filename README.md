# ระบบคิดค่าแรงคนงาน (Wage Management System)

ระบบจัดการค่าแรงคนงานรายวัน — Frontend เป็น Static Site (โฮสต์บน GitHub Pages) เชื่อมต่อกับ Google Sheets ผ่าน Google Apps Script ที่ทำหน้าที่เป็น REST-like JSON API

## โครงสร้างโฟลเดอร์

```
wage-system/
├── Code.gs                      # Backend (วางใน Google Apps Script)
├── index.html                   # แดชบอร์ด
├── daily-log.html               # บันทึกงานประจำวัน
├── report.html                  # สรุปรายบุคคล
├── pivot-report.html            # สรุปรายวัน / ไซต์งาน
├── workers.html                 # จัดการรายชื่อคนงาน
└── assets/
    ├── css/
    │   └── style.css            # ธีม + Design tokens (ใช้ร่วมกับ Tailwind CDN)
    └── js/
        ├── config.js            # ใส่ Web App URL ตรงนี้
        ├── api.js                # โมดูลกลางสำหรับเรียก API
        ├── utils.js              # ฟังก์ชันช่วยเหลือ + Layout ของ Sidebar
        └── pages/
            ├── dashboard.js
            ├── daily-log.js
            ├── report.js
            ├── pivot-report.js
            └── workers.js
```

---

## ขั้นตอนที่ 1: ตั้งค่า Backend (Google Apps Script)

1. สร้าง Google Sheets ใหม่ 1 ไฟล์ (จะเป็นฐานข้อมูลของระบบ) — ตั้งชื่อ เช่น `WageSystem-Data`
2. เปิดเมนู **Extensions > Apps Script**
3. ลบโค้ดเดิมทั้งหมดในไฟล์ `Code.gs` แล้ววางโค้ดจากไฟล์ `Code.gs` ที่ให้มาแทน
4. รันฟังก์ชัน `setupSheets` หนึ่งครั้ง (เลือกฟังก์ชันจาก dropdown ด้านบน แล้วกด Run)
   - ระบบจะขอ Authorize สิทธิ์เข้าถึง Google Sheets ของบัญชีคุณ — กด "Allow"
   - ฟังก์ชันนี้จะสร้างชีต `Workers` และ `DailyLogs` พร้อมหัวคอลัมน์ให้อัตโนมัติ
5. Deploy เป็น Web App:
   - เมนู **Deploy > New deployment**
   - เลือกประเภท (Select type) เป็น **Web app**
   - Description: ใส่ชื่ออะไรก็ได้ เช่น `wage-api-v1`
   - **Execute as**: `Me` (บัญชีของคุณ)
   - **Who has access**: `Anyone` (จำเป็น เพื่อให้ GitHub Pages เรียกเข้ามาได้โดยไม่ต้อง Login)
   - กด **Deploy** แล้วคัดลอก **Web app URL** ที่ได้ (จะลงท้ายด้วย `/exec`)
6. ทุกครั้งที่แก้ไขโค้ด `Code.gs` ในอนาคต ต้องไปที่ **Deploy > Manage deployments** กดไอคอนดินสอ (Edit) แล้วเลือก **New version** เพื่ออัปเดต URL เดิมให้ใช้โค้ดล่าสุด

> **หมายเหตุด้านความปลอดภัย**: Web App URL นี้ทำหน้าที่เสมือนกุญแจเข้าระบบ ไม่ควรเผยแพร่แบบสาธารณะเกินความจำเป็น และห้ามฝัง Google API Key หรือ OAuth Credentials อื่นใดไว้ฝั่ง Frontend เด็ดขาด — ทุกการเชื่อมต่อ Google Sheets ต้องผ่าน Web App URL นี้เท่านั้น

---

## ขั้นตอนที่ 2: ตั้งค่า Frontend

1. เปิดไฟล์ `assets/js/config.js`
2. แก้ไขค่า `API_URL` ให้เป็น Web App URL ที่ได้จากขั้นตอนที่ 1:
   ```js
   window.API_URL = 'https://script.google.com/macros/s/xxxxxxxxxxxxxxxx/exec';
   ```
3. อัปโหลดไฟล์ทั้งหมด (ยกเว้น `Code.gs` และ `README.md`) ขึ้น GitHub Repository
4. เปิดใช้งาน GitHub Pages: **Settings > Pages > Branch: main / (root)**
5. เข้าใช้งานผ่าน URL ที่ GitHub Pages มอบให้ เช่น `https://yourname.github.io/wage-system/`

---

## โครงสร้างข้อมูลใน Google Sheets

### ชีต `Workers`

| คอลัมน์ | ประเภท | คำอธิบาย |
|---|---|---|
| `ID` | ตัวเลข | รหัสคนงาน (ระบบสร้างให้อัตโนมัติ) |
| `FullName` | ข้อความ | ชื่อ-นามสกุลคนงาน |
| `DailyWage` | ตัวเลข | ค่าแรงขั้นต่ำต่อวัน (บาท) |
| `Status` | ข้อความ | `Active` หรือ `Inactive` |

### ชีต `DailyLogs`

| คอลัมน์ | ประเภท | คำอธิบาย |
|---|---|---|
| `ID` | ตัวเลข | รหัสรายการ (1 แถว = คนงาน 1 คน ในบันทึกงาน 1 ครั้ง) |
| `GroupID` | ข้อความ | รหัสผูกกลุ่ม — ใช้เมื่อบันทึกงานครั้งเดียวมีคนงานหลายคน (ลบ/แก้ทั้งชุดพร้อมกัน) |
| `Date` | วันที่ | วันที่ทำงาน |
| `Site` | ข้อความ | ไซต์งาน / โครงการ |
| `JobDetail` | ข้อความ | รายละเอียดงาน |
| `WorkerName` | ข้อความ | ชื่อคนงาน (คัดลอกมาจากตอนบันทึก เพื่อรักษาประวัติแม้ภายหลังแก้ไขชื่อในตาราง Workers) |
| `RawWage` | ตัวเลข | ค่าแรงดิบของคนงานคนนั้นในวันนั้น |
| `TotalWithMarkup` | ตัวเลข | ค่าแรง +20% (`RawWage × 1.2`) |
| `RequestedBy` | ข้อความ | ผู้สั่งงาน |
| `CreatedAt` | วันที่-เวลา | เวลาที่บันทึกเข้าระบบ (ใช้เรียงลำดับ "ล่าสุด") |

> เหตุผลที่ 1 บันทึกงาน (เลือกคนงานหลายคนพร้อมกัน) ถูกแตกเป็นหลายแถวโดยใช้ `GroupID` ร่วมกัน: เพื่อให้หน้า "สรุปรายบุคคล" คำนวณยอดที่ต้องจ่ายให้คนงานแต่ละคนได้ถูกต้องแม่นยำ ในขณะที่หน้าแดชบอร์ดและหน้าลบข้อมูลยังสามารถจัดการทั้ง "ชุดบันทึกงาน" (ทุกคนในงานเดียวกัน) พร้อมกันได้ผ่าน `GroupID`

---

## สรุป API Endpoints (Action-based ผ่าน POST เดียว)

Frontend เรียกทุก action ผ่าน `POST` ไปที่ URL เดียวกัน โดยส่ง body เป็น JSON รูปแบบ `{ "action": "...", "payload": {...} }`

| Action | คำอธิบาย |
|---|---|
| `getDashboard` | ข้อมูลสรุปสำหรับหน้าแดชบอร์ด (KPI + บันทึกล่าสุด) |
| `getWorkers` | รายชื่อคนงานทั้งหมด |
| `addWorker` / `updateWorker` / `deleteWorker` | จัดการคนงาน |
| `getLogs` | รายการบันทึกงานทั้งหมด |
| `addLogs` | บันทึกงานใหม่ (รับคนงานได้หลายคนในครั้งเดียว) |
| `deleteLogGroup` | ลบบันทึกงานทั้งชุด (ตาม `GroupID`) |
| `getReport` | สรุปยอดรายบุคคล (กรองตามชื่อ/ช่วงวันที่) |
| `getPivotReport` | สรุปยอดรวมตามวันหรือไซต์งาน |

---

## หมายเหตุทางเทคนิค

- Frontend เรียก API ด้วย `Content-Type: text/plain` โดยเจตนา (ดูใน `assets/js/api.js`) เพื่อให้ Browser ส่งเป็น "simple request" หลีกเลี่ยงปัญหา CORS preflight (OPTIONS) ที่ Google Apps Script ไม่รองรับ
- ทุกหน้ามี Loading Skeleton ระหว่างรอข้อมูล และ Error Banner พร้อมปุ่ม "ลองใหม่" เมื่อเชื่อมต่อ API ไม่สำเร็จ
- ค่า Markup +20% คำนวณที่ฝั่ง Backend (`Code.gs`) เพื่อป้องกันความไม่ตรงกันหากมีการแก้ไขสูตรในอนาคต
