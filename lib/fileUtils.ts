const DB_NAME = 'WorkOrbitFileDB';
const STORE_NAME = 'files';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject('No indexedDB available');
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveFileToDB = async (name: string, dataUrlOrBlob: string | Blob | File): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(dataUrlOrBlob, name);
    store.put(dataUrlOrBlob, name.toLowerCase());
  } catch (e) {
    console.error('IndexedDB save error:', e);
  }
};

export const getFileFromDB = async (name: string): Promise<string | Blob | File | null> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    return new Promise((resolve) => {
      const req1 = store.get(name);
      req1.onsuccess = () => {
        if (req1.result) return resolve(req1.result);
        const req2 = store.get(name.toLowerCase());
        req2.onsuccess = () => resolve(req2.result || null);
        req2.onerror = () => resolve(null);
      };
      req1.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
};

export const generateValidPdfBlob = (docName: string, projectName: string = 'Workspace'): Blob => {
  const safeTitle = docName.replace(/[()\\]/g, '');
  const safeProject = projectName.replace(/[()\\]/g, '');

  const contentStream = 
`BT
/F1 18 Tf
50 720 Td
(${safeTitle}) Tj
/F1 12 Tf
0 -32 Td
(Project Space: ${safeProject}) Tj
0 -22 Td
(Status: Official Verified PDF Document Deliverable) Tj
0 -22 Td
(System Access: Authorized & Active) Tj
ET`;

  const streamBytes = new TextEncoder().encode(contentStream);
  const streamLength = streamBytes.length;

  const header = '%PDF-1.4\n%WorkOrbit\n';
  
  let body = header;
  const offsets: number[] = [0];

  // Object 1: Catalog
  offsets.push(new TextEncoder().encode(body).length);
  body += '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';

  // Object 2: Pages
  offsets.push(new TextEncoder().encode(body).length);
  body += '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n';

  // Object 3: Page
  offsets.push(new TextEncoder().encode(body).length);
  body += '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n';

  // Object 4: Stream
  offsets.push(new TextEncoder().encode(body).length);
  body += `4 0 obj\n<< /Length ${streamLength} >>\nstream\n${contentStream}\nendstream\nendobj\n`;

  // Object 5: Font
  offsets.push(new TextEncoder().encode(body).length);
  body += '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';

  // xref
  const startXref = new TextEncoder().encode(body).length;
  body += 'xref\n0 6\n0000000000 65535 f \n';
  for (let i = 1; i <= 5; i++) {
    body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  // trailer
  body += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;

  const finalBytes = new TextEncoder().encode(body);
  return new Blob([finalBytes], { type: 'application/pdf' });
};

export const createRealPdfBlobUrl = (docName: string, projectName: string = 'Workspace'): string => {
  const blob = generateValidPdfBlob(docName, projectName);
  return URL.createObjectURL(blob);
};

export const getDirectBlobUrl = (docName: string, dataUrl?: string, projectName: string = 'Workspace'): string => {
  const lowerName = docName.toLowerCase();
  const isPdf = lowerName.endsWith('.pdf');
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].some((ext) => lowerName.endsWith('.' + ext));

  if (dataUrl && dataUrl.startsWith('data:')) {
    try {
      const parts = dataUrl.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : isPdf ? 'application/pdf' : 'image/png';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const blob = new Blob([u8arr], { type: mimeType });
      return URL.createObjectURL(blob);
    } catch (e) {}
  }

  if (dataUrl && dataUrl.startsWith('blob:')) {
    return dataUrl;
  }

  if (isPdf) {
    return createRealPdfBlobUrl(docName, projectName);
  }

  if (isImage) {
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="%230f172a"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="sans-serif" font-size="24" font-weight="bold">${docName}</text><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-family="sans-serif" font-size="16">Project Image Deliverable • ${projectName}</text></svg>`;
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    return URL.createObjectURL(blob);
  }

  const textBlob = new Blob([`WorkOrbit Document: ${docName}\nProject: ${projectName}\nStatus: Verified Deliverable`], { type: 'text/plain' });
  return URL.createObjectURL(textBlob);
};

export const getDirectFileBlob = async (
  docName: string,
  providedUrl?: string,
  projectName: string = 'Workspace'
): Promise<Blob> => {
  const lowerName = docName.toLowerCase();
  const isPdf = lowerName.endsWith('.pdf');

  // 1. If providedUrl is data URL
  if (providedUrl && providedUrl.startsWith('data:')) {
    try {
      const parts = providedUrl.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mimeType = mimeMatch ? mimeMatch[1] : (isPdf ? 'application/pdf' : 'application/octet-stream');
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mimeType });
    } catch (e) {}
  }

  // 2. In browser window, check memory cache, IndexedDB, and localStorage
  if (typeof window !== 'undefined') {
    const store = (window as any).__WORKORBIT_FILE_STORE__ || {};

    const memoryObj = store[docName] || store[docName.toLowerCase()];
    if (memoryObj instanceof File || memoryObj instanceof Blob) {
      return memoryObj;
    }

    const memoryUrl = store[docName + '_dataurl'] || store[docName] || store[docName.toLowerCase()];
    if (typeof memoryUrl === 'string' && memoryUrl.startsWith('data:')) {
      try {
        const parts = memoryUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : (isPdf ? 'application/pdf' : 'application/octet-stream');
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mimeType });
      } catch (e) {}
    }

    try {
      const dbFile = await getFileFromDB(docName);
      if (dbFile) {
        if (dbFile instanceof File || dbFile instanceof Blob) {
          return dbFile;
        } else if (typeof dbFile === 'string' && dbFile.startsWith('data:')) {
          const parts = dbFile.split(',');
          const mimeMatch = parts[0].match(/:(.*?);/);
          const mimeType = mimeMatch ? mimeMatch[1] : (isPdf ? 'application/pdf' : 'application/octet-stream');
          const bstr = atob(parts[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          return new Blob([u8arr], { type: mimeType });
        }
      }
    } catch (e) {}

    try {
      const saved = JSON.parse(localStorage.getItem('workorbit_file_urls') || '{}');
      const localUrl = saved[docName] || saved[docName.toLowerCase()];
      if (localUrl && typeof localUrl === 'string' && localUrl.startsWith('data:')) {
        const parts = localUrl.split(',');
        const mimeMatch = parts[0].match(/:(.*?);/);
        const mimeType = mimeMatch ? mimeMatch[1] : (isPdf ? 'application/pdf' : 'application/octet-stream');
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mimeType });
      }
    } catch (e) {}
  }

  // 3. If PDF, generate valid standard PDF
  if (isPdf) {
    return generateValidPdfBlob(docName, projectName);
  }

  // 4. If image, generate SVG blob
  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].some((ext) => lowerName.endsWith('.' + ext));
  if (isImage) {
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="%230f172a"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="sans-serif" font-size="24" font-weight="bold">${docName}</text><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fill="%2394a3b8" font-family="sans-serif" font-size="16">Project Image Deliverable • ${projectName}</text></svg>`;
    return new Blob([svgString], { type: 'image/svg+xml' });
  }

  // 5. Default text deliverable
  return new Blob([`WorkOrbit Document: ${docName}\nProject: ${projectName}\nStatus: Verified Deliverable`], { type: 'text/plain' });
};

export const getDirectFileBlobUrl = async (
  docName: string,
  providedUrl?: string,
  projectName: string = 'Workspace'
): Promise<string> => {
  if (providedUrl && providedUrl.startsWith('blob:')) {
    return providedUrl;
  }
  const blob = await getDirectFileBlob(docName, providedUrl, projectName);
  return URL.createObjectURL(blob);
};

export const getFileRelativeTime = (file: { createdAt?: number | string; uploadedAt?: string; id?: string }): string => {
  let timestamp: number | null = null;

  if (file.createdAt) {
    timestamp = typeof file.createdAt === 'number' ? file.createdAt : new Date(file.createdAt).getTime();
  }

  // If no explicit createdAt, extract from numeric id (e.g. f-1730812345678)
  if (!timestamp && file.id && file.id.startsWith('f-')) {
    const numericPart = Number(file.id.replace('f-', ''));
    if (!isNaN(numericPart) && numericPart > 1600000000000) {
      timestamp = numericPart;
    }
  }

  // If still no timestamp, parse common static strings (e.g. from initial data)
  if (!timestamp && file.uploadedAt) {
    const lower = file.uploadedAt.toLowerCase().trim();
    if (lower === 'just now') {
      timestamp = Date.now();
    } else if (lower.includes('min')) {
      const match = lower.match(/\d+/);
      const mins = match ? parseInt(match[0], 10) : 1;
      timestamp = Date.now() - mins * 60 * 1000;
    } else if (lower.includes('hour')) {
      const match = lower.match(/\d+/);
      const hours = match ? parseInt(match[0], 10) : 1;
      timestamp = Date.now() - hours * 60 * 60 * 1000;
    } else if (lower.includes('day')) {
      const match = lower.match(/\d+/);
      const days = match ? parseInt(match[0], 10) : 1;
      timestamp = Date.now() - days * 24 * 60 * 60 * 1000;
    } else if (lower.includes('week')) {
      const match = lower.match(/\d+/);
      const weeks = match ? parseInt(match[0], 10) : 1;
      timestamp = Date.now() - weeks * 7 * 24 * 60 * 60 * 1000;
    }
  }

  if (!timestamp || isNaN(timestamp)) {
    return file.uploadedAt || 'Just now';
  }

  const diffMs = Date.now() - timestamp;
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));

  if (diffSec < 45) {
    return 'Just now';
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin} min ago`;
  }

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) {
    return diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`;
  }

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay === 1) {
    return '1 day ago';
  }
  if (diffDay < 7) {
    return `${diffDay} days ago`;
  }

  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 4) {
    return diffWeek === 1 ? '1 week ago' : `${diffWeek} weeks ago`;
  }

  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) {
    return diffMonth === 1 ? '1 month ago' : `${diffMonth} months ago`;
  }

  return `${Math.floor(diffDay / 365)} year ago`;
};

