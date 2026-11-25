import express from "express";
import MissingPerson from "../models/MissingPerson.js";
import FoundPerson from "../models/FoundPerson.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();
router.use(requireAuth);

// Real numbers for the dashboard (these used to be hard-coded: 156, 89, 23, 12)
router.get("/", async (_req, res) => {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [totalMissing, activeCases, matchedReports, reportsToday, recentMissing, recentFound] =
    await Promise.all([
      MissingPerson.countDocuments(),
      MissingPerson.countDocuments({ status: { $ne: "found" } }),
      FoundPerson.countDocuments({ status: "matched" }),
      FoundPerson.countDocuments({ createdAt: { $gte: startOfDay } }),
      MissingPerson.find().sort({ createdAt: -1 }).limit(5).lean(),
      FoundPerson.find({ status: "matched" })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate("matches.missingPerson", "name age gender images lastSeenLocation")
        .lean(),
    ]);

  const activity = [
    ...recentMissing.map((p) => ({
      type: "report",
      title: "New missing person report",
      link: `/cases/${p._id}`,
      description: `${p.name}${p.age ? `, ${p.age}` : ""} — last seen at ${p.lastSeenLocation || "unknown location"}`,
      time: p.createdAt,
    })),
    ...recentFound.slice(0, 5).map((f) => {
      const top = f.matches[0];
      return {
        type: "match",
        title: top?.manual ? "Sighting reported" : "AI match found",
        link: top?.missingPerson?._id ? `/cases/${top.missingPerson._id}` : "/sightings",
        description: `${top?.manual ? "Seen:" : `${top?.confidence ?? "?"}% match for`} ${top?.missingPerson?.name ?? "a missing person"}${f.location ? ` near ${f.location}` : ""}`,
        time: f.createdAt,
      };
    }),
  ]
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 6);

  // Most recent match per missing person
  const seen = new Set();
  const recentMatches = [];
  for (const f of recentFound) {
    // the "Recent matches" cards show AI scores, so skip manual-only reports
    const top = f.matches.find((m) => !m.manual);
    const p = top?.missingPerson;
    if (!p || seen.has(String(p._id))) continue;
    seen.add(String(p._id));
    recentMatches.push({
      id: String(p._id),
      name: p.name,
      age: p.age,
      image: p.images?.[0],
      confidence: top.confidence,
      location: f.location || p.lastSeenLocation,
    });
  }

  res.json({ totalMissing, activeCases, matchedReports, reportsToday, activity, recentMatches });
});

export default router;
