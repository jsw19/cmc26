import assert from 'node:assert/strict';
import { test } from 'node:test';
import jpeg from 'jpeg-js';
import { analyzeVehicleImageLocally } from '../analyzeLocal.ts';

function rgbToPixel(r: number, g: number, b: number): [number, number, number, number] {
  return [r, g, b, 255];
}

function encodeSolidImage(
  width: number,
  height: number,
  fill: [number, number, number, number],
  mutate?: (data: Uint8Array, width: number, height: number) => void,
): string {
  const data = new Uint8Array(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill[0];
    data[i + 1] = fill[1];
    data[i + 2] = fill[2];
    data[i + 3] = fill[3];
  }

  mutate?.(data, width, height);

  const encoded = jpeg.encode({ data, width, height }, 85);
  return Buffer.from(encoded.data).toString('base64');
}

test('does not flag uniform dark underbody shadow as corrosion', async () => {
  const base64 = encodeSolidImage(240, 240, rgbToPixel(30, 30, 30));

  const result = await analyzeVehicleImageLocally(base64, 'file:///shadow.jpg', {
    vehiclePart: 'underbody',
  });

  assert.equal(result.overallSeverity, 'none');
  assert.equal(result.damages.length, 0);
  assert.match(result.summary, /no clear damage indicators|couldn't be completed reliably/i);
});

test('flags textured rust-heavy underbody region as damage', async () => {
  const base64 = encodeSolidImage(240, 240, rgbToPixel(88, 88, 88), (data, width, height) => {
    for (let y = 80; y < 180; y++) {
      for (let x = 70; x < 180; x++) {
        const i = (y * width + x) * 4;
        const isStripe = (x + y) % 12 < 6;
        data[i] = isStripe ? 142 : 110;
        data[i + 1] = isStripe ? 72 : 52;
        data[i + 2] = isStripe ? 36 : 28;
      }
    }

    for (let y = 110; y < 185; y++) {
      for (let x = 95; x < 165; x++) {
        const i = (y * width + x) * 4;
        data[i] = 24;
        data[i + 1] = 22;
        data[i + 2] = 20;
      }
    }
  });

  const result = await analyzeVehicleImageLocally(base64, 'file:///rust.jpg', {
    vehiclePart: 'underbody',
  });

  assert.notEqual(result.overallSeverity, 'none');
  assert.ok(result.damages.some((damage) => damage.type === 'rust'));
});
