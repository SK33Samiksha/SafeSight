// Geocodes every missing-person / sighting record that has no coordinates yet.
// Usage: npm run fix-coords            (only records without coords)
//        npm run fix-coords -- --all   (re-geocode everything)
import mongoose from "mongoose";
import "../config/env.js";
import connectDB from "../config/db.js";
import MissingPerson from "../models/MissingPerson.js";
import FoundPerson from "../models/FoundPerson.js";
import { geocode } from "../utils/geocode.js";

const all = process.argv.includes("--all");
const filter = all ? {} : { $or: [{ coords: { $exists: false } }, { "coords.lat": null }] };

await connectDB();

let fixed = 0;
let failed = 0;
for (const [Model, field] of [
  [MissingPerson, "lastSeenLocation"],
  [FoundPerson, "location"],
]) {
  const docs = await Model.find(filter);
  for (const doc of docs) {
    const coords = await geocode(doc[field]);
    if (coords) {
      doc.coords = coords;
      await doc.save();
      fixed++;
      console.log(`✔ ${doc[field]} -> ${coords.lat}, ${coords.lng}`);
    } else {
      failed++;
      console.log(`✘ could not geocode "${doc[field]}" (${Model.modelName} ${doc._id})`);
    }
  }
}

console.log(`\nDone: ${fixed} updated, ${failed} could not be geocoded.`);
await mongoose.disconnect();
