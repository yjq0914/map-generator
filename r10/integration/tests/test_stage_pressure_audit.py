"""Saved-data and synthetic analytical fixtures only; never run physics."""
import copy
import hashlib
import json
from pathlib import Path
import sys
import unittest

HERE = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(HERE))
import audit_stage_pressure as audit


def rows_for(ys, xs=None):
    return [dict(tick=i, x=xs[i] if xs else i, y=y, vy=0, alive=1) for i,y in enumerate(ys)]


class StagePressureTests(unittest.TestCase):
    def test_near_equal_84_85_is_one_run(self):
        ticks=[10,94,179,263,348]
        result=audit.equal_cadence_runs(ticks)
        self.assertEqual(len(result),1)
        self.assertEqual(result[0]['interval_count'],4)
        self.assertEqual(result[0]['compatible_integer_period_ticks'],[84,85])
        self.assertAlmostEqual(result[0]['duration_s'],338/120)
        self.assertEqual(ticks,[10,94,179,263,348])

    def test_one_fixed_period_does_not_allow_cumulative_drift(self):
        # Every adjacent gap differs by1, but84..88cannot be a single±1period.
        ticks=[0,84,169,255,342,430]
        runs=audit.equal_cadence_runs(ticks)
        self.assertEqual([(r['minimum_gap_ticks'],r['maximum_gap_ticks']) for r in runs],[(84,86),(85,87),(86,88)])
        self.assertTrue(all(r['interval_count']==3 for r in runs))
        # Their overlap must not multiply observed time share.
        summary=audit.cadence_summary(ticks,430/120)
        self.assertAlmostEqual(summary['equal_cadence_observed_time_share'],1)

    def test_unrelated_periods_split_and_short_runs_are_omitted(self):
        self.assertEqual(audit.equal_cadence_runs([0,84,168]),[])
        runs=audit.equal_cadence_runs([0,84,168,252,312,372,432])
        self.assertEqual(len(runs),2)
        self.assertEqual([r['minimum_gap_ticks'] for r in runs],[84,60])
        with self.assertRaises(ValueError): audit.equal_cadence_runs([0,0,84])

    def test_major_scale_filters_small_flap_oscillation(self):
        rows=rows_for([270,245,220,245,270,245,220,245,270])
        self.assertEqual(audit.major_movements(rows,60),[])
        self.assertGreater(len(audit.major_movements(rows,40)),0)

    def test_major_reversal_uses_extreme_and_confirmation_tick(self):
        rows=rows_for([270,230,200,180,210,239,240,250])
        moves=audit.major_movements(rows,60)
        self.assertEqual([(e['tick'],e['direction'],e['reversal']) for e in moves],[(2,'up',False),(6,'down',True)])
        self.assertEqual(moves[1]['origin_tick'],3)
        self.assertEqual(moves[1]['confirmed_displacement_px'],60)

    def test_duration_and_spatial_finish_do_not_follow_censoring_or_canvas(self):
        native={'durationTicks':14400,'winMode':'timed-route','width':24000,
                'routeMarks':[{'id':'finish','x':17871.378}],'integration':{'plan':{'actual_duration_s':120}}}
        self.assertEqual(audit.intended_duration_ticks(native),(14400,'map.durationTicks'))
        self.assertEqual(audit.spatial_finish(native,60),(17871.378,'routeMarks[id=finish].x'))
        del native['routeMarks']
        with self.assertRaises(ValueError): audit.spatial_finish(native,60)
        native={'width':4560,'integration':{'plan':{'actual_duration_s':30.001}}}
        self.assertEqual(audit.intended_duration_ticks(native)[0],3601)
        self.assertEqual(audit.spatial_finish(native,60),(4560,'map.width'))

    def test_ended_window_has_one_fewer_decisions_than_states(self):
        rows=rows_for([200,190,170,130,140])
        clear=[dict(tick=t,minimum_clearance_px=v) for t,v in [(0,30),(2,20),(4,10)]]
        movements={t:audit.major_movements(rows,t) for t in audit.SENSITIVITY_PX}
        first=audit.selected_metrics(rows,[0,1],[0,2],clear,movements,[1,2,3],[])
        last=audit.selected_metrics(rows,[2,3],[0,2],clear,movements,[1,2,3],[])
        self.assertEqual(first['decision_count'],2)
        self.assertEqual(first['native_y_px']['count'],3)
        self.assertEqual(first['sampled_clearance_px']['count'],1)
        self.assertEqual(last['sampled_clearance_px']['count'],2)
        self.assertEqual(first['total_absolute_y_travel_px'],30)
        self.assertEqual(last['major_movement_by_threshold_px']['60']['confirmed_excursions'],1)

    def test_missing_stage_stays_null_and_no_fake_reversal(self):
        rows=rows_for([200,190])
        result=audit.selected_metrics(rows,[],[],[],{t:[] for t in audit.SENSITIVITY_PX},[],[])
        self.assertIsNone(result['native_y_range_px'])
        self.assertIsNone(result['cadence']['flaps_per_s'])
        self.assertIsNone(result['sampled_clearance_px']['minimum'])
        self.assertIsNone(result['major_movement_by_threshold_px']['60']['reversals_per_s'])

    def test_quantiles_and_even_median_are_exact(self):
        d=audit.distribution([10,40,20,30])
        self.assertEqual(d['median'],25)
        self.assertEqual(d['p10'],13)
        self.assertEqual(d['p90'],37)

    def test_gate_clock_reserve_and_saved_phase_are_separate(self):
        rows=rows_for([270]*121, [60+i*150/120 for i in range(121)])
        gate=dict(id='gate', mechanic_kind='timed_armor_gate',x=100,y=270,
            collider=dict(w=30,h=100),motion={},
            timeline=dict(start_s=0,warning_s=.05,opening_s=.05,hold_s=.5,closing_s=.2,cooldown_s=2))
        laser=dict(id='laser',mechanic_kind='laser_scanner',x=100,y=200,
            collider=dict(w=30,h=100,width=10),motion=dict(dx_px=30),timeline={})
        native=dict(obstacles=[gate,laser],integration=dict(modules=[]))
        trace=dict(bodyFrames=[dict(tick=40,bodies=[dict(id='gate:top',sourceId='gate',status='open',phase='open',lethal=True)])])
        found=audit.timing_observations(native,trace,rows)
        reserve=found[0]['nominal_full_open_reserves']
        self.assertAlmostEqual(reserve['entry_after_full_open_s'],.1)
        self.assertAlmostEqual(reserve['tail_before_closing_s'],.6-80/150)
        self.assertEqual(found[0]['saved_phase_samples'][0]['phases'],['open'])
        self.assertTrue(found[0]['horizontal_tail_reached_alive'])
        self.assertEqual(found[1]['horizontal_radius_expanded_interval_px'],[85,145])
        summary=audit.timing_window_summary(found,range(121))
        self.assertIsNone(summary['actual_early_late_input_tolerance_s'])
        self.assertIsNone(summary['actual_correctable_spatial_margin_px'])
        rows[20]['x']+=1
        self.assertIsNone(audit.timing_observations(native,trace,rows)[0]['nominal_full_open_reserves'])

    def test_golden_censored_holdout_and_macro_are_read_only(self):
        root=HERE/'runs/four-loops/B4'
        dirs=[root/'runs/holdout-4408',root/'finish-checks/macro-5703']
        files=[p for d in dirs for p in d.iterdir() if p.is_file()]
        before={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
        failed,macro=[audit.audit_run(d) for d in dirs]
        after={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}
        self.assertEqual(before,after)
        self.assertEqual(failed['outcome'],'death')
        self.assertEqual([s['complete'] for s in failed['elapsed_time_stages']],[True,False,False])
        self.assertEqual(failed['elapsed_time_stages'][2]['observed_seconds'],0)
        self.assertEqual([s['complete'] for s in macro['elapsed_time_stages']],[True]*3)
        self.assertEqual([s['cadence']['flaps_per_s'] for s in macro['elapsed_time_stages']],[1.5,1.5,1.55])
        longest=macro['whole_trace']['cadence']['longest_equal_cadence_run']
        self.assertAlmostEqual(longest['duration_s'],506/120)
        self.assertEqual(longest['module_sources'][0]['id'],'m18')
        self.assertEqual(macro['evidence']['new_physics_runs'],0)


if __name__=='__main__': unittest.main()
