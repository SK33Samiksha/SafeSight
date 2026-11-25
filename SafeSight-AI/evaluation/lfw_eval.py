"""Reproduce the face-verification evaluation from the SafeSight project report.

Pipeline (matches report sections 4-12):
  LFW via scikit-learn (min_faces_per_person=10, resize=0.4) -> uint8 RGB
  -> DeepFace Facenet embeddings -> 500 same + 500 different pairs (seed 42)
  -> cosine distance -> threshold sweep 0.20-0.90 (step 0.02) -> metrics + plots

It also reports a held-out result: the threshold is chosen on one half of the
pairs and measured on the other half. Choosing the threshold on the same pairs
you report on (as the report does) slightly overstates performance.

Usage (from SafeSight-AI/):
    pip install -r requirements.txt -r evaluation/requirements-eval.txt
    python evaluation/lfw_eval.py            # writes evaluation/outputs/
"""
import argparse
import json
import pickle
import random
from pathlib import Path

import cv2
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import seaborn as sns
from deepface import DeepFace
from scipy.spatial.distance import cosine
from sklearn.datasets import fetch_lfw_people
from sklearn.metrics import (
    accuracy_score,
    auc,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_curve,
)

OUT = Path(__file__).parent / "outputs"


def load_data():
    lfw = fetch_lfw_people(min_faces_per_person=10, resize=0.4, color=False)
    imgs = (lfw.images * 255).clip(0, 255).astype(np.uint8)  # [0,1] float -> uint8
    imgs = np.stack([cv2.cvtColor(im, cv2.COLOR_GRAY2RGB) for im in imgs])
    return lfw, imgs


def eda_plots(lfw):
    names = lfw.target_names
    counts = np.bincount(lfw.target)
    order = np.argsort(counts)[::-1]

    top = order[:15]
    plt.figure(figsize=(9, 6))
    plt.barh([names[i] for i in top][::-1], counts[top][::-1], color="steelblue")
    plt.title("Top 15 most frequent persons")
    plt.xlabel("Images")
    plt.tight_layout()
    plt.savefig(OUT / "eda_top15.png", dpi=120)
    plt.close()

    plt.figure(figsize=(8, 5))
    plt.hist(counts, bins=30, color="steelblue")
    plt.axvline(counts.mean(), color="red", ls="--", label=f"mean = {counts.mean():.1f}")
    plt.legend()
    plt.title("Images per person")
    plt.tight_layout()
    plt.savefig(OUT / "eda_hist.png", dpi=120)
    plt.close()

    top5 = counts[order[:5]].sum()
    plt.figure(figsize=(6, 6))
    plt.pie([top5, counts.sum() - top5], labels=["Top 5", "Others"], autopct="%1.1f%%")
    plt.title("Dataset composition")
    plt.savefig(OUT / "eda_pie.png", dpi=120)
    plt.close()

    return {
        "images": int(counts.sum()),
        "people": int(len(names)),
        "mean_per_person": round(float(counts.mean()), 1),
        "top15": [(names[i], int(counts[i])) for i in top],
    }


def embed_all(imgs, cache: Path):
    if cache.exists():
        with open(cache, "rb") as f:
            return pickle.load(f)
    embs = []
    for i, im in enumerate(imgs):
        rep = DeepFace.represent(
            img_path=im,  # greyscale replicated to 3 channels, so RGB/BGR order is irrelevant
            model_name="Facenet",
            enforce_detection=False,  # same settings as the report
        )
        embs.append(rep[0]["embedding"])
        if i % 500 == 0:
            print(f"  embedded {i}/{len(imgs)}")
    embs = np.asarray(embs)
    with open(cache, "wb") as f:
        pickle.dump(embs, f)
    return embs


def make_pairs(labels, n_each=500, seed=42):
    random.seed(seed)
    idx = list(range(len(labels)))
    same, diff, attempts = [], [], 0
    while (len(same) < n_each or len(diff) < n_each) and attempts < 50_000:
        attempts += 1
        a, b = random.sample(idx, 2)
        if labels[a] == labels[b] and len(same) < n_each:
            same.append((a, b, 1))
        elif labels[a] != labels[b] and len(diff) < n_each:
            diff.append((a, b, 0))
    return same + diff


