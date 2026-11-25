import mongoose from "mongoose";

const foundPersonSchema = new mongoose.Schema(
  {
    image: { type: String, default: "" }, // optional for manual sightings
    description: { type: String, default: "" },
    location: { type: String, default: "" },
    coords: new mongoose.Schema({ lat: Number, lng: Number }, { _id: false }),
    seenAt: Date,
    embedding: { type: [Number], select: false },
    matches: [
      {
        _id: false,
        missingPerson: { type: mongoose.Schema.Types.ObjectId, ref: "MissingPerson" },
        distance: Number,
        confidence: Number, // 0-100 (empty for manual reports)
        manual: { type: Boolean, default: false }, // reported via "I've seen this person"
      },
    ],
    status: { type: String, enum: ["matched", "unmatched"], default: "unmatched" },
    reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("FoundPerson", foundPersonSchema, "found_persons");
