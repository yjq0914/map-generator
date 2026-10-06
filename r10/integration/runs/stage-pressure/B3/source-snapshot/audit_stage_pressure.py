#!/usr/bin/env python3
"""Read stored native traces for staged movement, space and cadence observations.

No map generation, runtime import, physics rollout, qualification or quality score.
Run folders may contain hash-bound REUSED.json. Output files must be new.
"""
from __future__ import annotations

import argparse
from collections import Counter
import gzip
import hashlib
import json
import math
from pathlib import Path
import statistics

from audit_action_quality import resolve_evidence, sampled_clearance, sha, trace_rows

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
HZ = 120
SCHEMA = 'native-stage-pressure-observations/1'
MAJOR_EXCURSION_PX = 60
SENSITIVITY_PX = (40, 60, 80)
CADENCE_TOLERANCE_TICKS = 1
CADENCE_MIN_INTERVALS = 3
DEFINITIONS = {
    'elapsed_time_stages': 'Three equal thirds of intended native duration, durationTicks when present, otherwise ceil(authored actual_duration_s * 120). Integer edges are ceil(k * durationTicks / 3). Never rescale thirds to observed survival time. The native world clock is tick/120, not CPU wallSeconds.',
    'spatial_stages': 'Three equal x intervals from native initial x to the unique finish routeMark when present, otherwise map.width. Rendering width is not a timed-course finish. Assign native tick intervals by pre-action x; terminal attained coverage is separate. Time after the finish mark is separately reported, not hidden in stage3.',
    'coverage': 'Observed tick-interval duration / planned elapsed-stage duration; native attained max-x fraction for spatial stage. Unreached or partially observed stages retain censoring and are never treated as complete. Death and fixed-horizon prefix censoring differ from native win.',
    'major_movement': 'Directional-change hysteresis on actual recorded y: first movement is recognized at 60px from initial y; subsequently reversal is recognized only after moving 60px back from the running extreme. Events are assigned at the threshold-confirmation tick, even when their origin precedes the stage/module. Report 40/80px sensitivity too. The ordinary isolated -290px/s flap apex under820px/s² is about51px, so60px filters that small cycle. This is a chosen descriptive scale, not a calibrated action threshold.',
    'input_transitions': 'Changes of actual binary flap/hold decisions at consecutive pre-action ticks. These typically count about twice the flaps and are not semantic human-action changes. Cadence-change events separately count adjacent interflap gaps differing by more than2ticks; assign to the closing flap tick.',
    'equal_cadence': 'A maximal run of at least3 consecutive interflap intervals all within ±1tick of one fixed integer period, equivalently max(gaps)-min(gaps)<=2. Maximal windows may overlap; union of first-to-last-flap durations is used for time share, never the sum. No inferred extension before the first or after the last flap. Equal timing can accompany a large y excursion; it is cadence repetition, not proof of uninteresting play.',
    'clearance': 'Empirical distribution of saved bodyFrames every12ticks (0.1s) plus terminal frame, using native y and current saved lethal geometry plus floor/ceiling and10px player radius. Linear (n−1) quantiles, no interpolation in time or geometry. Unsupported shapes are disclosed. It is not continuous/substep minimum, temporal reaction budget, safe range, calibrated pressure, or human difficulty.',
    'pressure_axes': 'Frequency/action density, spatial precision, input timing, anticipation/choice, carried-state control and sustained load/recovery are separate dimensions. No stage is required to increase frequency and amplitude together. Low-frequency precise timing can be demanding, and equal-frequency tapping is not inherently boring. Sampled clearance is only geometric proximity; actual correctable spatial margin, early/late input window, perceptual/choice demands and subjective mental pressure are UNKNOWN without interventions or human evidence.',
    'timing': 'Saved gate/laser status and phase during radius-expanded horizontal occupancy are native observations at stored frame times. Fixed-x gate nominal full-body occupancy and signed full-open entry/tail reserves are descriptor-derived at150px/s, only reported when observed preterminal x/vx confirms constant speed. Select the clock cycle containing nominal occupancy midpoint. A negative reserve means nominal occupancy extends outside that fully-open window; it does not prove collision. Neither reserve nor warning duration is an input timing tolerance or reaction budget.',
    'comparisons': 'Descriptive separate dimensions, no composite score, pass target, fun inference or changed acceptance. Complete-stage-only summaries are accompanied by attained counts; survivor selection remains a limitation. Differences in intended duration/module placement and censoring must be retained.',
}


