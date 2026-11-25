import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // select:false -> the password hash is never returned unless explicitly asked for
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["citizen", "family", "admin"],
      default: "citizen",
    },
  },
  { timestamps: true }
);

// Safe public shape sent to the frontend
userSchema.methods.toPublic = function () {
  return {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    createdAt: this.createdAt,
  };
};

export default mongoose.model("User", userSchema);
