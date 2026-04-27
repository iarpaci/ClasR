const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

async function extractText(buffer, filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  if (ext === 'pdf') {
    const result = await pdfParse(buffer);
    return result.text;
  }
  if (ext === 'txt') {
    return buffer.toString('utf-8');
  }
  throw new Error('Only .docx, .pdf and .txt files are supported');
}

module.exports = { extractText };
