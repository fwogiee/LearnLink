import mongoose from 'mongoose';
import MaterialChunk from './MaterialChunk.js';

const { Schema } = mongoose;

const learningMaterialSchema = new Schema(
  {
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    content: { type: String, default: '' },
    summary: { type: String, default: '' },
    flashcardSet: { type: Schema.Types.ObjectId, ref: 'FlashcardSet' },
    quiz: { type: Schema.Types.ObjectId, ref: 'Quiz' },
    analysisUpdatedAt: { type: Date },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    className: { type: String, default: 'Uncategorized' },
    classColor: { type: String, default: '#3b82f6' },
    createdAt: { type: Date, default: Date.now },
  },
  {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

learningMaterialSchema.virtual('fileUrl').get(function fileUrlGetter() {
  return `/uploads/${this.storedName}`;
});

async function deleteChunksForFilter(filter, model) {
  if (filter?._id) {
    await MaterialChunk.deleteMany({ material: filter._id });
    return;
  }

  const doc = await model.findOne(filter).select('_id');
  if (doc?._id) {
    await MaterialChunk.deleteMany({ material: doc._id });
  }
}

learningMaterialSchema.pre('deleteOne', { document: false, query: true }, async function preDeleteOne(next) {
  try {
    await deleteChunksForFilter(this.getFilter(), this.model);
    next();
  } catch (error) {
    next(error);
  }
});

learningMaterialSchema.pre('findOneAndDelete', { document: false, query: true }, async function preFindOneAndDelete(next) {
  try {
    await deleteChunksForFilter(this.getFilter(), this.model);
    next();
  } catch (error) {
    next(error);
  }
});

export default mongoose.model('LearningMaterial', learningMaterialSchema);
