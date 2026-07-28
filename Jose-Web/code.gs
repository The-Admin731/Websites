/**
 * GOOGLE APPS SCRIPT BACKEND FOR TATTOO APPOINTMENT FORM
 * Architecture: 16-Column Unified Data Storage
 */

const FOLDER_ID = "1Cj1EII3zezwi-Q6fp9Pj8hdIarlvLEzo"; 
const NOTIFICATION_EMAIL = "nikomanosca2006@gmail.com"; 
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

const DEPOSITO_ACTIVO = false;

/**
 * Handles GET requests to verify endpoint connectivity.
 */
function doGet(e) {
  return ContentService
    .createTextOutput("Google Apps Script Endpoint for Tattoo Booking Form is active.")
    .setMimeType(ContentService.MimeType.TEXT);
}

/**
 * Utility function to initialize or verify Row 1 Headers (16 Columns)
 */
function setupSheetHeaders() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const headers = [
    "Date/Time",
    "Status",
    "Client Name",
    "Phone Number",
    "Project Type",
    "Style / Color",
    "Size",
    "Body Location",
    "Budget",
    "Availability",
    "Deposit Status",
    "Additional Notes",
    "Ref Image 1",
    "Ref Image 2",
    "Ref Image 3",
    "Tracking ID"
  ];
  
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#e0e0e0");
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  
  try {
    lock.waitLock(10000);

    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ status: 'error', message: 'Empty or malformed request.' });
    }

    const data = JSON.parse(e.postData.contents);

    // 1. Honeypot Verification
    if (data.company_ref && data.company_ref.trim() !== "") {
      return createJsonResponse({ status: 'error', message: 'Could not process request. Please try again.' });
    }

    // 2. Presence Validations
    if (!data.fullName || !data.phone || !data.projectType) {
      return createJsonResponse({ status: 'error', message: 'Missing required fields.' });
    }

    // Server-side guard for Custom projects
    if (data.projectType === 'Custom' && (!data.files || !Array.isArray(data.files) || data.files.length === 0)) {
      return createJsonResponse({ status: 'error', message: 'You must attach at least 1 reference image for Custom projects.' });
    }

    // 3. Processing and validating reference images
    const fileUrls = [];
    if (data.files && Array.isArray(data.files) && data.files.length > 0) {
      
      if (data.files.length > 3) {
        return createJsonResponse({ status: 'error', message: 'Exceeded maximum limit of 3 reference images.' });
      }

      const folder = DriveApp.getFolderById(FOLDER_ID);

      for (let i = 0; i < data.files.length; i++) {
        const fileObj = data.files[i];

        if (!ALLOWED_MIME_TYPES.includes(fileObj.mimeType.toLowerCase())) {
          return createJsonResponse({ 
            status: 'error', 
            message: `Unsupported file type ("${fileObj.filename}"). Accepted formats: PNG, JPG, WEBP.` 
          });
        }

        const decodedBytes = Utilities.base64Decode(fileObj.base64);
        if (decodedBytes.length > MAX_FILE_SIZE_BYTES) {
          return createJsonResponse({ 
            status: 'error', 
            message: `The file "${fileObj.filename}" exceeds the allowed limit of 5 MB.` 
          });
        }

        const blob = Utilities.newBlob(decodedBytes, fileObj.mimeType, fileObj.filename);
        const fileInDrive = folder.createFile(blob);

        fileInDrive.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        fileUrls.push(fileInDrive.getUrl());
      }
    }

    // Asignar URLs independientes a columnas separadas M, N, O
    const img1 = fileUrls[0] || "";
    const img2 = fileUrls[1] || "";
    const img3 = fileUrls[2] || "";

    // 4. Unified logic for Deposit Status
    let depositToRecord = "N/A (Disabled)";
    if (data.projectType === 'Flash') {
      depositToRecord = "N/A (Not applicable to Flash)";
    } else if (DEPOSITO_ACTIVO && data.projectType === 'Custom') {
      depositToRecord = data.depositStatus || "Pending selection";
    }

    // 5. Initial Pipeline Status
    const initialStatus = "Pending confirmation";

    // 6. Record data into Google Sheets (16 Columns ATÓMICAS)
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const timestamp = new Date();
    const trackingId = "REQ-" + Utilities.formatDate(timestamp, "GMT-5", "yyyyMMdd-HHmmss");
    const formattedDate = Utilities.formatDate(timestamp, "GMT-5", "yyyy-MM-dd HH:mm:ss");

    sheet.appendRow([
      formattedDate,
      initialStatus,
      data.fullName,
      "'" + data.phone,
      data.projectType,
      data.colorType || 'N/A',
      data.size || 'N/A',
      data.bodyLocation || 'N/A',
      data.budget || 'N/A',
      data.availability || 'N/A',
      depositToRecord,
      data.notes || '',
      img1, // Columna M (Ref Image 1)
      img2, // Columna N (Ref Image 2)
      img3, // Columna O (Ref Image 3)
      trackingId // Columna P (Tracking ID)
    ]);

    // 7. Send backup notification email
    sendBackupEmail(data, depositToRecord, fileUrls, trackingId, initialStatus);

    return createJsonResponse({ 
      status: 'success', 
      message: 'Request successfully processed and recorded.',
      trackingId: trackingId
    });

  } catch (err) {
    return createJsonResponse({ status: 'error', message: 'Internal server error: ' + err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function sendBackupEmail(data, depositToRecord, fileUrls, trackingId, initialStatus) {
  try {
    const subject = `New Appointment Request [${data.projectType}] - ${data.fullName} (${trackingId})`;
    
    let linksText = "None attached";
    if (fileUrls.length > 0) {
      linksText = fileUrls.map((url, idx) => `  ${idx + 1}. ${url}`).join("\n");
    }

    const body = `Hi Jose,

You have received a new appointment request from your website.

--- REQUEST DETAILS ---
Tracking ID: ${trackingId}
Initial Status: ${initialStatus}
Project Type: ${data.projectType}
Client Name: ${data.fullName}
Phone Number: ${data.phone}

--- CUSTOM SPECIFICATIONS ---
Style/Color: ${data.colorType || 'N/A'}
Estimated Size: ${data.size || 'N/A'}
Body Location: ${data.bodyLocation || 'N/A'}
Budget: ${data.budget || 'N/A'}
Availability: ${data.availability || 'N/A'}
Deposit Status: ${depositToRecord}

--- ADDITIONAL NOTES ---
${data.notes || 'No additional notes provided.'}

--- REFERENCE IMAGES ---
The following images were saved to Google Drive:
${linksText}

---
This is an automated backup notification.`;

    MailApp.sendEmail(NOTIFICATION_EMAIL, subject, body);
  } catch (emailErr) {
    console.error("Error sending backup email: " + emailErr.toString());
  }
}

function createJsonResponse(dataObject) {
  return ContentService
    .createTextOutput(JSON.stringify(dataObject))
    .setMimeType(ContentService.MimeType.JSON);
}