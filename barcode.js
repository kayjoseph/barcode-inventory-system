const bwipjs = require('bwip-js');

// Generate a valid EAN-13 barcode number
function generateEAN13() {
  let digits = '';
  for (let i = 0; i < 12; i++) {
    digits += Math.floor(Math.random() * 10).toString();
  }
  // Calculate check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const check = (10 - (sum % 10)) % 10;
  return digits + check;
}

// Generate a barcode PNG image as a base64 string
async function generateBarcodeImage(sku) {
  try {
    const png = await bwipjs.toBuffer({
      bcid:        'ean13',       // EAN-13 format
      text:        sku,
      scale:       3,
      height:      15,            // bar height in mm
      includetext: true,
      textxalign:  'center',
      textsize:    10,
    });
    return 'data:image/png;base64,' + png.toString('base64');
  } catch (err) {
    // Fallback to CODE128 if EAN-13 fails (e.g. custom SKU entered by user)
    const png = await bwipjs.toBuffer({
      bcid:        'code128',
      text:        sku,
      scale:       3,
      height:      15,
      includetext: true,
      textxalign:  'center',
      textsize:    10,
    });
    return 'data:image/png;base64,' + png.toString('base64');
  }
}

module.exports = { generateEAN13, generateBarcodeImage };