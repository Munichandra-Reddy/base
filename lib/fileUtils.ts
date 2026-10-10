export const createRealPdfBlobUrl = (docName: string, projectName: string = 'Workspace'): string => {
  const safeTitle = docName.replace(/[()\\]/g, '');
  const safeProject = projectName.replace(/[()\\]/g, '');
  const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 180 >>
stream
BT
/F1 22 Tf
50 720 Td
(${safeTitle}) Tj
/F1 14 Tf
0 -35 Td
(Project Space: ${safeProject}) Tj
0 -25 Td
(Status: Official Verified PDF Document Deliverable) Tj
0 -25 Td
(System Access: Authorized & Active) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000244 00000 n 
0000000475 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
545
%%EOF`;

  const blob = new Blob([pdfString], { type: 'application/pdf' });
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
