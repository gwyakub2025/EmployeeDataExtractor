
// --- CONFIGURATION ---
// REPLACE THIS WITH YOUR GOOGLE EMAIL TO BE ADMIN
const ADMIN_EMAILS = ["your-email@gmail.com", "admin@empmas.com"]; 
const DB_SHEET_NAME = "EMPMAS_DB";
const ROOT_FOLDER_NAME = "EMPMAS_Data_Repository";

// --- SERVE HTML ---
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('DataHarmonizer Pro')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// --- UTILS ---
function getDbSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(DB_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(DB_SHEET_NAME);
    // Header Row
    sheet.appendRow(["ID", "Name", "FileId", "UploadDate", "UploadedBy", "HasData"]); 
  }
  return sheet;
}

function getRootFolder() {
  const folders = DriveApp.getFoldersByName(ROOT_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(ROOT_FOLDER_NAME);
}

// --- API METHODS ---

/**
 * Get current user session
 */
function getUserSession() {
  const email = Session.getActiveUser().getEmail();
  // Check if email is in admin list
  const isAdmin = ADMIN_EMAILS.includes(email);
  return {
    uid: Utilities.base64Encode(email),
    email: email,
    role: isAdmin ? 'admin' : 'user'
  };
}

/**
 * Fetch all companies
 */
function getCompanies() {
  const sheet = getDbSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data.shift(); // Remove headers
  
  // Map rows to objects
  return data.map(row => ({
    id: row[0],
    name: row[1],
    storagePath: row[2], // In GAS, this is the File ID
    uploadDate: row[3],
    uploadedBy: row[4],
    hasData: row[5] === true || String(row[5]).toLowerCase() === "true"
  }));
}

/**
 * Create a new Company Entity
 */
function createCompany(name) {
  const user = getUserSession();
  if (user.role !== 'admin') throw new Error("Unauthorized: Admin Access Required");

  const id = 'comp-' + new Date().getTime();
  const sheet = getDbSheet();
  // ID, Name, FileId(empty), Date(empty), By, HasData(false)
  sheet.appendRow([id, name, "", "", user.email, false]);
  
  return { id, name, hasData: false };
}

/**
 * Upload File (Overwrite logic)
 */
function uploadCompanyData(fileData, filename, companyId) {
  const user = getUserSession();
  if (user.role !== 'admin') throw new Error("Unauthorized: Admin Access Required");
  
  const sheet = getDbSheet();
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  
  // Find the row for this companyId
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == companyId) {
      rowIndex = i + 1; // 1-based index
      break;
    }
  }
  
  if (rowIndex === -1) throw new Error("Company entity not found.");
  
  // 1. Save File to Drive
  const folder = getRootFolder();
  const blob = Utilities.newBlob(Utilities.base64Decode(fileData), MimeType.MICROSOFT_EXCEL, filename);
  
  // (Optional) Delete old file if exists to save space
  const oldFileId = data[rowIndex - 1][2];
  if (oldFileId) {
    try { DriveApp.getFileById(oldFileId).setTrashed(true); } catch (e) { console.log("Old file not found or already deleted"); }
  }
  
  const newFile = folder.createFile(blob);
  
  // 2. Update Sheet Record
  // Columns: A=1, B=2, C=3(FileId), D=4(Date), E=5(By), F=6(HasData)
  sheet.getRange(rowIndex, 3).setValue(newFile.getId());
  sheet.getRange(rowIndex, 4).setValue(new Date().toISOString());
  sheet.getRange(rowIndex, 5).setValue(user.email);
  sheet.getRange(rowIndex, 6).setValue(true);
  
  return "Success";
}

/**
 * Delete Company
 */
function deleteCompany(companyId, fileId) {
  const user = getUserSession();
  if (user.role !== 'admin') throw new Error("Unauthorized");
  
  const sheet = getDbSheet();
  const data = sheet.getDataRange().getValues();
  
  // Delete file from Drive
  if (fileId) {
    try { DriveApp.getFileById(fileId).setTrashed(true); } catch(e) {}
  }
  
  // Delete row from Sheet
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == companyId) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
  return "Deleted";
}

/**
 * Download File Data
 */
function getCompanyFile(fileId) {
  const file = DriveApp.getFileById(fileId);
  return Utilities.base64Encode(file.getBlob().getBytes());
}

/**
 * Gemini AI Proxy
 * Note: You must add 'GEMINI_API_KEY' to Project Settings -> Script Properties
 */
function callGemini(prompt) {
  const scriptProperties = PropertiesService.getScriptProperties();
  const apiKey = scriptProperties.getProperty('GEMINI_API_KEY');
  
  if (!apiKey) return "AI Configuration Error: GEMINI_API_KEY not found in Script Properties.";
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const payload = { "contents": [{ "parts": [{ "text": prompt }] }] };
  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());
    
    if (json.error) return "AI Error: " + json.error.message;
    if (!json.candidates || !json.candidates[0]) return "No response generated.";
    
    return json.candidates[0].content.parts[0].text;
  } catch (e) {
    return "Failed to call AI service: " + e.toString();
  }
}
