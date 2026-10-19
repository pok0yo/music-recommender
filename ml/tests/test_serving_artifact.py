import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
from unittest.mock import patch

import numpy as np
from scipy.sparse import csr_array

from ml.audit_support import sha256
from ml.recommend import ItemCF, from_training_database
from ml.serving_artifact import Artifact, export, validate_arrays
from ml.run_stage7 import run, read_selection


def fixture():
    ids=np.array([f'{i:08d}-1111-4111-8111-111111111111' for i in range(1,5)],dtype='S36')
    matrix=np.zeros((4,16),dtype=np.int32)
    for row,users in enumerate(([0,1,2,3,4],[0,1,2,5,6],[0,1,2,3,7],[8,9,10,11,12])):
        matrix[row,users]=1
    return ItemCF(ids,csr_array(matrix))


class ArtifactTests(unittest.TestCase):
    def test_training_database_and_export_round_trip_with_evidence(self):
        model=fixture()
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            db=sqlite3.connect(root/'train.sqlite')
            db.executescript('CREATE TABLE pairs(recording TEXT,user INTEGER); CREATE TABLE support(recording TEXT,listeners INTEGER); CREATE TABLE activity(user INTEGER);')
            db.executemany('INSERT INTO activity VALUES(?)',[(i,) for i in range(16)])
            for i,recording in enumerate(model.ids):
                users=model.matrix[[i]].indices.tolist()
                db.executemany('INSERT INTO pairs VALUES(?,?)',[(recording.decode(),u) for u in users])
                db.execute('INSERT INTO support VALUES(?,?)',(recording.decode(),len(users)))
            db.commit();db.close()
            loaded=from_training_database(root/'train.sqlite')
            np.testing.assert_array_equal(loaded.matrix.toarray(),model.matrix.toarray())
            out=root/'artifact'
            export(loaded,10,out,dict(fixture=True))
            artifact=Artifact(out,sha256(out/'manifest.json'))
            actual=artifact.recommend(model.ids[0].decode())
            expected=model.recommend(model.ids[0].decode(),10)
            self.assertEqual(actual['status'],expected['status'])
            for got,want in zip(actual['items'],expected['items']):
                self.assertEqual({k:got[k] for k in want},want)
            self.assertEqual(artifact.recommend('unknown')['items'],[])
            self.assertEqual(artifact.recommend(model.ids[3].decode())['items'],[])
            with self.assertRaises(ValueError):Artifact(out,'incorrect-trusted-hash')
            arrays={k:np.array(v) for k,v in artifact.arrays.items()}
            for name,change in [('neighbors',lambda a:a.__setitem__((0,0),0)),
                                ('scores',lambda a:a.__setitem__((0,0),np.nan)),
                                ('shared',lambda a:a.__setitem__((0,0),99))]:
                altered={k:v.copy() for k,v in arrays.items()};change(altered[name])
                with self.assertRaises(ValueError):validate_arrays(altered,10)
            # Change an unmapped manifest byte to test trust before parsing/loading.
            with (out/'manifest.json').open('ab') as stream:stream.write(b' ')
            with self.assertRaises(ValueError):Artifact(out,sha256(out/'manifest.json')+'wrong')

    def test_test_phase_requires_selection_before_any_data_access(self):
        with tempfile.TemporaryDirectory() as directory,patch('ml.run_stage7.verified_model') as loader:
            with self.assertRaises(ValueError):run('test',Path(directory)/'output')
            loader.assert_not_called()

    def test_validation_selection_rejects_changed_rule_or_report(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            report=dict(phase='validation',models={f'cf_lambda_{v}':{'macro':{'ndcg_at_10':.1}} for v in (0,10,50)})
            (root/'report.json').write_text(json.dumps(report))
            selection=dict(protocol_sha256='protocol',stage_6_decision_sha256='decision',code_sha256={},
                           validation_report_sha256=sha256(root/'report.json'),selected_lambda=0,test_results_seen=False)
            path=root/'selection.json';path.write_text(json.dumps(selection))
            real_hash=sha256
            def digest(p):
                if p==root/'report.json':return real_hash(p)
                return 'protocol' if p.name=='stage-7-protocol.json' else 'decision'
            with patch('ml.run_stage7.code_hashes',return_value={}),patch('ml.run_stage7.sha256',side_effect=digest):
                self.assertEqual(read_selection(path)['selected_lambda'],0)
                selection['selected_lambda']=50;path.write_text(json.dumps(selection))
                with self.assertRaises(ValueError):read_selection(path)
                selection['selected_lambda']=0;path.write_text(json.dumps(selection))
                (root/'report.json').write_text('{}')
                with self.assertRaises(ValueError):read_selection(path)


if __name__=='__main__':unittest.main()
