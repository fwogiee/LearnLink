import mongoose from 'mongoose';

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

export default mongoose.model('LearningMaterial', learningMaterialSchema);
