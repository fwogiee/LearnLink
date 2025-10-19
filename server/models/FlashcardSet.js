import mongoose from 'mongoose';

const flashcardSchema = new mongoose.Schema(
  {
    term: { type: String, trim: true, default: '' },
    definition: { type: String, trim: true, default: '' },
  },
  { _id: true },
);

const flashcardSetSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    cards: { type: [flashcardSchema], default: [] },
  },
  { timestamps: true },
);

flashcardSetSchema.index({ owner: 1, title: 1 });
flashcardSetSchema.index({ title: 'text', description: 'text' });

const FlashcardSet = mongoose.model('FlashcardSet', flashcardSetSchema);
export default FlashcardSet;
