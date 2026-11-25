import express from "express";
import mongoose from "mongoose";
import MissingPerson from "../models/MissingPerson.js";
import FoundPerson from "../models/FoundPerson.js";
import { requireAuth } from "../middleware/auth.js";
import { getEmbeddings } from "../utils/aiClient.js";
import { geocode } from "../utils/geocode.js";

const router = express.Router();
router.use(requireAuth);

const GENDERS = ["male", "female", "other"];

// Register a missing person
router.post("/", async (req, res) => {
  const { name, age, gender, description, lastSeenLocation, lastSeenDate, images } =
    req.body || {};

  if (!name?.trim()) return res.status(400).json({ message: "Name is required" });
  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ message: "At least one photo is required" });
  }

  // Face embeddings first: if no photo has a detectable face we refuse to
  // register (previously the person was saved with an empty embedding and
  // could never be matched, without anyone being told).
  const { embeddings, skipped } = await getEmbeddings(images);
  const coords = await geocode(lastSeenLocation);

  const person = await MissingPerson.create({
    name: name.trim(),
    age: age === "" || age == null ? undefined : Number(age),
    gender: GENDERS.includes(gender) ? gender : "unknown",
    description: description || "",
    lastSeenLocation: lastSeenLocation || "",
    lastSeenDate: lastSeenDate ? new Date(lastSeenDate) : undefined,
    coords: coords || undefined,
    images,
    embeddings,
    reportedBy: req.user._id,
  });

  // select:false only hides fields on queries, so strip embeddings here too
  const { embeddings: _omit, ...data } = person.toObject();

  res.status(201).json({
    message: "Missing person registered successfully",
    data,
    skippedPhotos: skipped, // photos where no face was found
    geocoded: Boolean(coords),
  });
});

// List missing persons (newest first)
router.get("/", async (req, res) => {
  const filter = {};
  if (req.query.status === "found") filter.status = "found";
  // records saved before the status field existed count as missing
  if (req.query.status === "missing") filter.status = { $ne: "found" };
  const q = (req.query.q || "").trim();
  if (q) {
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: re }, { lastSeenLocation: re }];
  }
  const people = await MissingPerson.find(filter).sort({ createdAt: -1 }).limit(500);
  res.json({ data: people });
});

// Full case profile, including sightings that matched this person
router.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: "Case not found" });
  }
  const person = await MissingPerson.findById(req.params.id).populate(
    "reportedBy",
    "name email"
  );
  if (!person) return res.status(404).json({ message: "Case not found" });

  const sightings = await FoundPerson.find({ "matches.missingPerson": person._id })
    .sort({ createdAt: -1 })
    .populate("reportedBy", "name")
    .lean();

  res.json({
    data: person,
    sightings: sightings.map((s) => ({
      id: s._id,
      image: s.image,
      location: s.location,
      coords: s.coords,
      seenAt: s.seenAt || s.createdAt,
      description: s.description,
      confidence: s.matches.find((m) => m.missingPerson?.equals(person._id))?.confidence,
      manual: Boolean(s.matches.find((m) => m.missingPerson?.equals(person._id))?.manual),
      reportedBy: s.reportedBy ? { _id: s.reportedBy._id, name: s.reportedBy.name } : null,
    })),
  });
});

// Mark as found / missing again — only the person who reported it, or an admin
router.patch("/:id/status", async (req, res) => {
  const { status } = req.body || {};
  if (!["missing", "found"].includes(status)) {
    return res.status(400).json({ message: "Status must be 'missing' or 'found'" });
  }
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: "Case not found" });
  }
  const person = await MissingPerson.findById(req.params.id);
  if (!person) return res.status(404).json({ message: "Case not found" });

  const isOwner = person.reportedBy?.equals(req.user._id);
  if (!isOwner && req.user.role !== "admin") {
    return res.status(403).json({ message: "Only the reporter or an admin can change this" });
  }

  person.status = status;
  await person.save();
  res.json({ data: person });
});

// Loads a case and checks the user may change it (the reporter or an admin).
// Sends the error response itself and returns null when not allowed.
async function loadEditable(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(404).json({ message: "Case not found" });
    return null;
  }
  const person = await MissingPerson.findById(req.params.id);
  if (!person) {
    res.status(404).json({ message: "Case not found" });
    return null;
  }
  if (!person.reportedBy?.equals(req.user._id) && req.user.role !== "admin") {
    res.status(403).json({ message: "Only the person who reported this case or an admin can change it" });
    return null;
  }
  return person;
}

// Edit case details (photos stay as they are)
router.patch("/:id", async (req, res) => {
  const person = await loadEditable(req, res);
  if (!person) return;
  const b = req.body || {};

  if (b.name !== undefined) {
    if (!String(b.name).trim()) return res.status(400).json({ message: "Name is required" });
    person.name = String(b.name).trim();
  }
  if (b.age !== undefined) person.age = b.age === "" || b.age === null ? undefined : Number(b.age);
  if (b.gender !== undefined) person.gender = GENDERS.includes(b.gender) ? b.gender : "unknown";
  if (b.description !== undefined) person.description = String(b.description);
  if (b.lastSeenDate !== undefined) person.lastSeenDate = b.lastSeenDate ? new Date(b.lastSeenDate) : undefined;

  let geocoded = true;
  if (b.lastSeenLocation !== undefined && b.lastSeenLocation !== person.lastSeenLocation) {
    person.lastSeenLocation = String(b.lastSeenLocation);
    const coords = await geocode(person.lastSeenLocation);
    person.coords = coords || undefined;
    geocoded = Boolean(coords);
  }

  await person.save();
  const { embeddings: _omit, ...data } = person.toObject();
  res.json({ data, geocoded });
});

// Delete a case. Sightings stay (they may matter to other cases) but lose the link.
router.delete("/:id", async (req, res) => {
  const person = await loadEditable(req, res);
  if (!person) return;

  await FoundPerson.updateMany(
    { "matches.missingPerson": person._id },
    { $pull: { matches: { missingPerson: person._id } } }
  );
  await FoundPerson.updateMany({ matches: { $size: 0 } }, { $set: { status: "unmatched" } });
  await person.deleteOne();
  res.json({ message: "Case deleted" });
});

export default router;
