const DEFAULT_MAX_CHARS = 800;
const DEFAULT_OVERLAP = 120;
const DEFAULT_MIN_CHUNK = 200;

function normalizeText(text) {
  return text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function splitLongParagraph(paragraph, maxChars, overlapChars) {
  const chunks = [];
  if (paragraph.length <= maxChars) {
    chunks.push(paragraph);
    return chunks;
  }

  const step = Math.max(1, maxChars - overlapChars);
  for (let start = 0; start < paragraph.length; start += step) {
    const slice = paragraph.slice(start, start + maxChars);
    chunks.push(slice.trim());
  }

  return chunks;
}

function applyOverlap(chunks, overlapChars, maxChars) {
  if (!overlapChars) return chunks;

  const result = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const current = chunks[i];
    const prev = result[result.length - 1];
    if (!prev) {
      result.push(current);
      continue;
    }

    const overlap = prev.slice(-overlapChars);
    if (!overlap) {
      result.push(current);
      continue;
    }

    const combined = `${overlap}\n\n${current}`.trim();
    if (combined.length <= maxChars) {
      result.push(combined);
    } else {
      result.push(combined.slice(combined.length - maxChars));
    }
  }

  return result;
}

export function chunkText(
  text,
  {
    maxChars = DEFAULT_MAX_CHARS,
    overlapChars = DEFAULT_OVERLAP,
    minChunkChars = DEFAULT_MIN_CHUNK,
  } = {},
) {
  if (!text) return [];

  const normalized = normalizeText(text);
  if (!normalized) return [];

  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((para) => para.trim())
    .filter(Boolean);

  const chunks = [];
  let buffer = '';

  const flushBuffer = () => {
    const trimmed = buffer.trim();
    if (trimmed.length >= minChunkChars) {
      chunks.push(trimmed);
    }
    buffer = '';
  };

  for (const paragraph of paragraphs) {
    if (paragraph.length > maxChars) {
      if (buffer) {
        flushBuffer();
      }
      chunks.push(...splitLongParagraph(paragraph, maxChars, overlapChars));
      continue;
    }

    if (!buffer) {
      buffer = paragraph;
      continue;
    }

    const nextLength = buffer.length + paragraph.length + 2;
    if (nextLength <= maxChars) {
      buffer = `${buffer}\n\n${paragraph}`;
    } else {
      flushBuffer();
      buffer = paragraph;
    }
  }

  if (buffer) {
    flushBuffer();
  }

  return applyOverlap(chunks, overlapChars, maxChars);
}

export const ragChunkDefaults = {
  maxChars: DEFAULT_MAX_CHARS,
  overlapChars: DEFAULT_OVERLAP,
  minChunkChars: DEFAULT_MIN_CHUNK,
};
