import math
import unittest

import numpy as np
from scipy.sparse import csr_array

from ml.recommend import ItemCF, top_k
from ml.evaluate import metrics, paired_interval, summarize


def fixture():
    # A/B share three; A/C share four; D is unrelated and must never pad CF.
    matrix = np.zeros((4, 16), dtype=np.int32)
    for row, users in enumerate(([0,1,2,3,4],[0,1,2,5,6],[0,1,2,3,7],[8,9,10,11,12])):
        matrix[row, users] = 1
    return ItemCF(np.array([b"A",b"B",b"C",b"D"]),csr_array(matrix))


class RecommendationTests(unittest.TestCase):
    def test_cosine_shrinkage_support_and_no_padding(self):
        model = fixture()
        result = model.rank_block([0])
        for value in (0,10,50):
            ids, scores, counts = result[value][0]
            self.assertEqual(ids.tolist(), [2,1])
            self.assertEqual(counts.tolist(), [4,3])
            np.testing.assert_allclose(scores,[.8*4/(4+value),.6*3/(3+value)])
        self.assertEqual(model.popular(0).tolist(), [1,2,3])
        self.assertEqual(model.recommend('D',10)['items'], [])
        self.assertEqual(model.recommend('absent',10)['status'],'unknown_or_unsupported_seed')
        self.assertEqual(model.recommend('A',10)['items'][0]['shared_training_listeners'],4)

    def test_ties_at_top_k_boundary_and_invalid_scores(self):
        candidates=np.arange(20)[::-1]
        scores=np.array([2. if i==15 else 1. for i in candidates])
        self.assertEqual(candidates[top_k(candidates,scores,3)].tolist(),[15,0,1])
        with self.assertRaises(ValueError):top_k(np.array([0]),np.array([np.nan]))

    def test_popularity_matches_full_sort_without_retaining_catalog_per_seed(self):
        model=fixture()
        model.popularity=np.arange(10000)
        for seed in (0,9,10,5000):
            result=model.popular(seed)
            np.testing.assert_array_equal(result,model.popularity[model.popularity!=seed][:10])
            backing=result.base if result.base is not None else result
            self.assertLessEqual(backing.size,11)

    def test_integer_overflow_and_sparse_vs_independent_dense_formula(self):
        matrix=np.ones((3,140),dtype=np.int32)
        matrix[2,:40]=0
        model=ItemCF(np.array([b'A',b'B',b'C']),csr_array(matrix))
        ids,scores,shared=model.rank_block([0],(10,))[10][0]
        self.assertEqual(shared.tolist(),[140,100])
        dense=matrix.astype(np.int64)@matrix.astype(np.int64).T
        expected=[dense[0,i]/math.sqrt(matrix[0].sum()*matrix[i].sum())*dense[0,i]/(dense[0,i]+10) for i in ids]
        np.testing.assert_allclose(scores,expected)

    def test_heldout_targets_cannot_change_fitted_model_or_rankings(self):
        model=fixture()
        before=model.rank_block([0],(10,))[10][0]
        first,_=summarize([(0,{1})],{0:before[0]},model.counts,4)
        second,_=summarize([(0,{3})],{0:before[0]},model.counts,4)
        self.assertNotEqual(first['macro'],second['macro'])
        after=model.rank_block([0],(10,))[10][0]
        for a,b in zip(before,after):np.testing.assert_array_equal(a,b)

    def test_hand_computed_metrics_short_lists_and_bootstrap(self):
        result=metrics([1,2,3],{1,3,9})
        np.testing.assert_allclose(result,[(1+1/2)/(1+1/math.log2(3)+1/2),2/3,.2])
        np.testing.assert_array_equal(metrics([],{1}),[0,0,0])
        self.assertEqual(paired_interval([.25]*10)['lower_95'],.25)
        self.assertEqual(paired_interval([0,1,-1]),paired_interval([0,1,-1]))
        with self.assertRaises(ValueError):metrics([1,1],{1})
        with self.assertRaises(ValueError):metrics([1],set())

    def test_seed_balanced_metrics_and_cohort_denominators(self):
        rows=[(0,{1}),(0,{1}),(2,{3})]
        report,_=summarize(rows,{0:np.array([1]),2:np.array([])},np.array([5,5,20,5]),4)
        self.assertAlmostEqual(report['macro']['ndcg_at_10'],2/3)
        self.assertAlmostEqual(report['seed_balanced']['ndcg_at_10'],.5)
        self.assertEqual(report['support_cohorts']['5_to_19']['queries'],2)
        self.assertEqual(report['catalog_coverage'],.25)


if __name__=='__main__':
    unittest.main()
