const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const rootDir = process.cwd();
const publicDir = path.join(rootDir, 'public');
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(buffer) {
  let crc = 0xffffffff;

  for (let index = 0; index < buffer.length; index += 1) {
    crc ^= buffer[index];

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function createPng(width, height, paint) {
  const channels = 4;
  const stride = width * channels;
  const rows = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (stride + 1);
    rows[rowOffset] = 0;

    for (let x = 0; x < width; x += 1) {
      const color = paint(x, y, width, height);
      const offset = rowOffset + 1 + x * channels;
      rows[offset] = color[0];
      rows[offset + 1] = color[1];
      rows[offset + 2] = color[2];
      rows[offset + 3] = color[3];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(rows, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function isInsideRoundedRect(x, y, width, height, radius) {
  const left = radius;
  const right = width - radius - 1;
  const top = radius;
  const bottom = height - radius - 1;

  if (x >= left && x <= right) return true;
  if (y >= top && y <= bottom) return true;

  const cx = x < left ? left : right;
  const cy = y < top ? top : bottom;
  return Math.hypot(x - cx, y - cy) <= radius;
}

function rect(x, y, width, height, box) {
  return x >= box.x && x < box.x + box.width && y >= box.y && y < box.y + box.height;
}

function paintIcon(x, y, width, height) {
  const scale = width / 512;
  const radius = 92 * scale;
  const dark = [17, 24, 39, 255];
  const yellow = [247, 223, 30, 255];
  const transparent = [0, 0, 0, 0];

  if (!isInsideRoundedRect(x, y, width, height, radius)) {
    return transparent;
  }

  const panel = {
    x: 92 * scale,
    y: 74 * scale,
    width: 328 * scale,
    height: 364 * scale,
  };
  const jStem = {
    x: 206 * scale,
    y: 190 * scale,
    width: 54 * scale,
    height: 184 * scale,
  };
  const jHook = {
    x: 122 * scale,
    y: 330 * scale,
    width: 138 * scale,
    height: 50 * scale,
  };
  const sTop = {
    x: 296 * scale,
    y: 190 * scale,
    width: 116 * scale,
    height: 46 * scale,
  };
  const sMid = {
    x: 296 * scale,
    y: 268 * scale,
    width: 112 * scale,
    height: 44 * scale,
  };
  const sBottom = {
    x: 292 * scale,
    y: 346 * scale,
    width: 124 * scale,
    height: 46 * scale,
  };
  const sLeft = {
    x: 292 * scale,
    y: 190 * scale,
    width: 48 * scale,
    height: 122 * scale,
  };
  const sRight = {
    x: 364 * scale,
    y: 268 * scale,
    width: 48 * scale,
    height: 124 * scale,
  };

  if (rect(x, y, width, height, panel)) {
    const checker = (Math.floor(x / (24 * scale)) + Math.floor(y / (24 * scale))) % 2 === 0;
    return checker ? [239, 213, 28, 255] : yellow;
  }

  if (
    rect(x, y, width, height, jStem)
    || rect(x, y, width, height, jHook)
    || rect(x, y, width, height, sTop)
    || rect(x, y, width, height, sMid)
    || rect(x, y, width, height, sBottom)
    || rect(x, y, width, height, sLeft)
    || rect(x, y, width, height, sRight)
  ) {
    return dark;
  }

  return yellow;
}

function writeIcon(size) {
  const filePath = path.join(publicDir, `icon-${size}.png`);
  fs.writeFileSync(filePath, createPng(size, size, paintIcon));
  console.log(`Generated ${path.relative(rootDir, filePath)}`);
}

writeIcon(192);
writeIcon(512);
