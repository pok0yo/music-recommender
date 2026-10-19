"""Export and validate immutable, non-pickle neighbors without listener histories."""

import argparse
import json
from pathlib import Path
import time

import numpy as np

from ml.audit_events import MBID
from ml.audit_support import sha256
from ml.inspect_spark import save, peak_process_bytes
from ml.recommend import K, LAMBDAS

ARRAYS = {"ids":"S36", "support":"int32", "neighbors":"int32", "scores":"float64", "shared":"int32"}


def validate_arrays(arrays, shrinkage):
    ids, support, neighbors, scores, shared = (arrays[n] for n in ARRAYS)
    n = len(ids)
    if shrinkage not in LAMBDAS or not n or ids.shape != (n,) or support.shape != (n,):
        raise ValueError("Invalid artifact configuration")
    if any(a.dtype != np.dtype(ARRAYS[name]) for name,a in arrays.items()):
        raise ValueError("Artifact dtype differs")
    if (not np.all(ids[1:] > ids[:-1]) or any(not MBID.fullmatch(r.decode()) for r in ids)
            or np.any(support<5) or any(a.shape!=(n,K) for a in (neighbors,scores,shared))):
        raise ValueError("Invalid catalog, support or array shape")
    for start in range(0,n,1024):
        ni, sc, co = neighbors[start:start+1024], scores[start:start+1024], shared[start:start+1024]
        valid = ni>=0
        if (np.any(ni < -1) or np.any(ni>=n) or not np.isfinite(sc).all()
                or np.any(sc[valid]<=0) or np.any(sc[valid]>1)
                or np.any(sc[~valid]!=0) or np.any(co[~valid]!=0)
                or np.any(valid[:,1:] & ~valid[:,:-1])):
            raise ValueError("Invalid neighbor, score or padding")
        seed = np.arange(start,start+len(ni))[:,None]
        if np.any((ni==seed)&valid) or np.any(co[valid]<3):
            raise ValueError("Self-link or unsupported edge")
        candidate_support = support[np.maximum(ni,0)]
        seed_support = support[seed]
        if np.any(valid & ((co>candidate_support)|(co>seed_support))):
            raise ValueError("Shared-listener evidence exceeds item support")
        expected = co/np.sqrt(seed_support.astype(float)*candidate_support)*co/(co+shrinkage+(co==0))
        if not np.allclose(sc[valid],expected[valid],rtol=1e-12,atol=0):
            raise ValueError("Score disagrees with stored training evidence")
        for row, score in zip(ni,sc):
            row_valid = row[row>=0]
            if len(set(row_valid)) != len(row_valid):
                raise ValueError("Duplicate neighbors")
            if not np.array_equal(np.lexsort((row_valid,-score[:len(row_valid)])),np.arange(len(row_valid))):
                raise ValueError("Ranking tie/order differs")


class Artifact:
    def __init__(self, root, expected_manifest_sha256):
        root=Path(root)
        if sha256(root/"manifest.json")!=expected_manifest_sha256:
            raise ValueError("Artifact manifest differs from trusted release hash")
        self.manifest=json.loads((root/"manifest.json").read_text())
        if self.manifest.get("schema_version")!=1 or not self.manifest.get("complete"):
            raise ValueError("Incomplete or incompatible artifact")
        self.arrays={}
        if set(self.manifest["files"])!={name+".npy" for name in ARRAYS}:
            raise ValueError("Unexpected artifact inventory")
        for name in ARRAYS:
            path=root/(name+".npy")
            if sha256(path)!=self.manifest["files"][path.name]:
                raise ValueError("Artifact checksum differs")
            self.arrays[name]=np.load(path,allow_pickle=False)
        if (self.manifest["candidate_items"]!=len(self.arrays["ids"])
                or (self.manifest["min_item_listeners"],self.manifest["min_edge_listeners"],self.manifest["k"])!=(5,3,K)):
            raise ValueError("Artifact catalog or threshold metadata differs")
        validate_arrays(self.arrays,self.manifest["lambda"])

    def recommend(self, recording):
        ids=self.arrays["ids"]
        value=recording.encode()
        seed=int(np.searchsorted(ids,value))
        if seed==len(ids) or ids[seed]!=value:
            return dict(status="unknown_or_unsupported_seed",items=[])
        row=self.arrays["neighbors"][seed]
        items=[]
        for position,index in enumerate(row):
            if index<0:break
            items.append(dict(recording_mbid=ids[index].decode(),score=float(self.arrays["scores"][seed,position]),
                shared_training_listeners=int(self.arrays["shared"][seed,position]),
                seed_training_listeners=int(self.arrays["support"][seed]),
                candidate_training_listeners=int(self.arrays["support"][index]),
                explanation_kind="shared_training_listeners"))
        return dict(status="ok" if len(items)==K else "insufficient_connections",items=items)


