import LearningMaterial from '../models/LearningMaterial.js';
import MaterialChunk from '../models/MaterialChunk.js';
import { chunkText, ragChunkDefaults } from './ragChunking.js';
import { embedTexts, ragEmbeddingDefaults } from './ragEmbeddings.js';

const DEFAULT_BATCH_SIZE = 24;

export async function indexMaterialChunks(materialId) {
  const material = await LearningMaterial.findById(materialId);
  if (!material) return;

  const text = material.content?.trim();
  if (!text) {
    material.ragStatus = 'failed';
    material.ragUpdatedAt = new Date();
    await material.save();
    return;
  }

  const chunks = chunkText(text, ragChunkDefaults);
  if (!chunks.length) {
    material.ragStatus = 'failed';
    material.ragUpdatedAt = new Date();
    await material.save();
    return;
  }

  await MaterialChunk.deleteMany({ material: material._id });

  const batchSize = Number(process.env.RAG_EMBED_BATCH_SIZE) || DEFAULT_BATCH_SIZE;
  let chunkIndex = 0;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batchTexts = chunks.slice(i, i + batchSize);
    const embeddings = await embedTexts(batchTexts, ragEmbeddingDefaults);

    const docs = batchTexts.map((chunkTextItem, offset) => ({
      user: material.user,
      material: material._id,
      className: material.className,
      sourceFile: material.originalName,
      text: chunkTextItem,
      embedding: embeddings[offset],
      metadata: {
        chunkIndex: chunkIndex + offset,
      },
    }));

    await MaterialChunk.insertMany(docs, { ordered: false });
    chunkIndex += batchTexts.length;
  }

  material.ragStatus = 'ready';
  material.ragUpdatedAt = new Date();
  await material.save();
}

export function indexMaterialInBackground(materialId) {
  return indexMaterialChunks(materialId).catch(async (error) => {
    console.error('RAG indexing failed', error);
    try {
      await LearningMaterial.updateOne(
        { _id: materialId },
        { $set: { ragStatus: 'failed', ragUpdatedAt: new Date() } },
      );
    } catch (updateError) {
      console.error('Failed to update RAG status after indexing error', updateError);
    }
  });
}
