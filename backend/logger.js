import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

const LOG_FILE_PATH = path.join(process.cwd(), 'data', 'activity_log.xlsx');

// Ensure parent data directory exists
const ensureDataDir = () => {
  const dataDir = path.dirname(LOG_FILE_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

/**
 * Log an activity to the Excel sheet
 * @param {string} user - Gokul or Nivetha (or Guest/System)
 * @param {string} type - Login, Upload, Profile Edit, Sync, Notification, Admin Change
 * @param {string} details - Detailed text
 * @param {string} status - Success / Failed
 * @param {string} ip - Client IP
 */
export function logActivity(user, type, details, status = 'Success', ip = '127.0.0.1') {
  try {
    ensureDataDir();

    const timestamp = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const newEntry = {
      'Timestamp (IST)': timestamp,
      'User': user,
      'Activity Type': type,
      'Details': details,
      'Status': status,
      'IP Address': ip
    };

    let workbook;
    let worksheet;
    let data = [];

    if (fs.existsSync(LOG_FILE_PATH)) {
      workbook = XLSX.readFile(LOG_FILE_PATH);
      const sheetName = workbook.SheetNames[0];
      worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    } else {
      workbook = XLSX.utils.book_new();
    }

    data.push(newEntry);

    worksheet = XLSX.utils.json_to_sheet(data);
    
    // Auto-fit column widths
    const maxKeys = Object.keys(newEntry);
    const colWidths = maxKeys.map(key => {
      const maxLen = data.reduce((acc, curr) => {
        const val = curr[key] ? String(curr[key]).length : 0;
        return Math.max(acc, val);
      }, key.length);
      return { wch: maxLen + 3 };
    });
    worksheet['!cols'] = colWidths;

    // Replace or add sheet
    if (workbook.SheetNames.includes('Activity Logs')) {
      workbook.Sheets['Activity Logs'] = worksheet;
    } else {
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Activity Logs');
    }

    XLSX.writeFile(workbook, LOG_FILE_PATH);
    console.log(`[ExcelLogger] Successfully logged action: ${type} for ${user}`);
  } catch (error) {
    console.error('[ExcelLogger] Failed to log activity to Excel:', error);
  }
}

/**
 * Retrieve all logged activities
 * @returns {Array} List of logged events
 */
export function getActivities() {
  try {
    if (fs.existsSync(LOG_FILE_PATH)) {
      const workbook = XLSX.readFile(LOG_FILE_PATH);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      return XLSX.utils.sheet_to_json(worksheet);
    }
  } catch (error) {
    console.error('[ExcelLogger] Failed to read activity log:', error);
  }
  return [];
}
