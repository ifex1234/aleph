const fs = require('fs');
const path = require('path');

const pngPath = path.join(__dirname, '..', 'build-resources', 'icons', '512x512.png');
const icoPath = path.join(__dirname, '..', 'build-resources', 'icons', 'icon.ico');

const png = fs.readFileSync(pngPath);

// ICO header (6 bytes)
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0); // Reserved (0)
icoHeader.writeUInt16LE(1, 2); // Type (1 = ICO)
icoHeader.writeUInt16LE(1, 4); // Number of images

// Image directory entry (16 bytes)
const dirEntry = Buffer.alloc(16);
dirEntry.writeUInt8(0, 0); // Width (0 = 256)
dirEntry.writeUInt8(0, 1); // Height (0 = 256)
dirEntry.writeUInt8(0, 2); // Color palette (0 = no palette)
dirEntry.writeUInt8(0, 3); // Reserved
dirEntry.writeUInt16LE(1, 4); // Color planes
dirEntry.writeUInt16LE(32, 6); // Bits per pixel
dirEntry.writeUInt32LE(png.length, 8); // Size of image data
dirEntry.writeUInt32LE(22, 12); // Offset of image data (6 + 16 = 22)

const ico = Buffer.concat([icoHeader, dirEntry, png]);
fs.writeFileSync(icoPath, ico);
console.log('Created icon.ico with 256x256 PNG');