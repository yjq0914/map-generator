"""Focused read-only fixtures. No generator calls or native runtime executions."""
import copy
import hashlib
import json
from pathlib import Path
import sys
import unittest

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
import audit_action_quality as audit


class ActionQualityTests(unittest.TestCase):
    def test_constant_targets_merge_but_keep_policy_and_module_provenance(self):
        rows = [dict(x=0, until_x=20, target_y=200, module_id='a'),
                dict(x=20, until_x=50, target_y=200, module_id='b', policy='spring-acquire'),
                dict(x=50, until_x=100, target_y=200, target_y_end=210, module_id='b'),
                dict(x=100, until_x=140, target_y=200, module_id='b')]
        original = copy.deepcopy(rows)
        spans = audit.constant_guide_spans(rows)
        self.assertEqual(spans[0]['length_px'], 50)
        self.assertEqual(spans[0]['module_ids'], ['a', 'b'])
        self.assertEqual(spans[0]['policies'], ['feedback', 'spring-acquire'])
        self.assertEqual(spans[1]['length_px'], 40)
        self.assertEqual(rows, original)

    def test_equal_targets_across_gap_do_not_merge(self):
        spans = audit.constant_guide_spans([dict(x=0, until_x=10, target_y=100),
                                           dict(x=11, until_x=21, target_y=100)])
        self.assertEqual(len(spans), 2)
        with self.assertRaises(ValueError):
            audit.constant_guide_spans([dict(x=0, until_x=10, target_y=100),
                                        dict(x=9, until_x=21, target_y=100)])

    def test_actual_y_and_flaps_do_not_come_from_guide(self):
        rows = [dict(tick=t, x=10*t, y=y, vy=0, alive=1)
                for t, y in enumerate([200, 170, 160, 190, 210])]
        module = dict(id='m1', family='f', variant='base', role='peak', action=['rise'],
                      start_x=0, end_x=40, active_start_x=10, active_end_x=40,
                      body_ids=['m1-spring'])
        events = [{'type': 'bounce', 'id': 'm1-spring', 'tick': 2},
                  {'type': 'bounce', 'id': 'm2-spring', 'tick': 3}]
        result = audit.module_metrics(module, rows, [0, 2, 4], events)
        self.assertEqual(result['all_module_y']['range_px'], 40)
        self.assertEqual(result['active_geometry_y']['range_px'], 30)
        self.assertEqual(result['flaps']['count'], 2)  # terminal row not a decision
        self.assertEqual(result['flaps']['inter_flap_ticks']['median'], 2)
        self.assertEqual(len(result['bounce_contacts']), 1)
        self.assertEqual(result['active_end_reached']['tick'], 4)

    def test_unreached_module_keeps_null_y_and_no_fake_action(self):
        module = dict(id='m2', family='f', variant='base', role='resolve', action=['catch'],
                      start_x=100, end_x=200, active_start_x=120, active_end_x=200, body_ids=[])
        rows = [dict(tick=0, x=0, y=250, vy=0, alive=1)]
        result = audit.module_metrics(module, rows, [], [])
        self.assertFalse(result['active_geometry_reached'])
        self.assertIsNone(result['active_geometry_y']['range_px'])
        self.assertIsNone(result['active_end_reached'])

    def test_sequence_similarity_is_token_order_sensitive(self):
        self.assertEqual(audit.normalized_sequence_similarity([], []), 1)
        self.assertEqual(audit.normalized_sequence_similarity([], ['x']), 0)
        self.assertEqual(audit.normalized_sequence_similarity(['a', 'b'], ['a', 'b']), 1)
        self.assertEqual(audit.normalized_sequence_similarity(['a', 'b'], ['b', 'a']), 0)
        self.assertAlmostEqual(audit.normalized_sequence_similarity(['a', 'b'], ['a', 'c', 'b']), 2/3)
        self.assertAlmostEqual(audit.normalized_sequence_similarity(['rise', 'fall', 'rise'], ['rise', 'fall']), 2/3)

    def test_clearance_uses_saved_frames_and_discloses_unsupported_shapes(self):
        rows = [dict(tick=0, x=50, y=100, vy=0, alive=1),
                dict(tick=1, x=51, y=110, vy=2, alive=1)]
        rectangle = dict(id='wall', kind='fixed', shape='rectangle', x=80, y=80, w=20, h=50, lethal=True)
        trace = {'bodyFrames': [{'tick': 0, 'bodies': [rectangle,
                    dict(id='odd', shape='unknown', lethal=True)]}]}
        native = {'height': 540, 'integration': {'modules': []}}
        result = audit.sampled_clearance(trace, rows, native)
        self.assertEqual(len(result['series']), 1)  # no invented tick-1 body frame
        self.assertEqual(result['series'][0]['minimum_clearance_px'], 20)
        self.assertEqual(result['series'][0]['nearest_body_id'], 'wall')
        self.assertEqual(result['skipped_unsupported_lethal_shape_frame_count'], {'unknown': 1})
        movement = audit.y_summary(rows)
        self.assertEqual(movement['upward_tick_travel_px'], 0)
        self.assertEqual(movement['downward_tick_travel_px'], 10)

    def test_true_even_median(self):
        self.assertEqual(audit.stats([6.8, 12.7, 19.125, 10.4416667, 30, 30, 30, 30])['median'], 24.5625)

    def test_trace_schema_and_missing_ticks(self):
        trace = {'rowSchema': ['y', 'x', 'tick', 'vy', 'alive'],
                 'rows': [[100, 10, 0, 0, 1], [102, 11, 1, 2, 1]]}
        self.assertEqual(audit.trace_rows(trace)[1]['y'], 102)
        trace['rows'][1][2] = 2
        with self.assertRaises(ValueError):
            audit.trace_rows(trace)

    def test_b1_read_only_hash_bound_smoke(self):
        panel = HERE / 'runs/four-loops/B1'
        inputs = sorted(panel.glob('*-manifest.json')) + sorted((panel / 'runs').glob('*/*'))
        before = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in inputs if p.is_file()}
        result = audit.audit_panel(panel)
        after = {str(p): hashlib.sha256(p.read_bytes()).hexdigest() for p in inputs if p.is_file()}
        self.assertEqual(before, after)
        self.assertEqual(len(result['maps']), 24)
        self.assertEqual(result['arms']['candidate']['unique_authored_orders'], 7)
        self.assertEqual(result['arms']['candidate']['maps_with_unconsumed_resolve_slot'], 8)
        self.assertEqual(result['arms']['candidate']['observed_seconds']['median'], 24.5625)
        self.assertEqual(result['arms']['candidate']['native_wins'], 0)
        self.assertTrue(all(p['nominal_request_controller_runtime_horizon_match'] for p in result['paired_comparison']))
        self.assertTrue(all(r['evidence']['new_physics_runs_by_this_audit'] == 0 for r in result['maps']))
        # Metadata coverage never masquerades as measured behavior.
        self.assertTrue(all(r['observed']['measured_verb_coverage'] is None for r in result['maps']))
        self.assertLess(result['arms']['candidate']['maps_with_all_requested_verbs_attached_to_reached_modules'], 8)


if __name__ == '__main__':
    unittest.main()
