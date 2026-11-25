import mongoose from "mongoose";

const coordsSchema = new mongoose.Schema(
  { lat: Number, lng: Number },
  { _id: false }
);

const missingPersonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    age: { type: Number, min: 0, max: 120 },
    gender: { type: String, enum: ["male", "female", "other", "unknown"], default: "unknown" },
    description: { type: String, default: "" },
    lastSeenLocation: { type: String, default: "" },
    lastSeenDate: Date,
    coords: coordsSchema, // from geocoding lastSeenLocation
    images: { type: [String], required: true }, // Cloudinary URLs
    // One FaceNet embedding per usable photo. Hidden from API responses.
    embeddings: { type: [[Number]], select: false },
    status: { type: String, enum: ["missing", "found"], default: "missing" },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model(
  "MissingPerson",
  missingPersonSchema,
  "missing_persons" // collection name shared with the Python AI service
);
