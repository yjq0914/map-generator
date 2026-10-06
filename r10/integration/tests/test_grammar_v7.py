"""Terminal authoring checks only: no native trajectory or physical probe."""
import copy
import pathlib
import sys
import unittest
from unittest.mock import patch

HERE = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
import generator as G
from rules import grammar_v4 as V4, grammar_v7 as V7
from rules.geometry_v4 import refine_fragment as refine_v4
from rules.geometry_v5 import refine_fragment as refine_v5


def fragment(family, variant='base'):
    f = refine_v5(refine_v4(G.fragment(family, variant), revision=7), revision=7)
    f['active_start'], f['active_end'] = G.extents(f['map'])
    return f


def candidate(order, score=0, variant='base', seed=701):
    return score, {
        'seq': [{'fragment': fragment(family, variant), 'dx': i * 500,
                 'role': V4.role_for(i, seed, 'arcade')}
                for i, family in enumerate(order)],
        'last': 4545, 'count': 30, 'score': score, 'seen': set(order),
    }


def family_order(state):
    return tuple(row['fragment']['family'] for row in state['seq'])


def build_and_capture(seed=701, theme='arcade', **kwargs):
    """Exercise the compiler without modifying its revision hook or stepping it."""
    admitted = []
    choose = V7.choose_complete
    def select(complete, *args):
        admitted.extend(complete)
        return choose(complete, *args)
    with patch.object(V4, 'choose_complete', select), patch.object(V7, 'choose_complete', select):
        result = G.build(seed, theme=theme, experimental=True, revision=7, **kwargs)
    return result, admitted


