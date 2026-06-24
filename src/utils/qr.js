const QRCode = require('qrcode');

async function generateDataUrl(text) {
  return QRCode.toDataURL(text, {
    errorCorrectionLevel: 'M',
    width: 320,
    margin: 2,
    color: { dark: '#1a7a3d', light: '#ffffff' },
  });
}

module.exports = { generateDataUrl };
