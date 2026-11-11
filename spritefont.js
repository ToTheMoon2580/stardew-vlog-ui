export class SpriteFontRenderer {
  constructor(atlas, metadata) {
    this.atlas = atlas;
    this.glyphs = metadata.glyphs;
    this.cropping = metadata.cropping;
    this.kerning = metadata.kerning;
    this.characters = metadata.characterMap;
    this.lineSpacing = metadata.verticalLineSpacing;
    this.spacing = metadata.horizontalSpacing;
    this.defaultCharacter = metadata.defaultCharacter;
    this.index = new Map(this.characters.map((character, index) => [character, index]));
    this.coloredGlyphCache = new Map();
  }

  glyphFor(character) {
    let index = this.index.get(character);
    if (index === undefined) index = this.index.get(this.defaultCharacter);
    return { index, glyph: this.glyphs[index], crop: this.cropping[index], kern: this.kerning[index] };
  }

  measure(text, scale = 1) {
    const lines = String(text ?? "").split(/\r?\n/);
    let maxWidth = 0;
    for (const line of lines) {
      let x = 0;
      for (let i = 0; i < line.length; i++) {
        const entry = this.glyphFor(line[i]);
        if (!entry.glyph) continue;
        x += i === 0 ? Math.max(entry.kern.x, 0) : this.spacing + entry.kern.x;
        const drawX = x + entry.crop.x;
        maxWidth = Math.max(maxWidth, (drawX + entry.glyph.width) * scale);
        x += entry.kern.y + entry.kern.z;
      }
    }
    return { width: maxWidth, height: lines.length * this.lineSpacing * scale, lineHeight: this.lineSpacing * scale };
  }

  draw(ctx, text, x, y, options = {}) {
    const scale = options.scale ?? 1;
    const color = options.color ?? "#221122";
    const shadowColor = options.shadowColor ?? null;
    const shadowOffsetX = options.shadowOffsetX ?? -3;
    const shadowOffsetY = options.shadowOffsetY ?? 3;
    if (shadowColor) {
      this.drawLines(ctx, text, x + shadowOffsetX, y + shadowOffsetY, scale, shadowColor);
    }
    this.drawLines(ctx, text, x, y, scale, color);
  }

  drawLines(ctx, text, startX, startY, scale, color) {
    const lines = String(text ?? "").split(/\r?\n/);
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];
      let x = 0;
      for (let i = 0; i < line.length; i++) {
        const entry = this.glyphFor(line[i]);
        if (!entry.glyph) continue;
        x += i === 0 ? Math.max(entry.kern.x, 0) : this.spacing + entry.kern.x;
        const drawX = startX + (x + entry.crop.x) * scale;
        const drawY = startY + (entry.crop.y + lineIndex * this.lineSpacing) * scale;
        const glyphCanvas = this.coloredGlyph(entry, color);
        ctx.drawImage(glyphCanvas, Math.round(drawX), Math.round(drawY), Math.round(entry.glyph.width * scale), Math.round(entry.glyph.height * scale));
        x += entry.kern.y + entry.kern.z;
      }
    }
  }

  coloredGlyph(entry, color) {
    const key = entry.index + "|" + color;
    if (this.coloredGlyphCache.has(key)) return this.coloredGlyphCache.get(key);
    const canvas = document.createElement("canvas");
    canvas.width = entry.glyph.width;
    canvas.height = entry.glyph.height;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.atlas, entry.glyph.x, entry.glyph.y, entry.glyph.width, entry.glyph.height, 0, 0, entry.glyph.width, entry.glyph.height);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.coloredGlyphCache.set(key, canvas);
    return canvas;
  }
}

export async function loadImage(url) {
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  await image.decode();
  return image;
}

export async function loadSpriteFont(jsonUrl, imageUrl) {
  const [response, atlas] = await Promise.all([fetch(jsonUrl), loadImage(imageUrl)]);
  const data = await response.json();
  return new SpriteFontRenderer(atlas, data.content);
}