class GrammarV7Tests(unittest.TestCase):
    def test_resolution_is_supported_by_retained_body_and_control(self):
        expected = {
            'cloister': ('returning-contour', 200),
            'tidal-staircase': ('returning-contour', 235),
            'spring-reception': ('receipt', None),
            'light-cavity': ('receipt', 375),
            'bellows-question-answer': ('sustained-outlet', 375),
        }
        for family, (intent, target) in expected.items():
            for variant in ('base', 'alternate'):
                with self.subTest(family=family, variant=variant):
                    f = fragment(family, variant)
                    result = V7._resolution(f)
                    self.assertEqual(result['intent'], intent)
                    self.assertEqual(result['retained_terminal_guide_local_x'][1], f['active_end'])
                    if target is not None:
                        self.assertEqual(result['source_terminal_target_y'], target)
                    self.assertTrue(result['source_body_ids'])
                    self.assertLess(result['retained_terminal_guide_local_x'][0], f['active_end'])
        self.assertIsNone(V7._resolution(fragment('slider-island')))
        spring = V7._resolution(fragment('spring-reception', 'alternate'))
        self.assertEqual(spring['source_terminal_target_y'], 460)
        self.assertIn('receipt-answer-roof', spring['source_body_ids'])

    def test_family_label_without_existing_control_cannot_claim_resolution(self):
        f = fragment('light-cavity')
        f['guide'] = [dict(g, policy='not-a-receipt') for g in f['guide']]
        self.assertIsNone(V7._resolution(f))
        f = fragment('tidal-staircase')
        f['map']['obstacles'] = [b for b in f['map']['obstacles'] if b['id'] != 'bank-4']
        self.assertIsNone(V7._resolution(f))
        self.assertIsNone(V7._resolution({'family': 'spring-reception'}))

    def test_actual_plan_length_controls_resolution_and_preserves_geometry(self):
        for order in (
            ('cloister', 'slider-island', 'spring-reception', 'tidal-staircase'),
            ('cloister', 'slider-island', 'spring-reception', 'light-cavity', 'bellows-question-answer'),
            ('cloister', 'slider-island', 'spring-reception', 'tidal-staircase',
             'light-cavity', 'bellows-question-answer', 'cloister'),
        ):
            with self.subTest(module_count=len(order)):
                source = candidate(order)
                before = copy.deepcopy(source)
                selected = V7.choose_complete([source], 701, 'arcade', ['rise'])
                self.assertEqual(source, before)
                self.assertEqual(len(selected['grammar']['slots']), len(order))
                self.assertEqual(selected['grammar']['actual_module_count'], len(order))
                self.assertEqual(selected['grammar']['terminal_resolution']['module_index'], len(order) - 1)
                self.assertEqual(selected['seq'][-1]['role'], 'resolve')
                self.assertEqual(selected['seq'][:-1], source[1]['seq'][:-1])
                self.assertEqual(selected['seq'][-1]['fragment'], source[1]['seq'][-1]['fragment'])
                self.assertEqual(selected['seq'][-1]['dx'], source[1]['seq'][-1]['dx'])
                for field in ('count', 'last', 'score', 'seen'):
                    self.assertEqual(selected[field], source[1][field])
                self.assertEqual(selected['grammar']['terminal_resolution']['admission_role'],
                                 source[1]['seq'][-1]['role'])

    def test_maximal_requested_action_coverage_precedes_resolution(self):
        resolving = candidate(('cloister', 'spring-reception', 'light-cavity', 'tidal-staircase'), 1000)
        committed = candidate(('cloister', 'spring-reception', 'light-cavity', 'slider-island'), -1000)
        selected = V7.choose_complete([resolving, committed], 701, 'arcade', ['choose-layer'])
        self.assertEqual(family_order(selected), family_order(committed[1]))
        self.assertEqual(selected['seq'][-1]['role'], committed[1]['seq'][-1]['role'])
        terminal = selected['grammar']['terminal_resolution']
        self.assertEqual(terminal['status'], 'unavailable-at-maximal-action-coverage')
        self.assertNotIn('intent', terminal)
        self.assertEqual(selected['grammar']['covered_requested_actions'], ['choose-layer'])
        self.assertEqual(selected['grammar']['resolving_order_count'], 0)

    def test_remaining_action_is_computed_at_actual_terminal_boundary(self):
        source = candidate(('cloister', 'slider-island', 'tidal-staircase', 'spring-reception'))
        selected = V7.choose_complete([source], 702, 'foundry',
                                     ['rise', 'choose-layer', 'contact-or-bypass', 'catch', 'unknown-verb'])
        terminal = selected['grammar']['terminal_resolution']
        self.assertEqual(terminal['remaining_requested_actions_before_terminal'],
                         ['catch', 'contact-or-bypass', 'unknown-verb'])
        self.assertEqual(terminal['answered_requested_actions'], ['catch', 'contact-or-bypass'])
        self.assertEqual(terminal['unmatched_requested_actions'], ['unknown-verb'])

    def test_duplicate_variants_and_input_order_do_not_buy_family_order_weight(self):
        a = candidate(('cloister', 'slider-island', 'light-cavity', 'tidal-staircase'))
        b = candidate(('tidal-staircase', 'slider-island', 'light-cavity', 'cloister'))
        duplicates = [candidate(family_order(a[1]), variant='alternate')] * 19
        expected = family_order(V7.choose_complete([a, b], 701, 'arcade', ['rise']))
        for choices in ([a, b] + duplicates, list(reversed([a, b] + duplicates))):
            selected = V7.choose_complete(choices, 701, 'arcade', ['rise'])
            self.assertEqual(family_order(selected), expected)
            self.assertEqual(selected['grammar']['candidate_order_count'], 2)
            self.assertEqual(selected, V7.choose_complete(choices, 701, 'arcade', ['rise']))

    def test_real_completions_change_family_order_with_distinct_active_endings(self):
        endings, pressures, changed = set(), set(), []
        for seed, theme in ((701, 'arcade'), (702, 'foundry'), (705, 'foundry'), (703, 'signal')):
            with self.subTest(seed=seed, theme=theme):
                generated, complete = build_and_capture(seed, theme)
                plan = generated['integration']['plan']
                modules = generated['integration']['modules']
                selected = V7.choose_complete(complete, seed, theme, G.THEMES[theme])
                old = V4.choose_complete(complete, seed, theme, G.THEMES[theme])
                changed.append(family_order(selected) != family_order(old))
                endings.add(plan['grammar']['terminal_resolution']['intent'])
                pressures.add(G.CATALOG[modules[-1]['family']]['pressure'])
                self.assertEqual(modules[-1]['role'], 'resolve')
                self.assertNotEqual(modules[-1]['family'], 'slider-island')
                self.assertEqual(plan['unmatched_requested_actions'], [])
                self.assertEqual(generated, build_and_capture(seed, theme)[0])
                self.assertGreaterEqual(len(set(m['family'] for m in modules)), 4)
                self.assertLessEqual(len(generated['obstacles']), 40)
                self.assertLessEqual(generated['width'], 5000)
                self.assertGreaterEqual(plan['actual_duration_s'], 30)
                self.assertLessEqual(plan['actual_duration_s'], 32.9)
                # No added filler: the existing compiler's160px terminal span.
                self.assertAlmostEqual(generated['width'] - modules[-1]['active_end_x'], 160)
        self.assertTrue(changed[0], 'Existing seed701 must change its actual family order')
        self.assertEqual(endings, {'returning-contour', 'receipt', 'sustained-outlet'})
        self.assertIn(3, pressures, 'Resolution must not collapse to low-pressure flat endings')

    def test_explicit_palette_and_partial_coverage_are_preserved(self):
        palette = ['cloister', 'slider-island', 'spring-reception', 'tidal-staircase']
        generated, complete = build_and_capture(701, 'arcade', families=palette,
                                                actions=['rise', 'catch', 'release-fall'])
        plan = generated['integration']['plan']
        self.assertEqual(plan['unmatched_requested_actions'], ['release-fall'])
        self.assertTrue(set(m['family'] for m in generated['integration']['modules']) <= set(palette))
        self.assertEqual(plan['grammar']['covered_requested_actions'], ['catch', 'rise'])
        self.assertEqual(plan['grammar']['terminal_resolution']['unmatched_requested_actions'], ['release-fall'])

    def test_invalid_completions_fail_explicitly(self):
        for entries, message in (([], 'No complete plan'),
                                 ([(0, {'seq': []})], 'empty sequence'),
                                 ([(0, {'seq': [{'fragment': {'family': 'missing'}}]})], 'unknown family')):
            with self.subTest(message=message):
                with self.assertRaisesRegex(ValueError, message):
                    V7.choose_complete(entries, 701, 'arcade', [])


if __name__ == '__main__':
    unittest.main()
