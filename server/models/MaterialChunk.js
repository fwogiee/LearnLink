import mongoose from 'mongoose';

const { Schema } = mongoose;

const materialChunkSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    material: { type: Schema.Types.ObjectId, ref: 'LearningMaterial', required: true },
    className: { type: String, default: 'Uncategorized' },
    sourceFile: { type: String, default: '' },
    page: { type: Number },
    section: { type: String, default: '' },
    text: { type: String, required: true },
    embedding: { type: [Number], default: [] },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
  },
);

export default mongoose.model('MaterialChunk', materialChunkSchema);
