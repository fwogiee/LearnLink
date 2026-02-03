import { GoogleGenAI } from '@google/genai';

const DEFAULT_MODEL = 'gemini-embedding-001';
const DEFAULT_DIMENSION = 768;

let client;

function getClient() {
  if (!client) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set.');
    }
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

function normalizeEmbeddings(response, expectedCount) {
  if (!response) {
    throw new Error('Empty embedding response.');
  }

  const embeddings = response.embeddings;
  if (Array.isArray(embeddings)) {
    return embeddings.map((entry) => entry?.values || entry?.embedding?.values || entry);
  }

  if (embeddings?.embedding?.values) {
    return [embeddings.embedding.values];
  }

  if (embeddings?.values) {
    return [embeddings.values];
  }

  if (response.embedding?.values) {
    return [response.embedding.values];
  }

  throw new Error('Unexpected embedding response shape.');
}

export async function embedTexts(texts, { model, outputDimensionality } = {}) {
  if (!Array.isArray(texts) || texts.length === 0) return [];

  const ai = getClient();
  const response = await ai.models.embedContent({
    model: model || process.env.GEMINI_EMBEDDING_MODEL || DEFAULT_MODEL,
    contents: texts,
    config: {
      outputDimensionality:
        outputDimensionality || Number(process.env.GEMINI_EMBEDDING_DIM) || DEFAULT_DIMENSION,
      taskType: 'SEMANTIC_SIMILARITY',
    },
  });

  const vectors = normalizeEmbeddings(response, texts.length);
  if (vectors.length !== texts.length) {
    throw new Error(`Embedding count mismatch. Expected ${texts.length}, got ${vectors.length}.`);
  }

  return vectors;
}

export const ragEmbeddingDefaults = {
  model: DEFAULT_MODEL,
  outputDimensionality: DEFAULT_DIMENSION,
};
