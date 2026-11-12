// Recolor only the garment in the original generated sprite at runtime.
// The face, eyes, sensor tower and wheels keep their original pixels.
export async function createSpritePainter(container) {
  const image = container.querySelector('img'), canvas = container.querySelector('canvas');
  await image.decode();
  const width = 724, height = Math.round(width * image.naturalHeight / image.naturalWidth);
  canvas.width = width; canvas.height = height;
  const context = canvas.getContext('2d', {willReadFrequently: true});
  context.drawImage(image, 0, 0, width, height);
  const original = context.getImageData(0, 0, width, height);
  let current = '';
  return {getTexture() { return canvas.hidden ? image : canvas; }, setOutfit(item) {
    if (current === item.id) return; current = item.id;
    if (item.id === 'milk' || item.id === 'bunny') {
      canvas.hidden = true; image.style.visibility = ''; container.dataset.spriteReady = 'true'; return;
    }
    const pixels = new ImageData(new Uint8ClampedArray(original.data), width, height);
    const color = item.color.match(/[a-f\d]{2}/gi).map(channel => parseInt(channel, 16));
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4, d = pixels.data;
      if (!d[i + 3] || y / height < .2) continue;
      // Protect the entire tan face, including white eye reflections.
      if (((x / width - .5) / .245) ** 2 + ((y / height - .375) / .15) ** 2 < 1) continue;
      const min = Math.min(d[i], d[i + 1], d[i + 2]), max = Math.max(d[i], d[i + 1], d[i + 2]);
      if (min < 150 || max - min > 55) continue;
      const strength = Math.min(1, (min - 150) / 35);
      let pattern = false;
      if (item.pattern === 'dots') pattern = Math.hypot(x % 30 - 15, y % 30 - 15) < 4;
      if (item.pattern === 'stripes') pattern = y % 35 < 10;
      if (item.pattern === 'stars') { const dx = Math.abs(x % 42 - 21), dy = Math.abs(y % 42 - 21); pattern = dx + dy < 6 || dx < 1.4 && dy < 9 || dy < 1.4 && dx < 9; }
      for (let c = 0; c < 3; c++) {
        const target = pattern ? (item.pattern === 'stars' ? [255, 235, 175][c] : 245) : color[c];
        d[i + c] = d[i + c] * (1 - strength) + d[i + c] * target / 245 * strength;
      }
    }
    context.putImageData(pixels, 0, 0); canvas.hidden = false; image.style.visibility = 'hidden';
    container.dataset.spriteReady = 'true';
  }};
}