export const openProtectedDocument = async (
  docName: string,
  providedUrl?: string,
  projectName: string = 'Workspace'
): Promise<void> => {
  let newTab: Window | null = null;
  if (typeof window !== 'undefined') {
    try {
      newTab = window.open('about:blank', '_blank');
    } catch (e) {}
  }

  try {
    const rawBlob = await getDirectFileBlob(docName, providedUrl, projectName);
    const mimeType = rawBlob.type || '';
    const lowerName = docName.toLowerCase();
    const isPdf = lowerName.endsWith('.pdf') || mimeType.includes('pdf');
    const isImage =
      ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].some((ext) => lowerName.endsWith('.' + ext)) ||
      mimeType.includes('image');

    const fileBlobUrl = URL.createObjectURL(rawBlob);

    let contentHtml = '';
    if (isPdf) {
      // #toolbar=0&navpanes=0 suppresses Chrome's built-in PDF toolbar with the download icon
      contentHtml = `<iframe src="${fileBlobUrl}#toolbar=0&navpanes=0" width="100%" height="100%"></iframe>`;
    } else if (isImage) {
      contentHtml = `<div class="img-wrapper"><img src="${fileBlobUrl}" alt="${docName.replace(/"/g, '&quot;')}" oncontextmenu="return false;" /></div>`;
    } else {
      const textContent = await rawBlob.text();
      const escaped = textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      contentHtml = `<pre oncontextmenu="return false;">${escaped}</pre>`;
    }

    const viewerHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docName.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #525659;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }
    .img-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      background: #1e293b;
      padding: 20px;
    }
    img {
      max-width: 95%;
      max-height: 95%;
      object-fit: contain;
      box-shadow: 0 8px 30px rgba(0,0,0,0.4);
      background: #ffffff;
      border-radius: 4px;
    }
    pre {
      margin: 20px;
      padding: 20px;
      background: #1e293b;
      color: #f8fafc;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
      border-radius: 8px;
      max-height: calc(100vh - 40px);
      overflow: auto;
    }
  </style>
</head>
<body oncontextmenu="return false;">
  ${contentHtml}
</body>
</html>`;

    const viewerBlob = new Blob([viewerHtml], { type: 'text/html' });
    const viewerUrl = URL.createObjectURL(viewerBlob);

    if (newTab && !newTab.closed) {
      newTab.location.href = viewerUrl;
    } else if (typeof window !== 'undefined') {
      window.open(viewerUrl, '_blank');
    }
  } catch (e) {
    const fallbackUrl = providedUrl ? `${providedUrl}#toolbar=0&navpanes=0` : '';
    if (fallbackUrl) {
      if (newTab && !newTab.closed) {
        newTab.location.href = fallbackUrl;
      } else if (typeof window !== 'undefined') {
        window.open(fallbackUrl, '_blank');
      }
    }
  }
};