def distribution(values):
    values = sorted(values)
    def q(p):
        if not values:
            return None
        pos = (len(values) - 1) * p
        lo = math.floor(pos)
        return values[lo] + (values[min(lo + 1, len(values) - 1)] - values[lo]) * (pos - lo)
    return dict(count=len(values), minimum=values[0] if values else None,
                p10=q(.1), median=q(.5), p90=q(.9), maximum=values[-1] if values else None)


def intended_duration_ticks(native):
    if 'durationTicks' in native:
        ticks = native['durationTicks']
        if not isinstance(ticks, int) or ticks < 1:
            raise ValueError('Invalid native durationTicks')
        return ticks, 'map.durationTicks'
    seconds = native['integration']['plan']['actual_duration_s']
    if not math.isfinite(seconds) or seconds <= 0:
        raise ValueError('Invalid authored actual duration')
    return math.ceil(seconds * HZ), 'ceil(integration.plan.actual_duration_s*120)'


def spatial_finish(native, initial_x):
    marks = [m for m in native.get('routeMarks', []) if m.get('id') == 'finish']
    if len(marks) > 1:
        raise ValueError('Ambiguous finish marks')
    if native.get('winMode') == 'timed-route' and not marks:
        raise ValueError('Timed course has no finish routeMark; do not use rendering width')
    end, source = (marks[0]['x'], 'routeMarks[id=finish].x') if marks else (native['width'], 'map.width')
    if end <= initial_x:
        raise ValueError('Non-positive spatial course')
    return end, source


def major_movements(rows, threshold=MAJOR_EXCURSION_PX):
    if threshold <= 0:
        raise ValueError('Threshold must be positive')
    if not rows:
        return []
    anchor = extreme = rows[0]
    direction = 0
    events = []
    for row in rows[1:]:
        change = row['y'] - (anchor if direction == 0 else extreme)['y']
        if direction == 0:
            if abs(change) < threshold:
                continue
            new_direction = 1 if change > 0 else -1
            origin = anchor
        elif direction * change >= 0:
            extreme = row
            continue
        elif abs(change) < threshold:
            continue
        else:
            new_direction = -direction
            origin = extreme
        events.append(dict(tick=row['tick'], x=row['x'], y=row['y'],
                           direction='down' if new_direction > 0 else 'up',
                           reversal=direction != 0, threshold_px=threshold,
                           origin_tick=origin['tick'], origin_y=origin['y'],
                           confirmed_displacement_px=abs(row['y'] - origin['y'])))
        direction = new_direction
        extreme = row
    return events


def equal_cadence_runs(ticks, tolerance=CADENCE_TOLERANCE_TICKS, min_intervals=CADENCE_MIN_INTERVALS):
    if tolerance < 0 or min_intervals < 1 or any(b <= a for a, b in zip(ticks, ticks[1:])):
        raise ValueError('Invalid cadence arguments/ticks')
    gaps = [b - a for a, b in zip(ticks, ticks[1:])]
    runs = []
    # Enumerate right-maximal windows, then omit windows contained in an earlier one.
    # Trace horizons are bounded to14400ticks; this is read-only and deterministic.
    prior_end = -1
    for start in range(len(gaps)):
        end = start
        low = high = gaps[start]
        while end + 1 < len(gaps):
            lo, hi = min(low, gaps[end + 1]), max(high, gaps[end + 1])
            if hi - lo > 2 * tolerance:
                break
            end += 1
            low, high = lo, hi
        if end - start + 1 < min_intervals or end <= prior_end:
            continue
        prior_end = end
        runs.append(dict(start_tick=ticks[start], end_tick=ticks[end + 1],
                         duration_s=(ticks[end + 1] - ticks[start]) / HZ,
                         interval_count=end - start + 1, flap_count=end - start + 2,
                         minimum_gap_ticks=low, maximum_gap_ticks=high,
                         compatible_integer_period_ticks=[high - tolerance, low + tolerance],
                         actual_intervals_ticks=gaps[start:end + 1]))
    return runs


def merge_intervals(intervals):
    merged = []
    for lo, hi in sorted(intervals):
        if hi <= lo:
            continue
        if merged and lo <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], hi)
        else:
            merged.append([lo, hi])
    return merged


