"""Pure staged authoring tests; no native physics or trajectory claims."""
import copy
import pathlib
import sys
import unittest

HERE = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
import generator as G
from rules import stage_grammar_v8 as V8
from rules.geometry_v4 import refine_fragment as v4
from rules.geometry_v5 import refine_fragment as v5
from rules.handoffs_v6 import refine_fragment as v6
from rules.receipt_v7 import refine_fragment as v7


def fragment(family, variant='base'):
    f = v7(v6(v5(v4(G.fragment(family, variant), revision=7), revision=7), revision=7), revision=7)
    f['active_start'], f['active_end'] = G.extents(f['map'])
    return f


def candidate(order, variant='base', score=0):
    rows = []
    for i, family in enumerate(order):
        f = fragment(family, variant)
        rows.append({'fragment': f, 'dx': 60 + i * 1500 - f['active_start'], 'role': 'develop'})
    last = rows[-1]['fragment']['active_end'] + rows[-1]['dx']
    return score, {'seq': rows, 'last': last, 'score': score,
                   'count': sum(len(r['fragment']['map']['obstacles']) for r in rows),
                   'seen': set(order)}


class StageGrammarV8Tests(unittest.TestCase):
    def test_stage_uses_absolute_duration_not_module_or_fixed_twelve_seconds(self):
        # Same elapsed second belongs to different stages on short and macro.
        at_15s = 60 + 15 * 150
        self.assertEqual(V8.stage_for(at_15s, at_15s + 10, 31.5), 1)
        self.assertEqual(V8.stage_for(at_15s, at_15s + 10, 120), 0)
        self.assertEqual(V8.stage_for(60 + 40 * 150, 60 + 41 * 150, 120), 1)
        self.assertEqual(V8.stage_for(60 + 80 * 150, 60 + 81 * 150, 120), 2)
        context = V8.stage_context(60 + 9.5 * 150, 60 + 11.5 * 150, 31.5)
        self.assertEqual(context['overlap_fractions'], [.5, .5, 0])
        self.assertEqual(context['name'], 'redirect')

    def test_invalid_stage_ranges_fail_and_clipped_tail_stays_chain(self):
        for args in ((1, 1, 30), (1, 2, 0), (1, float('nan'), 30)):
            with self.assertRaises(ValueError):
                V8.stage_context(*args)
        self.assertEqual(V8.stage_context(20000, 20100, 120)['overlap_fractions'], [0, 0, 1])

    def test_profile_requires_physical_sources_and_keeps_aims_separate(self):
        f = fragment('tidal-staircase')
        profile = V8.fragment_profile(f)
        self.assertGreater(profile['disjoint_band_changes'], 0)
        self.assertEqual(profile['sustain_support'], 'visible-source-confinement')
        self.assertEqual(profile['longest_constant_span_px'], 415)
        f['map']['obstacles'] = []
        f['metadata']['stage_relations_v8'] = {
            'stage_name': 'chain', 'changed_bodies': ['imaginary'],
            'action_bands': [{'source_body_ids': ['imaginary'], 'center_band_y': [0, 20], 'x': 400}]}
        unsupported = V8.fragment_profile(f)
        self.assertEqual(unsupported['source_bands'], [])
        self.assertEqual(unsupported['disjoint_band_changes'], 0)
        self.assertEqual(unsupported['sustain_support'], 'unattributed-author-aim')

    def test_real_receipt_answer_counts_without_forcing_spring_contact(self):
        base = V8.fragment_profile(fragment('spring-reception'))
        answer = V8.fragment_profile(fragment('spring-reception', 'alternate'))
        self.assertEqual(base['disjoint_band_changes'], 0)
        self.assertEqual(answer['disjoint_band_changes'], 1)
        self.assertAlmostEqual(answer['minimum_band_travel_px'], 13.48560975609756)
        self.assertEqual(answer['timed_body_ids'], ['G-receiver'])
        self.assertNotIn('S-reset', answer['timed_body_ids'])

    def test_confinement_or_timing_sustain_is_not_blanket_penalized(self):
        for family in ('tidal-staircase', 'bellows-question-answer'):
            f = fragment(family)
            profile = V8.fragment_profile(f)
            changed = dict(profile, long_constant_excess_px=10000,
                           longest_constant_span_px=10000, high_constant_length_px=10000)
            self.assertEqual(V8._row_fit(f, 12000, 120, profile)[0],
                             V8._row_fit(f, 12000, 120, changed)[0])

    def test_more_source_redirects_and_timed_chains_change_stage_preference(self):
        static = V8.fragment_profile(fragment('cloister'))
        timed = V8.fragment_profile(fragment('bellows-question-answer'))
        self.assertGreater(V8._stage_fits(static)[0], V8._stage_fits(timed)[0])
        self.assertGreater(V8._stage_fits(timed)[2], V8._stage_fits(static)[2])
        answer = V8.fragment_profile(fragment('spring-reception', 'alternate'))
        receipt = V8.fragment_profile(fragment('spring-reception'))
        self.assertGreater(V8._stage_fits(answer)[1], V8._stage_fits(receipt)[1])

    def test_stage_geometry_adds_source_evidence_without_inventing_forced_reversals(self):
        from rules.stage_relations_v8 import refine_fragment
        for family in ('tidal-staircase', 'slider-island'):
            original = fragment(family)
            base = V8.fragment_profile(original)
            staged = refine_fragment(original, stage=2)
            changed = V8.fragment_profile(staged)
            self.assertGreater(len(changed['source_bands']), len(base['source_bands']))
            self.assertEqual(changed['disjoint_band_changes'], base['disjoint_band_changes'])
            self.assertEqual(changed['band_direction_reversals'], base['band_direction_reversals'])
            self.assertTrue(all(set(band['source_body_ids']) <=
                                {body['id'] for body in staged['map']['obstacles']}
                                for band in changed['source_bands']))

    def test_selection_changes_actual_order_and_preserves_admitted_geometry(self):
        staged = candidate(('cloister', 'tidal-staircase', 'light-cavity'))
        reversed_actions = candidate(('light-cavity', 'tidal-staircase', 'cloister'), score=1000)
        before = copy.deepcopy([staged, reversed_actions])
        selected = V8.choose_complete([staged, reversed_actions], 701, 'arcade', [], 31.5)
        self.assertEqual([r['fragment']['family'] for r in selected['seq']],
                         ['cloister', 'tidal-staircase', 'light-cavity'])
        self.assertEqual([staged, reversed_actions], before)
        for original, actual in zip(staged[1]['seq'], selected['seq']):
            self.assertEqual(original['fragment'], actual['fragment'])
            self.assertEqual(original['dx'], actual['dx'])
        self.assertEqual(selected['grammar']['schema'], V8.VERSION)
        self.assertEqual(selected['grammar']['actual_family_order'],
                         ['cloister', 'tidal-staircase', 'light-cavity'])
        self.assertEqual(selected['seq'][-1]['role'], 'resolve')
        self.assertNotIn('beam_slots', selected['grammar'])

    def test_final_duration_is_actual_native_duration_with_macro_exception(self):
        source = candidate(('cloister', 'tidal-staircase', 'light-cavity'))
        for requested in (30.3, 31.0, 31.7, 32.5):
            selected = V8.choose_complete([source], 701, 'arcade', [], requested)
            actual = (source[1]['last'] + 100) / 150
            self.assertEqual(selected['grammar']['stage_duration_s'], actual)
            self.assertEqual(selected['grammar']['stages'][-1]['end_s'], actual)
        macro = V8.choose_complete([source], 701, 'arcade', [], 120)
        self.assertEqual(macro['grammar']['stage_duration_s'], 120)

    def test_coverage_precedes_stage_fit_and_every_family_stays_eligible(self):
        without = candidate(('cloister', 'tidal-staircase', 'light-cavity'), score=1000)
        with_action = candidate(('cloister', 'tidal-staircase', 'slider-island'), score=-1000)
        selected = V8.choose_complete([without, with_action], 701, 'arcade', ['choose-layer'], 31.5)
        self.assertEqual(selected['seq'][-1]['fragment']['family'], 'slider-island')
        self.assertEqual(selected['grammar']['terminal_resolution']['status'],
                         'unavailable-at-maximal-action-coverage')
        for family in G.CATALOG:
            source = candidate(('cloister', family, 'tidal-staircase'))
            selected = V8.choose_complete([source], 701, 'arcade', [], 31.5)
            self.assertIn(family, selected['grammar']['actual_family_order'])

    def test_duplicates_and_input_order_cannot_buy_selection_weight(self):
        a = candidate(('cloister', 'tidal-staircase', 'light-cavity'))
        b = candidate(('tidal-staircase', 'cloister', 'bellows-question-answer'))
        expected = V8.choose_complete([a, b], 703, 'signal', [], 31.5)
        for choices in ([a] * 15 + [b], [b] + [a] * 15):
            self.assertEqual(expected, V8.choose_complete(choices, 703, 'signal', [], 31.5))
        self.assertEqual(expected['grammar']['candidate_order_count'], 2)

    def test_invalid_completions_fail_explicitly(self):
        with self.assertRaisesRegex(ValueError, 'No complete plan'):
            V8.choose_complete([], 1, 'arcade', [])
        with self.assertRaisesRegex(ValueError, 'empty sequence'):
            V8.choose_complete([(0, {'seq': []})], 1, 'arcade', [])
        with self.assertRaisesRegex(ValueError, 'unknown family'):
            V8.choose_complete([(0, {'seq': [{'fragment': {'family': 'missing'}}]})], 1, 'arcade', [])


if __name__ == '__main__':
    unittest.main()
