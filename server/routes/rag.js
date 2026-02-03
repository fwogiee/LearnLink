import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import LearningMaterial from '../models/LearningMaterial.js';
import MaterialChunk from '../models/MaterialChunk.js';
import { embedTexts, ragEmbeddingDefaults } from '../utils/ragEmbeddings.js';
import { generateRagAnswer } from '../utils/ragGeneration.js';

const router = Router();

const DEFAULT_TOP_K = 6;
const DEFAULT_NUM_CANDIDATES = 120;
const MAX_TOP_K = 20;

function buildContextBlocks(results) {
  return results
    .map((chunk, index) => {
      const sourceLines = [
        `Source ${index + 1}`,
        `File: ${chunk.sourceFile || 'Unknown'}`,
        `Class: ${chunk.className || 'Uncategorized'}`,
      ];

      if (chunk.section) sourceLines.push(`Section: ${chunk.section}`);
      if (chunk.page != null) sourceLines.push(`Page: ${chunk.page}`);

      return `${sourceLines.join('\n')}\nText:\n${chunk.text}`.trim();
    })
    .join('\n\n---\n\n');
}

async function runVectorSearch({ userId, query, materialId, className, topK }) {
  const [queryEmbedding] = await embedTexts([query], ragEmbeddingDefaults);
  const limit = Math.min(Number(topK) || DEFAULT_TOP_K, MAX_TOP_K);
  const filter = {
    user: userId,
  };

  if (materialId) {
    filter.material = materialId;
  }

  const requestedClass = className?.trim();
  if (requestedClass) {
    filter.className = requestedClass;
  }

  const pipeline = [
    {
      $vectorSearch: {
        index: 'material_chunks_vector_index',
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: DEFAULT_NUM_CANDIDATES,
        limit,
        filter,
      },
    },
    {
      $project: {
        _id: 1,
        material: 1,
        className: 1,
        sourceFile: 1,
        page: 1,
        section: 1,
        text: 1,
        score: { $meta: 'vectorSearchScore' },
        metadata: 1,
      },
    },
  ];

  return MaterialChunk.aggregate(pipeline);
}

router.post('/search', requireAuth, async (req, res) => {
  try {
    const { materialId, query, topK, className } = req.body || {};

    if (!query?.trim()) {
      return res.status(400).json({ message: 'Query is required.' });
    }

    const searchMaterialId = materialId?.trim();
    let material = null;
    if (searchMaterialId) {
      material = await LearningMaterial.findById(searchMaterialId).select('_id user className ragStatus');
      if (!material) {
        return res.status(404).json({ message: 'Material not found.' });
      }

      if (material.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'You are not allowed to search this material.' });
      }
    }

    const results = await runVectorSearch({
      userId: req.user._id,
      query,
      materialId: material?._id,
      className,
      topK,
    });

    return res.json({
      query,
      results,
    });
  } catch (error) {
    console.error('RAG Search Error:', error);
    const status = error.status || 500;
    const message = status === 429
      ? 'AI rate limit exceeded. Please wait a moment and try again.'
      : 'Failed to perform search.';
    return res.status(status).json({ message });
  }
});

router.post('/answer', requireAuth, async (req, res) => {
  try {
    const { materialId, query, topK, className } = req.body || {};

    if (!query?.trim()) {
      return res.status(400).json({ message: 'Query is required.' });
    }

    const searchMaterialId = materialId?.trim();
    let material = null;
    if (searchMaterialId) {
      material = await LearningMaterial.findById(searchMaterialId).select('_id user className ragStatus');
      if (!material) {
        return res.status(404).json({ message: 'Material not found.' });
      }

      if (material.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'You are not allowed to search this material.' });
      }
    }

    const results = await runVectorSearch({
      userId: req.user._id,
      query,
      materialId: material?._id,
      className,
      topK,
    });

    if (!results.length) {
      return res.json({
        query,
        answer: 'I do not have enough information in the provided materials to answer that.',
        sources: [],
      });
    }

    const context = buildContextBlocks(results);
    const systemInstruction =
      'You are a helpful study assistant. Use only the provided context. ' +
      'If the answer is not in the context, say you do not have enough information. ' +
      'Keep the answer within 3-4 sentences (max 120 words).';
    const prompt = `Question: ${query}\n\nContext:\n${context}\n\nAnswer in 3-4 sentences (max 120 words).`;

    const answer = await generateRagAnswer({ prompt, systemInstruction });

    return res.json({
      query,
      answer,
      sources: results.map((chunk) => ({
        id: chunk._id,
        material: chunk.material,
        className: chunk.className,
        sourceFile: chunk.sourceFile,
        page: chunk.page ?? null,
        section: chunk.section || '',
        score: chunk.score,
        metadata: chunk.metadata || {},
      })),
    });
  } catch (error) {
    console.error('RAG Answer Error:', error);
    const status = error.status || 500;
    const message = status === 429
      ? 'AI rate limit exceeded. Please wait a moment and try again.'
      : 'Failed to generate answer.';
    return res.status(status).json({ message });
  }
});


export default router;
