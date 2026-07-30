import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { createNodeImageMarker } from '../renderer';

describe('Node shared Recipe conformance', () => {
  it('renders the Core 2.1 cross-platform text fixture', async () => {
    const recipe = JSON.parse(
      await readFile(
        resolve(process.cwd(), '../../conformance/core-2.1-recipe.json'),
        'utf8'
      )
    );
    const background = await sharp({
      create: {
        width: 320,
        height: 180,
        channels: 4,
        background: '#0F172A',
      },
    })
      .png()
      .toBuffer();
    const marker = createNodeImageMarker({ sharp });
    const result = await marker.render(recipe, {
      backgroundImage: { src: background },
    });
    expect(result).toEqual(
      expect.objectContaining({ width: 320, height: 180, format: 'png' })
    );
    const { data, info } = await sharp(result.data)
      .raw()
      .toBuffer({ resolveWithObject: true });
    let changed = 0;
    for (let offset = 0; offset < data.length; offset += info.channels) {
      if (
        data[offset]! > 40 ||
        data[offset + 1]! > 55 ||
        data[offset + 2]! > 80
      ) {
        changed += 1;
      }
    }
    expect(changed).toBeGreaterThan(500);
  });
});
