import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
    },
    displayName: {
      type: String,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
  },
  { timestamps: true },
);

userSchema.virtual('safe').get(function safe() {
  return {
    id: this._id,
    username: this.username,
    displayName: this.displayName || this.username,
    role: this.role,
  };
});

const User = mongoose.model('User', userSchema);
export default User;