def cadence_summary(ticks, observed_seconds):
    runs = equal_cadence_runs(ticks)
    seconds = sum(b - a for a, b in merge_intervals((r['start_tick'], r['end_tick']) for r in runs)) / HZ
    return dict(flaps=len(ticks), flaps_per_s=len(ticks) / observed_seconds if observed_seconds else None,
                inter_flap_ticks=distribution(b - a for a, b in zip(ticks, ticks[1:])),
                equal_cadence_runs=runs, longest_equal_cadence_run=max(runs, key=lambda r: (r['duration_s'], -r['start_tick'])) if runs else None,
                equal_cadence_union_seconds=seconds,
                equal_cadence_observed_time_share=seconds / observed_seconds if observed_seconds else None)


def selected_metrics(rows, selected_ticks, flaps, clearance, movements, transitions, cadence_changes):
    selected_ticks = set(selected_ticks)
    pairs = [(a, b) for a, b in zip(rows, rows[1:]) if a['tick'] in selected_ticks]
    duration = len(pairs) / HZ
    state_ticks = selected_ticks | {b['tick'] for _, b in pairs}
    states = [r for r in rows if r['tick'] in state_ticks]
    # Interior boundary samples/events belong to the next window. A terminal
    # sample has no following decision and is retained in its last observed window.
    event_ticks = selected_ticks | ({rows[-1]['tick']} if rows and rows[-1]['tick'] - 1 in selected_ticks else set())
    samples = [p for p in clearance if p['tick'] in event_ticks]
    local_flaps = [t for t in flaps if t in selected_ticks]
    # Discontinuous spatial re-entry must not fabricate consecutive cadence intervals.
    spans = merge_intervals((t, t + 1) for t in selected_ticks)
    local_runs = []
    for lo, hi in spans:
        local_runs.extend(equal_cadence_runs([t for t in local_flaps if lo <= t < hi]))
    cadence = cadence_summary(local_flaps, duration)
    cadence['inter_flap_ticks'] = distribution(b - a for lo, hi in spans
        for ticks in [[t for t in local_flaps if lo <= t < hi]] for a, b in zip(ticks, ticks[1:]))
    cadence['equal_cadence_runs'] = local_runs
    cadence['longest_equal_cadence_run'] = max(local_runs, key=lambda r: (r['duration_s'], -r['start_tick'])) if local_runs else None
    cadence['equal_cadence_union_seconds'] = sum(b - a for a, b in merge_intervals((r['start_tick'], r['end_tick']) for r in local_runs)) / HZ
    cadence['equal_cadence_observed_time_share'] = cadence['equal_cadence_union_seconds'] / duration if duration else None
    major = {}
    for threshold, events in movements.items():
        selected = [e for e in events if e['tick'] in event_ticks]
        reversals = sum(e['reversal'] for e in selected)
        major[str(threshold)] = dict(confirmed_excursions=len(selected), reversals=reversals,
            excursions_per_s=len(selected) / duration if duration else None,
            reversals_per_s=reversals / duration if duration else None,
            upward_confirmations=sum(e['direction'] == 'up' for e in selected),
            downward_confirmations=sum(e['direction'] == 'down' for e in selected), events=selected)
    travel = sum(abs(b['y'] - a['y']) for a, b in pairs)
    return dict(observed_seconds=duration, decision_count=len(pairs),
        native_y_px=distribution(r['y'] for r in states),
        native_y_range_px=max((r['y'] for r in states), default=0) - min((r['y'] for r in states), default=0) if states else None,
        native_vy_px_s=distribution(r['vy'] for r in states), total_absolute_y_travel_px=travel,
        y_travel_px_per_s=travel / duration if duration else None,
        upward_travel_px=sum(max(0, a['y'] - b['y']) for a, b in pairs),
        downward_travel_px=sum(max(0, b['y'] - a['y']) for a, b in pairs),
        major_movement_by_threshold_px=major,
        binary_input_transition_count=sum(t in selected_ticks for t in transitions),
        binary_input_transitions_per_s=sum(t in selected_ticks for t in transitions) / duration if duration else None,
        cadence_change_count=sum(t in selected_ticks for t in cadence_changes),
        cadence_changes_per_s=sum(t in selected_ticks for t in cadence_changes) / duration if duration else None,
        cadence=cadence, sampled_clearance_px=distribution(p['minimum_clearance_px'] for p in samples),
        sampled_clearance_minimum=min(samples, key=lambda p: p['minimum_clearance_px']) if samples else None)



