"""Run frozen validation or final test comparisons; never tune on test results."""

import argparse
import hashlib
import json
from pathlib import Path
import platform
import subprocess
import time

import numpy as np
import scipy

from ml.audit_support import sha256
from ml.evaluate import queries, summarize, paired_interval
from ml.inspect_spark import save, peak_process_bytes
from ml.recommend import from_training_database, LAMBDAS

PROTOCOL = Path("docs/stage-7-protocol.json")
DECISION = Path("docs/evidence/stage-6-decision-v2.json")
SUPPORT = Path("data/processed/support-v2")
CODE = ("ml/recommend.py", "ml/evaluate.py", "ml/run_stage7.py", "ml/serving_artifact.py",
        "ml/requirements-model.txt", "ml/requirements-audit.txt")


def code_hashes():
    return {p: sha256(Path(p)) for p in CODE}


def read_selection(path):
    selection=json.loads(path.read_text())
    report_path=path.parent/"report.json"
    if (selection["protocol_sha256"]!=sha256(PROTOCOL) or selection["code_sha256"]!=code_hashes()
            or selection["stage_6_decision_sha256"]!=sha256(DECISION)
            or selection["validation_report_sha256"]!=sha256(report_path)):
        raise ValueError("Frozen validation selection provenance differs")
    report=json.loads(report_path.read_text())
    chosen=max(LAMBDAS,key=lambda v:(report["models"][f"cf_lambda_{v}"]["macro"]["ndcg_at_10"],-v))
    if report["phase"]!="validation" or selection["selected_lambda"]!=chosen or selection["test_results_seen"]:
        raise ValueError("Selection does not follow the frozen validation rule")
    return selection


def verified_model():
    protocol = json.loads(PROTOCOL.read_text())
    decision = json.loads(DECISION.read_text())
    if not protocol["stage_7_authorized"] or sha256(DECISION) != protocol["stage_6_decision_sha256"]:
        raise ValueError("Stage 7 authorization/input decision differs")
    if not decision["data_accepted_for_stage_7"]:
        raise ValueError("Dataset not accepted")
    for name, digest in decision["evidence_sha256"].items():
        if sha256(DECISION.parent/name) != digest:
            raise ValueError("Frozen evidence hash differs: " + name)
    if sha256(SUPPORT/"training.sqlite") != decision["frozen_manifest"]["training_database_sha256"]:
        raise ValueError("Training database differs from frozen snapshot")
    model = from_training_database(SUPPORT/"training.sqlite")
    digest = hashlib.sha256(b"\n".join(model.ids.tolist())).hexdigest()
    if digest != decision["frozen_manifest"]["candidate_catalog"]["sha256"]:
        raise ValueError("Model catalog differs from frozen candidate universe")
    return model, decision


def run(phase, output, selection_path=None):
    started = time.monotonic()
    if output.exists():
        raise FileExistsError("Preserving existing experiment; choose a fresh output")
    selection = None
    if phase == "test":
        if selection_path is None:
            raise ValueError("Final test requires the frozen validation selection")
        selection = read_selection(selection_path)
    elif selection_path is not None:
        raise ValueError("Validation cannot use an existing selection")
    model, decision = verified_model()
    if selection and selection["stage_6_decision_sha256"] != sha256(DECISION):
        raise ValueError("Selection used a different dataset")
    query_rows = queries(SUPPORT/f"{phase}-queries.jsonl",
                         decision["frozen_manifest"]["query_artifact_sha256"][phase], model)
    expected = json.loads((DECISION.parent/"stage-6-support-audit-v2.json").read_text())["holdouts"][phase]
    if len(query_rows) != expected["scorable_queries"]:
        raise ValueError("Scorable denominator differs from accepted audit")
    seeds = sorted({seed for seed, _ in query_rows})
    shrinkages = (selection["selected_lambda"],) if selection else LAMBDAS
    rankings = {"popularity": {seed: model.popular(seed) for seed in seeds}}
    rankings.update({f"cf_lambda_{value}": {} for value in shrinkages})
    for start in range(0, len(seeds), 32):
        block = seeds[start:start+32]
        results = model.rank_block(block, shrinkages)
        for value in shrinkages:
            rankings[f"cf_lambda_{value}"].update({seed: row[0] for seed, row in zip(block, results[value])})
        if start % 512 == 0:
            print(json.dumps(dict(phase=phase, ranked_seeds=min(start+32,len(seeds)), total_seeds=len(seeds))),flush=True)
    output.mkdir(parents=True)
    report = dict(phase=phase, protocol_sha256=sha256(PROTOCOL), stage_6_decision_sha256=sha256(DECISION),
                  code_sha256=code_hashes(), source_commit=subprocess.check_output(["git","rev-parse","HEAD"],text=True).strip(),
                  runtime=dict(python=platform.python_version(), numpy=np.__version__, scipy=scipy.__version__),
                  catalog_items=len(model.ids), denominators=expected, models={}, selection_sha256=sha256(selection_path) if selection else None)
    values = {}
    for name, ranking in rankings.items():
        report["models"][name], values[name] = summarize(query_rows, ranking, model.counts, len(model.ids))
        if name != "popularity":
            report["models"][name]["paired_difference_vs_popularity"] = {
                metric: paired_interval(values[name][:,i]-values["popularity"][:,i])
                for i,metric in enumerate(("ndcg_at_10","recall_at_10","precision_at_10"))}
        np.save(output/f"{name}-query-metrics.npy", values[name], allow_pickle=False)
        np.save(output/f"{name}-rankings.npy", np.array([list(ranking[s])+[-1]*(10-len(ranking[s])) for s in seeds],dtype=np.int32), allow_pickle=False)
    np.save(output/"seed-indices.npy",np.array(seeds,dtype=np.int32),allow_pickle=False)
    report["seconds"] = round(time.monotonic()-started,3)
    report["peak_process_memory_bytes"] = peak_process_bytes()
    report["local_artifact_sha256"] = {p.name:sha256(p) for p in sorted(output.glob("*.npy"))}
    save(output/"report.json",report)
    if not selection:
        chosen = max(LAMBDAS,key=lambda v:(report["models"][f"cf_lambda_{v}"]["macro"]["ndcg_at_10"],-v))
        save(output/"selection.json",dict(selected_lambda=chosen,protocol_sha256=sha256(PROTOCOL),
             stage_6_decision_sha256=sha256(DECISION),code_sha256=code_hashes(),
             validation_report_sha256=sha256(output/"report.json"),
             rule="Highest validation macro NDCG@10; exact ties choose smaller lambda",test_results_seen=False))
    print(json.dumps({name:r["macro"] for name,r in report["models"].items()}),flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("phase",choices=("validation","test"))
    parser.add_argument("--output",type=Path,required=True)
    parser.add_argument("--selection",type=Path)
    args = parser.parse_args()
    run(args.phase,args.output,args.selection)
