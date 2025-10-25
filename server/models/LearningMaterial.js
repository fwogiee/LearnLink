import mongoose from 'mongoose';

// Define the schema for learning materials
const learningMaterialSchema = new mongoose.Schema({
  originalName: { type: String, required: true }, // Original filename from upload
  // Path where the file is stored on the server (relative to an uploads root)
  path: { type: String, required: true },
  mimeType: { type: String, required: true }, // File type (e.g., 'application/pdf', 'text/plain')
  // Extracted text content from the file (via OCR or direct text read)
  content: { type: String },
  // Reference to the user who uploaded the material
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
}, { timestamps: true }); // Automatically add createdAt and updatedAt timestamps

// Create the Mongoose model
const LearningMaterial = mongoose.model('LearningMaterial', learningMaterialSchema);

export default LearningMaterial;
