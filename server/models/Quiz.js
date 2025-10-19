import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
  {
    question: { type: String, trim: true, required: true },
    options: { type: [String], validate: (arr) => arr.length >= 2, default: [] },
    correct: { type: String, trim: true, required: true },
  },
  { _id: false },
);

const quizSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    questions: { type: [questionSchema], default: [] },
  },
  { timestamps: true },
);

quizSchema.index({ owner: 1, title: 1 });

const Quiz = mongoose.model('Quiz', quizSchema);
export default Quiz;
