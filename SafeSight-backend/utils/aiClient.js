import axios from "axios";
import { config } from "../config/env.js";

const ai = axios.create({ baseURL: config.aiServiceUrl, timeout: 120000 });

// Turns AI-service failures into errors with a user-facing message + HTTP status.
function wrap(err) {
  if (err.response) {
    const e = new Error(err.response.data?.detail || "Face recognition failed");
    e.status = err.response.status === 422 ? 422 : 502;
    return e;
  }
  const e = new Error("Face recognition service is not running");
  e.status = 503;
  return e;
}

export async function getEmbeddings(images) {
  try {
    const { data } = await ai.post("/api/missing/", { images });
    return data; // { embeddings: number[][], skipped: [...] }
  } catch (err) {
    throw wrap(err);
  }
}

export async function matchFace(image) {
  try {
    const { data } = await ai.post("/api/found/", { image });
    return data; // { embedding, matches: [{ id, distance, confidence, ... }] }
  } catch (err) {
    throw wrap(err);
  }
}
