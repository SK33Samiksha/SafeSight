import express from "express";
import mongoose from "mongoose";
import FoundPerson from "../models/FoundPerson.js";
import MissingPerson from "../models/MissingPerson.js";
import { requireAuth } from "../middleware/auth.js";
import { matchFace } from "../utils/aiClient.js";
import { geocode } from "../utils/geocode.js";

const router = express.Router();
router.use(requireAuth);

/**
 * Report a sighting.
 *  - With a photo: run AI face matching against all active cases.
 *  - With missingPersonId ("I've seen this person" from a case page): the
 *    sighting is linked to that case even if the photo is missing, has no
 *    clear face, or the AI service is down.
 */
router.post("/", async (req, res) => {
  const { image, location, dateTime, description, missingPersonId } = req.body || {};

  let linkedCase = null;
  if (missingPersonId) {
    if (mongoose.isValidObjectId(missingPersonId)) {
      linkedCase = await MissingPerson.findById(missingPersonId).select("_id name");
    }
    if (!linkedCase) return res.status(404).json({ message: "Case not found" });
  }

  if (!image && !linkedCase) return res.status(400).json({ message: "A photo is required" });
  if (linkedCase && !location?.trim()) {
    return res.status(400).json({ message: "Please say where you saw this person" });
  }

  let ai = { embedding: undefined, matches: [] };
  let aiNote = null;
  if (image) {
    try {
      ai = await matchFace(image);
    } catch (err) {
      // For a general report the AI result is the whole point, so fail.
      // For a report about a known case, keep the sighting and explain.
      if (!linkedCase) throw err;
      aiNote = err.message;
    }
  }

  const matches = ai.matches.map((m) => ({
    missingPerson: m.id,
    distance: m.distance,
    confidence: m.confidence,
  }));
  if (linkedCase && !matches.some((m) => String(m.missingPerson) === String(linkedCase._id))) {
    matches.unshift({ missingPerson: linkedCase._id, manual: true });
  }

  const coords = await geocode(location);
  const seenAt = dateTime ? new Date(dateTime) : new Date();

  const report = await FoundPerson.create({
    image: image || "",
    location: location || "",
    description: description || "",
    coords: coords || undefined,
    seenAt: isNaN(seenAt) ? new Date() : seenAt,
    embedding: ai.embedding,
    matches,
    status: matches.length ? "matched" : "unmatched",
    reportedBy: req.user._id,
  });

  res.status(201).json({
    message: matches.length ? "Possible matches found" : "No matching missing person",
    reportId: report._id,
    matches: ai.matches,
    linkedCaseId: linkedCase?._id,
    aiNote,
  });
});

// All sightings, newest first, with the matched missing persons filled in
router.get("/", async (req, res) => {
  const filter = {};
  if (["matched", "unmatched"].includes(req.query.status)) filter.status = req.query.status;
  if (req.query.today === "1") {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    filter.createdAt = { $gte: start };
  }

  const reports = await FoundPerson.find(filter)
    .sort({ createdAt: -1 })
    .limit(500)
    .populate("matches.missingPerson", "name age images status")
    .populate("reportedBy", "name");
  res.json({ data: reports });
});

// Remove a sighting report — the person who sent it, or an admin (e.g. fake reports)
router.delete("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ message: "Report not found" });
  }
  const report = await FoundPerson.findById(req.params.id);
  if (!report) return res.status(404).json({ message: "Report not found" });
  if (!report.reportedBy?.equals(req.user._id) && req.user.role !== "admin") {
    return res.status(403).json({ message: "Only the person who sent this report or an admin can delete it" });
  }
  await report.deleteOne();
  res.json({ message: "Report deleted" });
});

export default router;
