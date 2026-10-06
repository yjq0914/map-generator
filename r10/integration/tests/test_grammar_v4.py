"""Focused authoring checks. These tests do not run physics or prove safety."""
import copy
import pathlib
import sys
import unittest

HERE = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
import generator as G
from rules import grammar_v4 as V4


def candidate(order, score=0, variant='base'):
    return (score, {
        'seq': [{'fragment': {'family': f, 'variant': variant},
                 'dx': index * 500, 'role': 'introduce'}
                for index, f in enumerate(order)],
        'count': 20, 'last': 4545, 'score': score,
        'seen': set(order), 'qualification': 'experimental',
    })


def order(state):
    return tuple(row['fragment']['family'] for row in state['seq'])


class GrammarV4Tests(unittest.TestCase):
    def test_seeded_phrase_roles_are_stable_and_distinct(self):
        a = V4.plan_metadata(701, 'arcade')
        self.assertEqual(a, V4.plan_metadata(701, 'arcade'))
        self.assertNotEqual(a['outline'], V4.plan_metadata(2701, 'arcade')['outline'])
        self.assertEqual([V4.role_for(i, 701, 'arcade') for i in range(6)],
                         [slot['role'] for slot in a['slots']])
        self.assertIn('no transferred qualification', a['qualification'])

    def test_requested_action_coverage_has_priority_over_scalar_score(self):
        no_light = candidate(('cloister', 'slider-island', 'spring-reception',
                              'tidal-staircase'), 1000)
        with_light = candidate(('tidal-staircase', 'bellows-question-answer',
                                'light-cavity', 'slider-island'), -1000)
        chosen = V4.choose_complete([no_light, with_light], 701, 'arcade',
                                    ['release-fall'])
        self.assertIn('light-cavity', order(chosen))
        self.assertEqual(chosen['grammar']['covered_requested_actions'], ['release-fall'])

    def test_variant_multiplicity_and_iteration_order_do_not_buy_macro_weight(self):
        a = candidate(('cloister', 'slider-island', 'spring-reception', 'tidal-staircase'))
        b = candidate(('tidal-staircase', 'spring-reception', 'cloister', 'slider-island'))
        variants = [candidate(order(a[1]), 0, 'alternate')] * 19
        expected = order(V4.choose_complete([a, b], 2701, 'arcade', ['rise']))
        for choices in ([a, b] + variants, list(reversed([a, b] + variants))):
            result = V4.choose_complete(choices, 2701, 'arcade', ['rise'])
            self.assertEqual(expected, order(result))
            self.assertEqual(result['grammar']['candidate_order_count'], 2)

    def test_selection_preserves_input_and_admitted_geometry(self):
        rows = [candidate(('cloister', 'slider-island', 'spring-reception', 'tidal-staircase'))]
        before = copy.deepcopy(rows)
        selected = V4.choose_complete(rows, 701, 'arcade', ['rise'])
        self.assertEqual(rows, before)
        for field in ('seq', 'count', 'last', 'score', 'qualification'):
            self.assertEqual(selected[field], before[0][1][field])
        self.assertIsNot(selected, rows[0][1])

    def test_incremental_reward_favors_a_new_requested_verb(self):
        f = {'family': 'light-cavity'}
        new = candidate(('tidal-staircase',))[1]['seq']
        covered = candidate(('light-cavity',))[1]['seq']
        a = V4.score_adjustment(new, f, 'develop', 1, 701, 'arcade',
                                actions=['release-fall'])
        b = V4.score_adjustment(covered, f, 'develop', 1, 701, 'arcade',
                                actions=['release-fall'])
        self.assertGreater(a, b)
        self.assertEqual(a, V4.score_adjustment(new, f, 'develop', 1, 701, 'arcade',
                                               actions=['release-fall']))

    def test_bounded_real_authoring_has_distinct_orders_and_keeps_native_limits(self):
        palette = ['cloister', 'slider-island', 'spring-reception', 'tidal-staircase']
        choices = []
        for seed in (701, 2701):
            first = G.build(seed, experimental=True, revision=4, families=palette)
            self.assertEqual(first, G.build(seed, experimental=True, revision=4, families=palette))
            modules = first['integration']['modules']
            families = tuple(module['family'] for module in modules)
            choices.append(families)
            self.assertGreaterEqual(len(set(families)), 4)
            self.assertLessEqual(len(first['obstacles']), 40)
            self.assertLessEqual(first['width'], 5000)
            self.assertGreaterEqual((first['width'] - 60) / 150, 30)
            self.assertLessEqual((first['width'] - 60) / 150, 32.9)
            self.assertEqual([m['role'] for m in modules],
                             [V4.role_for(i, seed, 'arcade') for i in range(len(modules))])
            self.assertEqual(first['integration']['status'], 'experimental')
        self.assertNotEqual(*choices)

    def test_requested_action_and_theme_change_actual_selection(self):
        base = G.build(701, experimental=True, revision=4)
        release = G.build(701, experimental=True, revision=4, actions=['contact-or-bypass'])
        base_order = [m['family'] for m in base['integration']['modules']]
        release_order = [m['family'] for m in release['integration']['modules']]
        self.assertNotEqual(base_order, release_order)
        self.assertIn('spring-reception', release_order)
        self.assertEqual(release['integration']['plan']['unmatched_requested_actions'], [])
        themed = [tuple(m['family'] for m in G.build(
            701, experimental=True, revision=4, theme=theme)['integration']['modules'])
                  for theme in G.THEMES]
        self.assertGreater(len(set(themed)), 1)

    def test_no_candidate_fails_explicitly(self):
        with self.assertRaisesRegex(ValueError, 'No complete plan'):
            V4.choose_complete([], 701, 'arcade', [])


if __name__ == '__main__':
    unittest.main()
