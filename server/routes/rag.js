import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import LearningMaterial from '../models/LearningMaterial.js';
import MaterialChunk from '../models/MaterialChunk.js';
import { embedTexts, ragEmbeddingDefaults } from '../utils/ragEmbeddings.js';

const router = Router();

const DEFAULT_TOP_K = 6;
const DEFAULT_NUM_CANDIDATES = 120;

router.post('/search', requireAuth, async (req, res) => {
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

  const [queryEmbedding] = await embedTexts([query], ragEmbeddingDefaults);
  const limit = Math.min(Number(topK) || DEFAULT_TOP_K, 20);
  const filter = {
    user: req.user._id,
  };

  if (material) {
    filter.material = material._id;
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

  const results = await MaterialChunk.aggregate(pipeline);

  return res.json({
    query,
    results,
  });
});

export default router;