def metrics_at(dist, y, t):
    pred = (dist < t).astype(int)
    return {
        "threshold": round(float(t), 2),
        "accuracy": accuracy_score(y, pred),
        "precision": precision_score(y, pred, zero_division=0),
        "recall": recall_score(y, pred),
        "f1": f1_score(y, pred),
    }


def best_threshold(dist, y, grid):
    return max((metrics_at(dist, y, t) for t in grid), key=lambda m: m["f1"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pairs", type=int, default=500, help="pairs of each type")
    args = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)

    print("Loading LFW...")
    lfw, imgs = load_data()
    summary = {"dataset": eda_plots(lfw)}

    print("Generating embeddings...")
    embs = embed_all(imgs, OUT / "embeddings.pkl")

    pairs = make_pairs(lfw.target, args.pairs)
    y = np.array([p[2] for p in pairs])
    dist = np.array([cosine(embs[a], embs[b]) for a, b, _ in pairs])
    summary["distance"] = {
        "same_mean": float(dist[y == 1].mean()), "same_std": float(dist[y == 1].std()),
        "diff_mean": float(dist[y == 0].mean()), "diff_std": float(dist[y == 0].std()),
    }

    grid = np.arange(0.20, 0.90 + 1e-9, 0.02)  # 36 thresholds, 0.90 included
    sweep = [metrics_at(dist, y, t) for t in grid]
    best = max(sweep, key=lambda m: m["f1"])
    t = best["threshold"]

    fpr, tpr, _ = roc_curve(y, 1 - dist)
    roc_auc = auc(fpr, tpr)
    tn, fp, fn, tp = confusion_matrix(y, (dist < t).astype(int)).ravel()
    summary["report_method"] = {**best, "auc": roc_auc,
                                "confusion": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)}}

    # Honest estimate: tune on even-indexed pairs, test on odd-indexed pairs
    rng = np.random.default_rng(42)
    perm = rng.permutation(len(y))
    tune, test = perm[: len(y) // 2], perm[len(y) // 2:]
    t_tuned = best_threshold(dist[tune], y[tune], grid)["threshold"]
    summary["held_out"] = metrics_at(dist[test], y[test], t_tuned)

    # ---- plots ----
    plt.figure(figsize=(8, 5))
    for k in ("accuracy", "precision", "recall", "f1"):
        plt.plot(grid, [m[k] for m in sweep], label=k)
    plt.axvline(t, color="k", ls="--", label=f"best = {t}")
    plt.xlabel("cosine distance threshold"); plt.legend(); plt.tight_layout()
    plt.savefig(OUT / "threshold_sweep.png", dpi=120); plt.close()

    plt.figure(figsize=(5, 4))
    sns.heatmap([[tn, fp], [fn, tp]], annot=True, fmt="d", cmap="Blues",
                xticklabels=["No Match", "Match"], yticklabels=["No Match", "Match"])
    plt.xlabel("Predicted"); plt.ylabel("Actual"); plt.tight_layout()
    plt.savefig(OUT / "confusion_matrix.png", dpi=120); plt.close()

    plt.figure(figsize=(6, 5))
    plt.plot(fpr, tpr, label=f"AUC = {roc_auc:.4f}"); plt.plot([0, 1], [0, 1], "k--")
    plt.xlabel("FPR"); plt.ylabel("TPR"); plt.legend(); plt.tight_layout()
    plt.savefig(OUT / "roc.png", dpi=120); plt.close()

    prec, rec, _ = precision_recall_curve(y, 1 - dist)
    plt.figure(figsize=(6, 5))
    plt.plot(rec, prec); plt.axhline(0.5, color="k", ls="--")
    plt.xlabel("Recall"); plt.ylabel("Precision"); plt.tight_layout()
    plt.savefig(OUT / "precision_recall.png", dpi=120); plt.close()

    plt.figure(figsize=(8, 5))
    plt.hist(dist[y == 1], bins=40, alpha=0.6, color="green", label="same person", density=True)
    plt.hist(dist[y == 0], bins=40, alpha=0.6, color="tomato", label="different", density=True)
    plt.axvline(t, color="k", ls="--"); plt.legend(); plt.xlabel("cosine distance")
    plt.tight_layout(); plt.savefig(OUT / "distance_distribution.png", dpi=120); plt.close()

    with open(OUT / "results.json", "w") as f:
        json.dump(summary, f, indent=2, default=float)
    print(json.dumps(summary, indent=2, default=float))


if __name__ == "__main__":
    main()