def export(model, shrinkage, output, lineage):
    output=Path(output)
    if output.exists():raise FileExistsError("Preserving existing artifact; choose a new output")
    output.mkdir(parents=True)
    started=time.monotonic()
    np.save(output/"ids.npy",model.ids,allow_pickle=False)
    np.save(output/"support.npy",model.counts,allow_pickle=False)
    n=len(model.ids)
    arrays={name:np.lib.format.open_memmap(output/(name+".npy"),mode="w+",dtype=ARRAYS[name],shape=(n,K))
            for name in ("neighbors","scores","shared")}
    arrays["neighbors"][:]=-1
    arrays["scores"][:]=0
    arrays["shared"][:]=0
    for start in range(0,n,32):
        rows=model.rank_block(range(start,min(start+32,n)),(shrinkage,))[shrinkage]
        for offset,(indices,scores,counts) in enumerate(rows):
            for name,values in zip(arrays,(indices,scores,counts)):
                arrays[name][start+offset,:len(values)]=values
        if start%8192==0:print(json.dumps(dict(exported_items=min(start+32,n),total_items=n)),flush=True)
    for array in arrays.values():array.flush()
    manifest=dict(schema_version=1,complete=True,model_id=f"item-cf-cohort-v2-lambda-{shrinkage}",
                  **{"lambda":shrinkage},candidate_items=n,min_item_listeners=5,min_edge_listeners=3,k=K,
                  score="c/sqrt(n_i*n_j) * c/(c+lambda)",lineage=lineage,
                  files={name+".npy":sha256(output/(name+".npy")) for name in ARRAYS},
                  serialized_array_bytes=sum((output/(name+".npy")).stat().st_size for name in ARRAYS),
                  expanded_array_bytes=model.ids.nbytes+model.counts.nbytes+sum(a.nbytes for a in arrays.values()),
                  seconds=round(time.monotonic()-started,3),peak_process_memory_bytes=peak_process_bytes())
    save(output/"manifest.json",manifest)
    Artifact(output,sha256(output/"manifest.json"))
    return manifest


if __name__=="__main__":
    from ml.run_stage7 import verified_model,code_hashes,read_selection,PROTOCOL,DECISION
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--selection",type=Path,required=True)
    parser.add_argument("--test-report",type=Path,required=True)
    parser.add_argument("--output",type=Path,required=True)
    args=parser.parse_args()
    selection=read_selection(args.selection)
    test=json.loads(args.test_report.read_text())
    if (selection["code_sha256"]!=code_hashes() or selection["protocol_sha256"]!=sha256(PROTOCOL)
            or test["selection_sha256"]!=sha256(args.selection) or test["phase"]!="test"):
        raise ValueError("Artifact inputs differ from frozen model comparison")
    model,decision=verified_model()
    print(json.dumps(export(model,selection["selected_lambda"],args.output,
        dict(selection_sha256=sha256(args.selection),test_report_sha256=sha256(args.test_report),
             protocol_sha256=sha256(PROTOCOL),stage_6_decision_sha256=sha256(DECISION),
             code_sha256=code_hashes(),training_interval=["2026-02-01","2026-08-01"]))))
