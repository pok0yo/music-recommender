"""Train-only binary item CF and deterministic, evidence-bearing top-ten lists."""

from pathlib import Path
import sqlite3

import numpy as np
from scipy.sparse import csr_array

from ml.audit_events import MBID

K = 10
LAMBDAS = (0, 10, 50)


def top_k(candidates, scores, k=K):
    if k < 1 or len(candidates) != len(scores) or not np.isfinite(scores).all():
        raise ValueError("Invalid ranking inputs")
    positions = np.arange(len(candidates))
    if len(scores) > k:
        cutoff = np.partition(scores, len(scores)-k)[len(scores)-k]
        positions = positions[scores >= cutoff]
    return positions[np.lexsort((candidates[positions], -scores[positions]))[:k]]


def from_training_database(path):
    db = sqlite3.connect(f"file:{Path(path).as_posix()}?mode=ro", uri=True)
    try:
        rows = db.execute("SELECT recording,listeners FROM support WHERE listeners>=5 ORDER BY recording").fetchall()
        if not rows or not all(MBID.fullmatch(r) for r, _ in rows):
            raise ValueError("Training catalog must contain valid recording IDs")
        ids = np.array([r for r, _ in rows], dtype="S36")
        counts = np.array([n for _, n in rows], dtype=np.int32)
        users = {u: i for i, (u,) in enumerate(db.execute("SELECT user FROM activity ORDER BY user"))}
        indptr = np.concatenate(([0], np.cumsum(counts, dtype=np.int64)))
        cursor = db.execute("""SELECT p.user FROM pairs p JOIN support s ON p.recording=s.recording
            WHERE s.listeners>=5 ORDER BY p.recording,p.user""")
        columns = np.fromiter((users[u] for (u,) in cursor), dtype=np.int32)
        if len(columns) != indptr[-1]:
            raise ValueError("Training pair counts differ from support")
        matrix = csr_array((np.ones(len(columns), dtype=np.int32), columns, indptr),
                           shape=(len(ids), len(users)))
        return ItemCF(ids, matrix)
    finally:
        db.close()


class ItemCF:
    def __init__(self, ids, matrix):
        self.ids = np.asarray(ids)
        self.matrix = csr_array(matrix)
        self.matrix.check_format(full_check=True)
        if (len(self.ids) != matrix.shape[0] or not len(self.ids)
                or not np.all(self.ids[1:] > self.ids[:-1])
                or not self.matrix.has_canonical_format or not np.all(self.matrix.data == 1)):
            raise ValueError("Expected sorted unique IDs and canonical binary interactions")
        self.matrix = self.matrix.astype(np.int32)
        self.counts = np.diff(self.matrix.indptr).astype(np.int32)
        if np.any(self.counts < 5):
            raise ValueError("Every candidate must meet the frozen five-listener minimum")
        self.transpose = self.matrix.T.tocsr()
        self.popularity = np.lexsort((np.arange(len(self.ids)), -self.counts))

    def index(self, recording):
        value = recording.encode() if self.ids.dtype.kind == "S" else recording
        i = int(np.searchsorted(self.ids, value))
        return i if i < len(self.ids) and self.ids[i] == value else None

    def popular(self, seed):
        candidates = self.popularity[:K+1]
        return candidates[candidates != seed][:K]

    def rank_block(self, seeds, lambdas=LAMBDAS):
        seeds = np.asarray(seeds, dtype=np.int64)
        if seeds.ndim != 1 or np.any(seeds < 0) or np.any(seeds >= len(self.ids)):
            raise ValueError("Seed index outside catalog")
        if any(value not in LAMBDAS for value in lambdas):
            raise ValueError("Shrinkage must be one of the preregistered values")
        # Integer products count listeners; int8 would overflow on popular recordings.
        shared = (self.matrix[seeds] @ self.transpose).tocsr()
        result = {value: [] for value in lambdas}
        for row, seed in enumerate(seeds):
            start, end = shared.indptr[row:row+2]
            candidates, counts = shared.indices[start:end], shared.data[start:end]
            keep = (candidates != seed) & (counts >= 3)
            candidates, counts = candidates[keep], counts[keep]
            cosine = counts / np.sqrt(float(self.counts[seed])*self.counts[candidates])
            for value in lambdas:
                scores = cosine * counts / (counts + value)
                chosen = top_k(candidates, scores)
                result[value].append((candidates[chosen], scores[chosen], counts[chosen]))
        return result

    def recommend(self, recording, shrinkage):
        seed = self.index(recording)
        if seed is None:
            return dict(status="unknown_or_unsupported_seed", items=[])
        indices, scores, shared = self.rank_block([seed], (shrinkage,))[shrinkage][0]
        return dict(status="ok" if len(indices) == K else "insufficient_connections",
                    items=[dict(recording_mbid=self.ids[i].decode(), score=float(score),
                                shared_training_listeners=int(n), seed_training_listeners=int(self.counts[seed]),
                                candidate_training_listeners=int(self.counts[i]))
                           for i, score, n in zip(indices, scores, shared)])