def timing_observations(native, trace, rows):
    """Descriptor clock arithmetic and saved poses only; no runtime invocation."""
    by_tick = {r['tick']: r for r in rows}
    speed = 150
    constant_speed = all(abs(r.get('vx', speed) - speed) < 1e-8 and
        abs(r['x'] - rows[0]['x'] - r['tick'] * speed / HZ) < 1e-6 for r in rows[:-1])
    observations = []
    for obstacle in native['obstacles']:
        kind = obstacle['mechanic_kind']
        if kind not in ('timed_armor_gate', 'laser_scanner'):
            continue
        left = min(obstacle['x'], obstacle['x'] + obstacle.get('motion', {}).get('dx_px', 0)) - 10
        right = max(obstacle['x'] + obstacle['collider']['w'], obstacle['x'] + obstacle.get('motion', {}).get('dx_px', 0)) + 10
        if kind == 'laser_scanner':
            beam_radius=obstacle['collider'].get('width', 0) / 2
            left=min(obstacle['x'], obstacle['x'] + obstacle['motion']['dx_px']) - 10 - beam_radius
            right=max(obstacle['x'], obstacle['x'] + obstacle['motion']['dx_px']) + 10 + beam_radius
        # Gate descriptor width is its actual stationary horizontal extent.
        if kind == 'timed_armor_gate':
            left, right = obstacle['x'] - 10, obstacle['x'] + obstacle['collider']['w'] + 10
        occupied = [r for r in rows if left <= r['x'] <= right]
        samples = []
        for frame in trace['bodyFrames']:
            row = by_tick[frame['tick']]
            if not left <= row['x'] <= right:
                continue
            bodies = [b for b in frame['bodies'] if b.get('sourceId', b['id']) == obstacle['id']]
            if bodies:
                samples.append(dict(tick=row['tick'], x=row['x'],
                    phases=sorted({b.get('phase', b.get('status', 'unknown')) for b in bodies}),
                    statuses=sorted({b.get('status', 'unknown') for b in bodies}),
                    any_lethal=any(b.get('lethal', False) for b in bodies)))
        nominal = None
        if kind == 'timed_armor_gate' and constant_speed:
            q=obstacle['timeline']; period=sum(q[k] for k in ('warning_s','opening_s','hold_s','closing_s','cooldown_s'))
            start_s, end_s = (left - rows[0]['x']) / speed, (right - rows[0]['x']) / speed
            cycle=math.floor(((start_s + end_s) / 2 - q['start_s']) / period)
            if cycle >= 0:
                open_start=q['start_s'] + cycle * period + q['warning_s'] + q['opening_s']
                close_start=open_start + q['hold_s']
                nominal=dict(occupancy_start_s=start_s, occupancy_end_s=end_s,
                    cycle=cycle, full_open_start_s=open_start, closing_start_s=close_start,
                    entry_after_full_open_s=start_s - open_start,
                    tail_before_closing_s=close_start - end_s,
                    minimum_full_open_edge_reserve_s=min(start_s - open_start, close_start - end_s),
                    scope='Descriptor-derived at verified150px/s, not measured early/late input tolerance or safety.')
        module = next((m for m in native['integration']['modules'] if obstacle['id'] in m['body_ids']), None)
        observations.append(dict(body_id=obstacle['id'], kind=kind,
            module_id=module['id'] if module else None, family=module['family'] if module else None,
            horizontal_radius_expanded_interval_px=[left,right],
            reached=bool(occupied), first_native_occupancy_tick=occupied[0]['tick'] if occupied else None,
            last_native_occupancy_tick=occupied[-1]['tick'] if occupied else None,
            horizontal_tail_reached_alive=any(r['x'] >= right and r['alive'] for r in rows),
            saved_phase_samples=samples, nominal_full_open_reserves=nominal))
    return observations


def timing_window_summary(observations, selected_ticks):
    ticks=set(selected_ticks)
    samples=[dict(body_id=o['body_id'], kind=o['kind'], **s) for o in observations for s in o['saved_phase_samples'] if s['tick'] in ticks]
    visits=[o for o in observations if o['first_native_occupancy_tick'] in ticks]
    reserves=[o['nominal_full_open_reserves']['minimum_full_open_edge_reserve_s'] for o in visits if o['nominal_full_open_reserves']]
    return dict(saved_phase_sample_count=len(samples),
        phase_sample_counts=dict(sorted(Counter(s['kind'] + ':' + '/'.join(s['phases']) for s in samples).items())),
        new_horizontal_occupancy_entries=len(visits),
        nominal_gate_min_full_open_edge_reserve_s=distribution(reserves),
        entry_body_ids=[o['body_id'] for o in visits],
        actual_early_late_input_tolerance_s=None, actual_correctable_spatial_margin_px=None,
        anticipation_or_choice_demand=None, subjective_mental_pressure=None)


def audit_run(run_dir):
    run_dir = Path(run_dir).resolve()
    evidence, reuse = resolve_evidence(run_dir)
    result = json.loads((evidence / 'result.json').read_text())
    map_bytes = (evidence / 'map.json').read_bytes()
    native = json.loads(map_bytes)
    trace_path = evidence / 'trace.json.gz'
    if sha(trace_path) != result['traceSHA256']:
        raise ValueError('Trace digest mismatch')
    # diagnostic writes JSON.stringify(map)+newline; verify its exact native hash.
    if hashlib.sha256(map_bytes.rstrip(b'\r\n')).hexdigest() != result['mapSHA256']:
        raise ValueError('Stored native map digest mismatch')
    trace = json.loads(gzip.decompress(trace_path.read_bytes()))
    inputs = json.loads((evidence / 'inputs.json').read_text())
    if not (trace['mapSHA256'] == inputs['mapSHA256'] == result['mapSHA256']):
        raise ValueError('Map bindings disagree')
    if trace['runtimeSHA256'] != result['runtimeSHA256'] or trace['horizonTicks'] != result['horizonTicks']:
        raise ValueError('Runtime/horizon bindings disagree')
    rows = trace_rows(trace)
    if rows[0]['tick'] != 0 or rows[-1]['tick'] != result['actualTicks']:
        raise ValueError('Native trace bounds disagree')
    flaps = trace['flapTicks']
    if flaps != inputs['flapTicks'] or len(flaps) != result['flapCount']:
        raise ValueError('Input records disagree')
    digest = hashlib.sha256(json.dumps(flaps, separators=(',', ':')).encode()).hexdigest()
    if digest != result['inputSHA256'] or digest != inputs['inputSHA256']:
        raise ValueError('Input digest mismatch')
    flap_set = set(flaps)
    if any(t < 0 or t >= rows[-1]['tick'] for t in flaps) or len(flap_set) != len(flaps):
        raise ValueError('Input tick outside decision window')
    if any(r['inputCausingRow'] != int(r['tick'] - 1 in flap_set) for r in rows[1:]):
        raise ValueError('Trace input-causing-row disagreement')
    saved_clearance = sampled_clearance(trace, rows, native)
    clearance = saved_clearance['series']
    timing = timing_observations(native, trace, rows)
    movements = {t: major_movements(rows, t) for t in SENSITIVITY_PX}
    transitions = [t for t in range(1, rows[-1]['tick']) if (t in flap_set) != (t - 1 in flap_set)]
    gaps = [b - a for a, b in zip(flaps, flaps[1:])]
    cadence_changes = [flaps[i + 2] for i in range(len(gaps) - 1) if abs(gaps[i + 1] - gaps[i]) > 2 * CADENCE_TOLERANCE_TICKS]
    def measure(ticks):
        ticks = list(ticks)
        metrics = selected_metrics(rows, ticks, flaps, clearance, movements, transitions, cadence_changes)
        timing_ticks = ticks + ([rows[-1]['tick']] if rows[-1]['tick'] - 1 in ticks else [])
        metrics['timing'] = timing_window_summary(timing, timing_ticks)
        return metrics
    decisions = rows[:-1]
    full = measure(r['tick'] for r in decisions)
    duration_ticks, duration_source = intended_duration_ticks(native)
    edges = [math.ceil(k * duration_ticks / 3) for k in range(4)]
    temporal = []
    for k, (start, end) in enumerate(zip(edges, edges[1:]), 1):
        metrics = measure(r['tick'] for r in decisions if start <= r['tick'] < end)
        planned = (end - start) / HZ
        complete = rows[-1]['tick'] >= end
        temporal.append(dict(stage=k, start_tick=start, end_tick=end, planned_seconds=planned,
            attained_fraction=metrics['observed_seconds'] / planned, complete=complete,
            censoring=None if complete else ('unreached-' if not metrics['decision_count'] else '') + result['outcome'], **metrics))
    initial_x = rows[0]['x']
    finish_x, finish_source = spatial_finish(native, initial_x)
    xedges = [initial_x + k * (finish_x - initial_x) / 3 for k in range(4)]
    max_x = max(r['x'] for r in rows)
    spatial = []
    for k, (start, end) in enumerate(zip(xedges, xedges[1:]), 1):
        metrics = measure(r['tick'] for r in decisions if start <= r['x'] < end)
        complete = max_x >= end
        spatial.append(dict(stage=k, start_x=start, end_x=end,
            attained_fraction=max(0, min(1, (max_x - start) / (end - start))), complete=complete,
            censoring=None if complete else ('unreached-' if not metrics['decision_count'] else '') + result['outcome'], **metrics))
    modules = []
    for module in native['integration']['modules']:
        metrics = measure(r['tick'] for r in decisions if module['start_x'] <= r['x'] < module['end_x'])
        modules.append(dict(id=module['id'], family=module['family'], variant=module['variant'], role=module['role'],
            start_x=module['start_x'], end_x=module['end_x'], active_start_x=module['active_start_x'], active_end_x=module['active_end_x'],
            active_reached=any(module['active_start_x'] <= r['x'] < module['active_end_x'] for r in rows),
            active_end_reached_alive=any(r['x'] >= module['active_end_x'] and r['alive'] for r in rows),
            entry_native_state=next(({k:r[k] for k in ('tick','x','y','vy','alive')} for r in rows if module['start_x'] <= r['x'] < module['end_x']), None),
            active_exit_native_state=next(({k:r[k] for k in ('tick','x','y','vy','alive')} for r in rows if r['x'] >= module['active_end_x']), None),
            source_map_sha256=module.get('source_map_sha256'), provider=module.get('provider'),
            body_ids=module['body_ids'], **metrics))
    by_tick = {r['tick']: r for r in rows}
    for run in full['cadence']['equal_cadence_runs']:
        run['start_x'] = by_tick[run['start_tick']]['x']
        run['end_x'] = by_tick[run['end_tick']]['x']
        run['native_y_range_px'] = max(r['y'] for r in rows[run['start_tick']:run['end_tick'] + 1]) - min(r['y'] for r in rows[run['start_tick']:run['end_tick'] + 1])
        run['module_sources'] = [dict(id=m['id'], family=m['family'], variant=m['variant'],
            overlap_seconds=sum(run['start_tick'] <= r['tick'] < run['end_tick'] and m['start_x'] <= r['x'] < m['end_x'] for r in decisions) / HZ)
            for m in modules if run['start_x'] < m['end_x'] and run['end_x'] >= m['start_x']]
    return dict(id=run_dir.name, native_result_id=result['id'], seed=native['seed'],
        theme=native['integration']['plan']['theme'], requested_difficulty=native['integration']['plan']['difficulty'],
        outcome=result['outcome'], death=result.get('death'), native_win=result['nativeWon'],
        intended_duration_ticks=duration_ticks, intended_duration_source=duration_source,
        horizon_ticks=result['horizonTicks'], actual_ticks=result['actualTicks'],
        spatial_finish_x=finish_x, spatial_finish_source=finish_source, rendering_width_px=native['width'],
        after_spatial_finish_observed_seconds=sum(r['x'] >= finish_x for r in decisions) / HZ,
        observed_x_nondecreasing=all(b['x'] >= a['x'] for a, b in zip(rows, rows[1:])),
        whole_trace=full, elapsed_time_stages=temporal, spatial_stages=spatial, modules=modules, timed_body_observations=timing,
        unsupported_lethal_shape_frame_count=saved_clearance['skipped_unsupported_lethal_shape_frame_count'],
        evidence=dict(requested_directory=str(run_dir.relative_to(REPO)), source_directory=str(evidence.relative_to(REPO)),
            reuse_chain=reuse, files_sha256={n: sha(evidence / n) for n in ('map.json', 'result.json', 'trace.json.gz', 'inputs.json')},
            runtime_sha256=result['runtimeSHA256'], controller_sha256=result['controllerSourceSHA256'], controller_mode=result['mode'],
            new_physics_runs=0))


def summary_by_group(maps):
    groups = {}
    for row in maps:
        key = str(Path(row['evidence']['requested_directory']).parent) + '/' + row['id'].split('-')[0]
        groups.setdefault(key, []).append(row)
    output = {}
    for key, group in sorted(groups.items()):
        stages = []
        for i in range(3):
            all_stages = [r['elapsed_time_stages'][i] for r in group]
            complete = [s for s in all_stages if s['complete']]
            stages.append(dict(stage=i + 1, map_count=len(group), attained_count=sum(s['observed_seconds'] > 0 for s in all_stages),
                complete_count=len(complete), attained_fraction=distribution(s['attained_fraction'] for s in all_stages),
                complete_only_flaps_per_s=distribution(s['cadence']['flaps_per_s'] for s in complete),
                complete_only_y_travel_px_per_s=distribution(s['y_travel_px_per_s'] for s in complete),
                complete_only_major_reversals_per_s=distribution(s['major_movement_by_threshold_px']['60']['reversals_per_s'] for s in complete),
                complete_only_sampled_clearance_median_px=distribution(s['sampled_clearance_px']['median'] for s in complete if s['sampled_clearance_px']['median'] is not None)))
        output[key] = dict(map_count=len(group), elapsed_stages=stages,
            longest_equal_cadence_seconds=distribution((r['whole_trace']['cadence']['longest_equal_cadence_run'] or {}).get('duration_s', 0) for r in group),
            equal_cadence_observed_time_share=distribution(r['whole_trace']['cadence']['equal_cadence_observed_time_share'] for r in group))
    return output


def fmt(value):
    return '—' if value is None else f'{value:.3f}'


def report(audit):
    lines = ['# Native three-stage movement, space and cadence audit', '',
             'Read-only saved evidence. No physics executions, composite pressure score, difficulty/fun claim, pass threshold, or safety range.', '']
    lines.extend(f'- **{key}**: {value}' for key, value in DEFINITIONS.items())
    lines += ['', '## Group summaries', '', 'These stage medians use complete stages only; counts expose death/horizon censoring. They are not a paired causal estimate.', '',
              '| Group | Stage | Attained / complete / all | Flaps/s | Y travel px/s | Major reversals/s | Sampled clearance median px |',
              '|---|---:|---:|---:|---:|---:|---:|']
    for group, s in audit['group_summaries'].items():
        for stage in s['elapsed_stages']:
            lines.append(f"| {group} | {stage['stage']} | {stage['attained_count']} / {stage['complete_count']} / {stage['map_count']} | {fmt(stage['complete_only_flaps_per_s']['median'])} | {fmt(stage['complete_only_y_travel_px_per_s']['median'])} | {fmt(stage['complete_only_major_reversals_per_s']['median'])} | {fmt(stage['complete_only_sampled_clearance_median_px']['median'])} |")
    for row in audit['maps']:
        whole = row['whole_trace']; cadence = whole['cadence']; longest = cadence['longest_equal_cadence_run']
        lines += ['', '## ' + row['id'], '',
            f"{row['outcome']}; observed {whole['observed_seconds']:.3f}s / intended {row['intended_duration_ticks']/HZ:.3f}s; horizon {row['horizon_ticks']/HZ:.3f}s. Spatial finish {row['spatial_finish_x']:.2f}px ({row['spatial_finish_source']}); rendering width {row['rendering_width_px']:.2f}px; time after spatial finish {row['after_spatial_finish_observed_seconds']:.3f}s.",
            f"Equal-cadence union {cadence['equal_cadence_union_seconds']:.3f}s ({cadence['equal_cadence_observed_time_share']:.1%} of observed duration). Longest {longest['duration_s']:.3f}s, {longest['start_tick']/HZ:.3f}–{longest['end_tick']/HZ:.3f}s, {longest['interval_count']} intervals, {longest['minimum_gap_ticks']}–{longest['maximum_gap_ticks']}ticks." if longest else 'No run of≥3near-equal interflap intervals.', '',
            '| Elapsed stage | Observed/planned s | Coverage | Major60 excursions/reversals | Reversals/s | Flaps/s | Cadence changes/s | Y travel px/s | Clearance min/p10/median/p90 px |',
            '|---:|---:|---:|---:|---:|---:|---:|---:|---:|']
        for s in row['elapsed_time_stages']:
            mv=s['major_movement_by_threshold_px']['60'];c=s['sampled_clearance_px']
            lines.append(f"| {s['stage']} | {s['observed_seconds']:.3f}/{s['planned_seconds']:.3f} | {s['attained_fraction']:.1%} {'complete' if s['complete'] else s['censoring']} | {mv['confirmed_excursions']}/{mv['reversals']} | {fmt(mv['reversals_per_s'])} | {fmt(s['cadence']['flaps_per_s'])} | {fmt(s['cadence_changes_per_s'])} | {fmt(s['y_travel_px_per_s'])} | {' / '.join(fmt(c[k]) for k in ('minimum','p10','median','p90'))} |")
        lines += ['', '| Elapsed stage | Gate/laser occupancy entries | Saved phase counts | Nominal gate full-open minimum edge reserve median s |', '|---:|---:|---|---:|']
        for st in row['elapsed_time_stages']:
            tm=st['timing']
            lines.append(f"| {st['stage']} | {tm['new_horizontal_occupancy_entries']} | {tm['phase_sample_counts']} | {fmt(tm['nominal_gate_min_full_open_edge_reserve_s']['median'])} |")
        lines.append('Input timing tolerance, correctable spatial margin, anticipation/choice demand and subjective pressure: UNKNOWN.')
        if longest:
            lines.append('\nLongest-run sources: ' + '; '.join(f"{m['id']} {m['family']} {m['variant']} ({m['overlap_seconds']:.3f}s overlap)" for m in longest['module_sources']))
        lines += ['', 'Top module-local equal-cadence sources (module slicing may split a cross-module run):']
        ranked = sorted(row['modules'], key=lambda m: (m['cadence']['longest_equal_cadence_run'] or {}).get('duration_s', 0), reverse=True)
        for m in ranked[:5]:
            r=m['cadence']['longest_equal_cadence_run']
            if r:
                lines.append(f"- {m['id']} {m['family']}/{m['variant']}: longest {r['duration_s']:.3f}s at {r['start_tick']/HZ:.3f}–{r['end_tick']/HZ:.3f}s; total equal {m['cadence']['equal_cadence_union_seconds']:.3f}s / observed {m['observed_seconds']:.3f}s; major60 reversals {m['major_movement_by_threshold_px']['60']['reversals']}; active-end alive {m['active_end_reached_alive']}")
        lines.append('\nEvidence: `' + row['evidence']['source_directory'] + '`; exact file/runtime/controller digests in JSON.')
    return '\n'.join(lines) + '\n'


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('runs', nargs='+', type=Path)
    parser.add_argument('--out', required=True, type=Path)
    parser.add_argument('--report', type=Path)
    args=parser.parse_args(argv)
    for path in (args.out, args.report):
        if path and path.exists():
            parser.error('Refusing to replace existing output: ' + str(path))
    maps=[audit_run(p) for p in args.runs]
    audit=dict(schema=SCHEMA, definitions=DEFINITIONS,
        frozen_constants=dict(hz=HZ, major_excursion_px=MAJOR_EXCURSION_PX, sensitivity_px=SENSITIVITY_PX,
            cadence_tolerance_ticks=CADENCE_TOLERANCE_TICKS, cadence_min_intervals=CADENCE_MIN_INTERVALS),
        evaluator_source_sha256={name: sha(HERE / name) for name in ('audit_stage_pressure.py','audit_action_quality.py','analyze_results.py')},
        new_physics_runs=0, group_summaries=summary_by_group(maps), maps=maps)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    with args.out.open('x') as stream:
        json.dump(audit, stream, indent=2, ensure_ascii=False, allow_nan=False);stream.write('\n')
    if args.report:
        with args.report.open('x') as stream: stream.write(report(audit))
    print(json.dumps(dict(audit=str(args.out), report=str(args.report) if args.report else None, maps=len(maps), new_physics_runs=0)))


if __name__ == '__main__':
    main()
