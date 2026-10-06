#!/usr/bin/env python3
"""Read existing authored maps and native traces; never generate or run physics.

Usage: python integration/audit_action_quality.py PANEL [PANEL ...] --out NEW.json
Optional --report NEW.md creates a concise human-readable companion. All input
files are read-only; outputs must be new. No score, pass threshold, difficulty
calibration, human-action classification, or fun inference is made.
"""
from __future__ import annotations

import argparse
import ast
from collections import Counter, defaultdict
import gzip
import hashlib
import json
from pathlib import Path
import statistics

from analyze_results import body_distance

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
HZ = 120
NOMINAL_SPEED = 150
SCHEMA = 'authored-and-observed-action-audit/1'
LIMITS = [
    'Authored family, theme and verb coverage is metadata, not performed-action coverage.',
    'A constant guide target is author intent, not constant actual y or absence of player actions; spring policies may override it.',
    'Native y ranges use stored end-of-tick states, not substep extrema or clearance guarantees.',
    'Clearance curves use stored bodyFrames every 12 ticks (0.1 s), plus the terminal frame; unsupported shapes are skipped and disclosed. They are not continuous safety bounds or calibrated pressure.',
    'Flaps are the frozen author-informed controller decisions, not observed human actions.',
    'Reached x thresholds and nonlethal bounce contacts are observations, not whole-module safety proofs.',
    'Deaths and the fixed horizon censor later actions; unreachable-in-this-trace is not impossible.',
    'No composite score, changed acceptance threshold, new physics, or fun/difficulty claim.',
]


def read_json(path):
    return json.loads(Path(path).read_text())


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def literal_assignment(path, name):
    """Read a source constant without importing or executing generator code."""
    for node in ast.parse(Path(path).read_text()).body:
        if isinstance(node, ast.Assign) and any(
                isinstance(t, ast.Name) and t.id == name for t in node.targets):
            return ast.literal_eval(node.value)
    raise ValueError(f'{name} literal not found in {path}')


def catalog_for(panel, manifest):
    expected = manifest['sources']['generator.py']
    candidates = [panel / 'source-snapshot/generator.py', HERE / 'generator.py']
    candidates.extend(sorted(panel.parent.glob('B*/source-snapshot/generator*.py')))
    for candidate in candidates:
        if candidate.is_file() and sha(candidate) == expected:
            return literal_assignment(candidate, 'CATALOG'), {
                'path': str(candidate.relative_to(REPO)), 'sha256': expected,
                'read_without_execution': True,
            }
    raise ValueError(f'No hash-matched generator catalog for {panel}/{manifest["arm"]}')


def stats(values):
    values = list(values)
    if not values:
        return {'count': 0, 'minimum': None, 'median': None, 'maximum': None}
    return {'count': len(values), 'minimum': min(values),
            'median': statistics.median(values), 'maximum': max(values)}


def y_summary(rows):
    if not rows:
        return {'sample_count': 0, 'minimum_y': None, 'maximum_y': None,
                'range_px': None, 'total_absolute_tick_y_change_px': None, 'upward_tick_travel_px': None, 'downward_tick_travel_px': None}
    ys = [r['y'] for r in rows]
    return {'sample_count': len(rows), 'minimum_y': min(ys), 'maximum_y': max(ys),
            'range_px': max(ys) - min(ys),
            'total_absolute_tick_y_change_px': sum(abs(b - a) for a, b in zip(ys, ys[1:])),
            'upward_tick_travel_px': sum(max(0, a - b) for a, b in zip(ys, ys[1:])),
            'downward_tick_travel_px': sum(max(0, b - a) for a, b in zip(ys, ys[1:]))}


def flap_summary(ticks, observed_seconds):
    gaps = [b - a for a, b in zip(ticks, ticks[1:])]
    return {'count': len(ticks), 'observed_seconds': observed_seconds,
            'flaps_per_observed_second': len(ticks) / observed_seconds if observed_seconds else None,
            'inter_flap_ticks': stats(gaps),
            'inter_flap_seconds': stats(g / HZ for g in gaps),
            'scope': 'Within-window intervals only; pre-first and post-last intervals are censored.'}


def constant_guide_spans(guide):
    """Merge adjacent identical constant aims, even across policy/module edges.

    This is a geometric authored-intent measurement. Ramps split the run; a gap
    also splits it. Keep policies and module ids so a target merge cannot hide
    the controller's different response (notably optional spring acquisition).
    """
    spans = []
    for index, row in enumerate(guide):
        a, b = row['x'], row['until_x']
        if b <= a:
            raise ValueError('Guide spans must have positive length')
        if index and a < guide[index - 1]['until_x']:
            raise ValueError('Guide spans overlap or are not ordered')
        target = row['target_y']
        if row.get('target_y_end', target) != target:
            continue
        policy = row.get('policy', 'feedback')
        if spans and spans[-1]['until_x'] == a and spans[-1]['target_y'] == target:
            span = spans[-1]
            span['until_x'] = b
            span['guide_rows'].append(index)
            span['module_ids'] = sorted(set(span['module_ids'] + [row.get('module_id')]), key=str)
            span['policies'] = sorted(set(span['policies'] + [policy]))
        else:
            spans.append({'x': a, 'until_x': b, 'target_y': target,
                          'guide_rows': [index], 'module_ids': [row.get('module_id')],
                          'policies': [policy]})
    for span in spans:
        span['length_px'] = span['until_x'] - span['x']
        span['nominal_seconds_at_150_px_s'] = span['length_px'] / NOMINAL_SPEED
    return sorted(spans, key=lambda s: (-s['length_px'], s['x']))


def trace_rows(trace):
    schema = trace['rowSchema']
    for required in ('tick', 'x', 'y', 'vy', 'alive'):
        if required not in schema:
            raise ValueError('Trace lacks ' + required)
    rows = [dict(zip(schema, row, strict=True)) for row in trace['rows']]
    if not rows:
        raise ValueError('Empty native trace')
    if any(b['tick'] != a['tick'] + 1 for a, b in zip(rows, rows[1:])):
        raise ValueError('Native trace has missing or unordered ticks')
    return rows


def first_reach(rows, x):
    return next((r for r in rows if r['x'] >= x), None)


def brief_state(row):
    return {k: row[k] for k in ('tick', 'x', 'y', 'vy', 'alive')} if row else None


def sampled_clearance(trace, rows, native):
    """Use saved native body poses only, without reconstructing or running physics."""
    by_tick = {r['tick']: r for r in rows}
    skipped = Counter()
    series = []
    for frame in trace['bodyFrames']:
        row = by_tick.get(frame['tick'])
        if row is None:
            raise ValueError('Body frame lacks corresponding native state')
        choices = [(row['y'] - 10, 'ceiling-boundary', 'world-boundary'),
                   (native['height'] - 10 - row['y'], 'floor-boundary', 'world-boundary')]
        for body in frame['bodies']:
            if not body.get('lethal'):
                continue
            distance = body_distance(row['x'], row['y'], body)
            if distance is None:
                skipped[body.get('shape', '<missing>')] += 1
                continue
            choices.append((distance, body['id'], body.get('kind')))
        clearance, nearest, kind = min(choices, key=lambda item: (item[0], item[1]))
        module = next((m for m in native['integration']['modules']
                       if m['start_x'] <= row['x'] < m['end_x']), None)
        series.append({'tick': row['tick'], 'time_s': row['tick'] / HZ,
                       'x': row['x'], 'y': row['y'], 'vy': row['vy'],
                       'alive': row['alive'], 'module_id': module['id'] if module else None,
                       'minimum_clearance_px': clearance, 'nearest_body_id': nearest,
                       'nearest_mechanic': kind})
    return {'sampling': 'Stored native bodyFrames: every 12 ticks (0.1 s) plus terminal frame; no interpolation and no rerun.',
            'distance_model': 'analyze_results.body_distance; radius 10 px; lethal bodies plus ceiling/floor boundaries.',
            'scope': 'Sampled current-geometry clearance only, not substep/continuous minimum, safe range, or human pressure calibration.',
            'skipped_unsupported_lethal_shape_frame_count': dict(sorted(skipped.items())),
            'minimum_sample': min(series, key=lambda item: item['minimum_clearance_px']) if series else None,
            'series': series}


def module_metrics(module, rows, flap_ticks, events):
    start, end = module['start_x'], module['end_x']
    observed = [r for r in rows if start <= r['x'] < end]
    active = [r for r in rows if module['active_start_x'] <= r['x'] < module['active_end_x']]
    # A decision at tick t causes the row at t+1; assign it to its pre-action x.
    decision_rows = [r for r in observed if r['tick'] < rows[-1]['tick']]
    decisions = {r['tick'] for r in decision_rows}
    flaps = [t for t in flap_ticks if t in decisions]
    bodies = set(module['body_ids'])
    related_events = [e for e in events if e.get('sourceId', e.get('id')) in bodies]
    return {
        'id': module['id'], 'family': module['family'], 'variant': module['variant'],
        'role': module['role'], 'authored_verbs': module['action'],
        'start_x': start, 'active_start_x': module['active_start_x'], 'active_end_x': end,
        'preparation_reached': bool(observed), 'active_geometry_reached': bool(active),
        'active_end_reached': brief_state(first_reach(rows, module['active_end_x'])),
        'entry_state': brief_state(observed[0]) if observed else None,
        'last_in_module_state': brief_state(observed[-1]) if observed else None,
        'all_module_y': y_summary(observed), 'active_geometry_y': y_summary(active),
        'flaps': flap_summary(flaps, len(decision_rows) / HZ),
        'bounce_contacts': [e for e in related_events if e['type'] == 'bounce'],
        'death_events': [e for e in related_events if e['type'] == 'death'],
        'observation_scope': 'Preparation included in all_module_y; active_geometry_y excludes incoming seam reserve. Unreached modules retain null ranges.',
        'resolved_provider_spec': module.get('source_metadata', {}).get('resolved_spec'),
    }


def authored_metrics(native, catalog):
    integration = native['integration']
    modules = integration['modules']
    plan = integration['plan']
    verbs = sorted({v for m in modules for v in m['action']})
    requested = plan['requested_actions']
    order = [m['family'] for m in modules]
    themes = {family: catalog[family]['themes'] for family in sorted(set(order))}
    grammar = plan.get('grammar') or {}
    declared_order = grammar.get('actual_family_order')
    if declared_order is not None and declared_order != order:
        raise ValueError('Grammar metadata order disagrees with actual emitted modules')
    spans = constant_guide_spans(integration['guide'])
    return {
        'family_order': order, 'variants': [m['variant'] for m in modules],
        'roles': [m['role'] for m in modules], 'final_role': modules[-1]['role'],
        'theme': plan['theme'], 'requested_actions': requested,
        'authored_verbs': verbs, 'derived_authored_action_sequence': [v for m in modules for v in m['action']], 'covered_requested_verbs': sorted(set(verbs) & set(requested)),
        'uncovered_requested_verbs': sorted(set(requested) - set(verbs)),
        'theme_family_memberships': themes,
        'theme_matching_distinct_families': sorted(f for f, ts in themes.items() if plan['theme'] in ts),
        'theme_matching_module_count': sum(plan['theme'] in catalog[m['family']]['themes'] for m in modules),
        'outline': grammar.get('outline'), 'outline_slots': grammar.get('slots', []),
        'unconsumed_outline_slots': grammar.get('slots', [])[len(modules):],
        'guide_scope': 'Targets are authored intentions, not actual actions. Duration uses nominal 150 px/s, not observed dwell.',
        'longest_constant_guide_span': spans[0] if spans else None,
        'constant_guide_spans': spans,
    }


def resolve_evidence(run_dir):
    """Verify immutable reuse edges, including cycles and altered source files."""
    chain, seen = [], set()
    current = run_dir.resolve()
    while (current / 'REUSED.json').exists():
        if current in seen:
            raise ValueError('Reuse cycle')
        seen.add(current)
        marker = current / 'REUSED.json'
        reuse = read_json(marker)
        source = (REPO / reuse['sourceDir']).resolve()
        source.relative_to(REPO)
        for name in ('map.json', 'result.json', 'trace.json.gz', 'inputs.json'):
            if reuse['sourceFiles'].get(name) != sha(source / name):
                raise ValueError(f'Reused evidence hash mismatch: {source / name}')
        chain.append({'path': str(marker.relative_to(REPO)), 'sha256': sha(marker)})
        current = source
    return current, chain


def audit_entry(panel, manifest, entry, catalog):
    map_path = panel / entry['mapFile']
    if sha(map_path) != entry['mapFileSHA256']:
        raise ValueError(f'Preregistered map hash mismatch: {map_path}')
    native = read_json(map_path)
    evidence, reuse = resolve_evidence(panel / 'runs' / entry['id'])
    result = read_json(evidence / 'result.json')
    stored_map = read_json(evidence / 'map.json')
    if stored_map != native:
        raise ValueError('Run map differs from preregistered map')
    trace_path = evidence / result['traceFile']
    if sha(trace_path) != result['traceSHA256']:
        raise ValueError('Native trace hash mismatch')
    trace = json.loads(gzip.decompress(trace_path.read_bytes()))
    inputs = read_json(evidence / result['inputFile'])
    if not (trace['mapSHA256'] == result['mapSHA256'] == inputs['mapSHA256']):
        raise ValueError('Native map hash bindings disagree')
    if not (trace['runtimeSHA256'] == result['runtimeSHA256'] == manifest['sources']['vendor/flappy-runtime.js']):
        raise ValueError('Runtime hash bindings disagree')
    if result['controllerSourceSHA256'] != manifest['sources']['diagnostic.cjs']:
        raise ValueError('Controller source hash differs from manifest')
    if result['horizonTicks'] != entry['horizonTicks'] or trace['horizonTicks'] != entry['horizonTicks']:
        raise ValueError('Observation horizon mismatch')
    if trace['flapTicks'] != inputs['flapTicks'] or result['flapCount'] != len(trace['flapTicks']):
        raise ValueError('Flap input records disagree')
    if hashlib.sha256(json.dumps(trace['flapTicks'], separators=(',', ':')).encode()).hexdigest() != result['inputSHA256']:
        raise ValueError('Flap input hash mismatch')
    rows = trace_rows(trace)
    if rows[-1]['tick'] != result['actualTicks']:
        raise ValueError('Trace length differs from actual ticks')
    modules = [module_metrics(m, rows, trace['flapTicks'], trace['events']) for m in native['integration']['modules']]
    authored = authored_metrics(native, catalog)
    clearance = sampled_clearance(trace, rows, native)
    for module in modules:
        samples = [p for p in clearance['series'] if p['module_id'] == module['id']]
        module['sampled_clearance_px'] = stats(p['minimum_clearance_px'] for p in samples)
    seams = []
    for seam in native['integration']['seams']:
        seams.append({**{k: seam[k] for k in ('from', 'to', 'from_family', 'to_family', 'x', 'next_active_x')},
                      'seam_reached': brief_state(first_reach(rows, seam['x'])),
                      'next_active_reached': brief_state(first_reach(rows, seam['next_active_x']))})
    longest = authored['longest_constant_guide_span']
    if longest:
        observed = [r for r in rows if longest['x'] <= r['x'] < longest['until_x']]
        ticks = {r['tick'] for r in observed if r['tick'] < rows[-1]['tick']}
        longest['observed_y'] = y_summary(observed)
        longest['observed_flaps'] = flap_summary([t for t in trace['flapTicks'] if t in ticks], len(ticks) / HZ)
    return {
        'id': entry['id'], 'arm': entry['arm'], 'seed': entry['seed'], 'request': entry['request'],
        'revision': entry['revision'], 'authored': authored,
        'observed': {
            'outcome': result['outcome'], 'alive_at_horizon': result['survivedHorizon'],
            'native_win': result['nativeWon'], 'observed_seconds': result['actualTicks'] / HZ,
            'horizon_seconds': result['horizonTicks'] / HZ, 'y': y_summary(rows),
            'sampled_clearance': clearance,
            'flaps': flap_summary(trace['flapTicks'], (rows[-1]['tick'] - rows[0]['tick']) / HZ),
            'modules': modules, 'seams': seams,
            'seams_reached': sum(s['seam_reached'] is not None for s in seams),
            'next_active_thresholds_reached': sum(s['next_active_reached'] is not None for s in seams),
            'bounce_contacts': [e for e in trace['events'] if e['type'] == 'bounce'],
            'controller_spring_branches': result.get('controllerStats', {}).get('branches', {}),
            'death': result['death'],
            'requested_verbs_attached_to_reached_active_modules': sorted(set(authored['requested_actions']) & {v for m in modules if m['active_geometry_reached'] for v in m['authored_verbs']}),
            'requested_verbs_only_in_unreached_active_modules': sorted(set(authored['requested_actions']) - {v for m in modules if m['active_geometry_reached'] for v in m['authored_verbs']}),
            'requested_verbs_attached_to_active_end_alive_modules': sorted(set(authored['requested_actions']) & {v for m in modules if m['active_end_reached'] and m['active_end_reached']['alive'] for v in m['authored_verbs']}),
            'derived_reached_module_action_sequence': [v for m in modules if m['active_geometry_reached'] for v in m['authored_verbs']],
            'measured_verb_coverage': None,
            'measured_verb_coverage_scope': 'Not inferred from metadata or y range: read/choose/retain/catch intent is not itself a measured action.',
        },
        'evidence': {
            'preregistered_map': str(map_path.relative_to(REPO)), 'preregistered_map_sha256': sha(map_path),
            'source_directory': str(evidence.relative_to(REPO)), 'reuse_chain': reuse,
            'source_files_sha256': {n: sha(evidence / n) for n in ('map.json', 'result.json', 'trace.json.gz', 'inputs.json')},
            'native_map_sha256': result['mapSHA256'], 'runtime_sha256': result['runtimeSHA256'],
            'controller_source_sha256': result['controllerSourceSHA256'], 'controller_mode': result['mode'],
            'new_physics_runs_by_this_audit': 0,
        },
    }


def summarize_arm(rows):
    families = sorted({f for row in rows for f in row['authored']['family_order']})
    family_summary = {}
    for family in families:
        modules = [m for r in rows for m in r['observed']['modules'] if m['family'] == family]
        reached = [m for m in modules if m['active_geometry_reached']]
        completed = [m for m in reached if m['active_end_reached'] and m['active_end_reached']['alive']]
        family_summary[family] = {
            'authored_modules': len(modules), 'active_geometry_reached_modules': len(reached),
            'active_end_reached_alive_modules': len(completed),
            'partially_observed_modules': len(reached) - len(completed),
            'unreached_active_modules': len(modules) - len(reached),
            'y_range_px_all_reached': stats(m['active_geometry_y']['range_px'] for m in reached),
            'y_range_px_active_end_reached_alive': stats(m['active_geometry_y']['range_px'] for m in completed),
            'bounce_contact_count': sum(len(m['bounce_contacts']) for m in modules),
        }
    spec_values = defaultdict(lambda: defaultdict(set))
    for row in rows:
        for module in row['observed']['modules']:
            for key, value in (module['resolved_provider_spec'] or {}).items():
                if key != 'schema':
                    spec_values[module['family']][key].add(json.dumps(value, sort_keys=True))
    return {
        'map_count': len(rows), 'unique_authored_orders': len({tuple(r['authored']['family_order']) for r in rows}),
        'authored_order_counts': [{'order': list(order), 'count': count} for order, count in sorted(Counter(tuple(r['authored']['family_order']) for r in rows).items())],
        'authored_families': families,
        'authored_verbs': sorted({v for r in rows for v in r['authored']['authored_verbs']}),
        'maps_covering_all_requested_verbs_in_metadata': sum(not r['authored']['uncovered_requested_verbs'] for r in rows),
        'maps_with_all_requested_verbs_attached_to_reached_modules': sum(not r['observed']['requested_verbs_only_in_unreached_active_modules'] for r in rows),
        'sequence_similarity_by_theme': sequence_similarity_by_theme(rows),
        'requested_verb_coverage_by_theme': {
            theme: {'maps': len(group), 'fully_covered_in_metadata': sum(not r['authored']['uncovered_requested_verbs'] for r in group),
                    'theme_matching_distinct_family_count': stats(len(r['authored']['theme_matching_distinct_families']) for r in group)}
            for theme in sorted({r['authored']['theme'] for r in rows})
            for group in [[r for r in rows if r['authored']['theme'] == theme]]},
        'final_role_counts': dict(sorted(Counter(r['authored']['final_role'] for r in rows).items())),
        'maps_with_resolve_role': sum('resolve' in r['authored']['roles'] for r in rows),
        'maps_with_unconsumed_resolve_slot': sum(any(s['role'] == 'resolve' for s in r['authored']['unconsumed_outline_slots']) for r in rows),
        'longest_constant_guide_px_per_map': stats(r['authored']['longest_constant_guide_span']['length_px'] for r in rows if r['authored']['longest_constant_guide_span']),
        'alive_at_horizon': sum(r['observed']['alive_at_horizon'] for r in rows),
        'native_wins': sum(r['observed']['native_win'] for r in rows),
        'observed_seconds': stats(r['observed']['observed_seconds'] for r in rows),
        'native_flap_rates_per_observed_second': stats(r['observed']['flaps']['flaps_per_observed_second'] for r in rows),
        'native_inter_flap_median_ticks_per_map': stats(r['observed']['flaps']['inter_flap_ticks']['median'] for r in rows if r['observed']['flaps']['inter_flap_ticks']['median'] is not None),
        'native_y_range_px_per_map': stats(r['observed']['y']['range_px'] for r in rows),
        'seams_reached': sum(r['observed']['seams_reached'] for r in rows),
        'seams_authored': sum(len(r['observed']['seams']) for r in rows),
        'family_observations': family_summary,
        'observed_provider_spec_values': {f: {k: [json.loads(v) for v in sorted(vs)] for k, vs in sorted(fields.items())} for f, fields in sorted(spec_values.items())},
        'actual_new_runs_in_original_panel': sum(not r['evidence']['reuse_chain'] for r in rows),
        'new_physics_runs_by_this_audit': 0,
    }


def normalized_sequence_similarity(left, right):
    """Unit-cost token Levenshtein similarity, not a quality score."""
    previous = list(range(len(right) + 1))
    for i, a in enumerate(left, 1):
        current = [i]
        for j, b in enumerate(right, 1):
            current.append(min(current[-1] + 1, previous[j] + 1,
                               previous[j - 1] + (a != b)))
        previous = current
    length = max(len(left), len(right))
    return 1.0 - previous[-1] / length if length else 1.0


def sequence_similarity_by_theme(rows):
    output = {}
    for theme in sorted({r['authored']['theme'] for r in rows}):
        group = [r for r in rows if r['authored']['theme'] == theme]
        pairs = []
        for i, left in enumerate(group):
            for right in group[i + 1:]:
                pair = {'left': left['id'], 'right': right['id']}
                for label, get_sequence in (
                    ('family_order', lambda r: r['authored']['family_order']),
                    ('requested_action_sequence', lambda r: r['authored']['requested_actions']),
                    ('derived_authored_action_sequence', lambda r: [v for m in r['observed']['modules'] for v in m['authored_verbs']]),
                    ('derived_reached_module_action_sequence', lambda r: [v for m in r['observed']['modules'] if m['active_geometry_reached'] for v in m['authored_verbs']]),
                ):
                    pair[label] = normalized_sequence_similarity(get_sequence(left), get_sequence(right))
                pairs.append(pair)
        labels = ('family_order', 'requested_action_sequence', 'derived_authored_action_sequence', 'derived_reached_module_action_sequence')
        output[theme] = {'map_count': len(group), 'pair_count': len(pairs),
                         'pairs': pairs, 'summaries': {label: stats(p[label] for p in pairs) for label in labels},
                         'formula': '1 - unit-cost token Levenshtein distance / max(sequence lengths); two empty sequences = 1; no threshold or ranking.',
                         'action_sequence_definition': 'Concatenate each module.action list in actual emitted order, retaining duplicates. Reached version includes modules whose active x interval has a native trace sample; this does not show that every authored action was performed.',
                         'request_scope': 'Requested sequences repeat within a theme by panel design; similarity 1 is a request-control check, not a generation-quality result.'}
    return output


def compare_pairs(rows):
    by_arm = {arm: {r['seed']: r for r in rows if r['arm'] == arm} for arm in ('baseline', 'candidate')}
    pairs = []
    for seed in sorted(set(by_arm['baseline']) & set(by_arm['candidate'])):
        before, after = (by_arm[a][seed] for a in ('baseline', 'candidate'))
        comparable = before['request'] == after['request'] and all(
            before['evidence'][k] == after['evidence'][k] for k in ('runtime_sha256', 'controller_source_sha256', 'controller_mode')) and before['observed']['horizon_seconds'] == after['observed']['horizon_seconds']
        pairs.append({'seed': seed, 'nominal_request_controller_runtime_horizon_match': comparable,
                      'before_id': before['id'], 'after_id': after['id'],
                      'authored_order_changed': before['authored']['family_order'] != after['authored']['family_order'],
                      'before_after_family_order_similarity': normalized_sequence_similarity(before['authored']['family_order'], after['authored']['family_order']),
                      'before_after_alive_at_horizon': [r['observed']['alive_at_horizon'] for r in (before, after)],
                      'before_after_observed_seconds': [r['observed']['observed_seconds'] for r in (before, after)],
                      'before_after_guide_max_px': [r['authored']['longest_constant_guide_span']['length_px'] for r in (before, after)],
                      'scope': 'Same nominal requests, changed maps; differing death censoring prevents treating full-trace cadence/range differences as causal action improvements.'})
    return pairs


def audit_panel(panel):
    panel = Path(panel).resolve()
    rows, sources = [], {}
    for arm in ('baseline', 'candidate', 'holdout'):
        manifest_path = panel / f'{arm}-manifest.json'
        manifest = read_json(manifest_path)
        catalog, source = catalog_for(panel, manifest)
        sources[arm] = {'manifest_sha256': sha(manifest_path), 'catalog': source}
        rows.extend(audit_entry(panel, manifest, entry, catalog) for entry in manifest['entries'])
    return {'panel': str(panel.relative_to(REPO)), 'sources': sources,
            'arms': {arm: summarize_arm([r for r in rows if r['arm'] == arm]) for arm in ('baseline', 'candidate', 'holdout')},
            'paired_comparison': compare_pairs(rows), 'maps': rows}


def render_report(audit):
    lines = ['# Authored intent and observed action audit', '',
             'Read-only analysis of existing maps and native traces. No physics was executed.', '']
    lines.extend('- ' + limitation for limitation in LIMITS)
    lines += ['', 'Sequence similarity = 1 − token Levenshtein distance / max(lengths), with unit insertion/deletion/substitution costs; both empty = 1. Action sequences concatenate module.action tokens, preserving duplicates. Similarity describes repetition, not quality.', '']
    for panel in audit['panels']:
        lines += ['', '## ' + panel['panel'], '']
        for arm, summary in panel['arms'].items():
            lines += [f'### {arm}', '',
                      f"{summary['map_count']} maps; {summary['unique_authored_orders']} distinct authored orders; "
                      f"requested verbs represented in metadata in {summary['maps_covering_all_requested_verbs_in_metadata']}/{summary['map_count']}. "
                      f"Alive at horizon: {summary['alive_at_horizon']}; native wins: {summary['native_wins']}.",
                      f"All requested verbs attached to reached active modules: {summary['maps_with_all_requested_verbs_attached_to_reached_modules']}/{summary['map_count']} (still not verified performed actions). Reached seams: {summary['seams_reached']}/{summary['seams_authored']}. "
                      f"Median observed duration: {summary['observed_seconds']['median']:.3f} s (death/horizon censored).",
                      f"Longest constant target per map, median/max: {summary['longest_constant_guide_px_per_map']['median']:.1f}/"
                      f"{summary['longest_constant_guide_px_per_map']['maximum']:.1f} px. This is guide intent only.",
                      f"Native flap-rate median: {summary['native_flap_rates_per_observed_second']['median']:.3f}/s; "
                      f"per-map median inter-flap interval median: {summary['native_inter_flap_median_ticks_per_map']['median']:.1f} ticks; "
                      f"native y-range median: {summary['native_y_range_px_per_map']['median']:.1f} px. Full traces have unequal observed durations.",
                      f"Final roles: {summary['final_role_counts']}; maps with resolve: {summary['maps_with_resolve_role']}; "
                      f"unconsumed resolve outline slot: {summary['maps_with_unconsumed_resolve_slot']}.", '']
            for theme, similarity in summary['sequence_similarity_by_theme'].items():
                ss = similarity['summaries']
                lines.append(f"- {theme} within-arm pairwise normalized Levenshtein similarity, family/action median: {ss['family_order']['median']}/{ss['derived_authored_action_sequence']['median']} ({similarity['pair_count']} pairs)")
            lines.append('')
            for row in [r for r in panel['maps'] if r['arm'] == arm]:
                lines.append(f"- {row['id']}: {' → '.join(row['authored']['family_order'])}; "
                             f"{row['observed']['outcome']} at {row['observed']['observed_seconds']:.3f}s; "
                             f"seams {row['observed']['seams_reached']}/{len(row['observed']['seams'])}")
            lines.append('')
            for family, summary in summary['family_observations'].items():
                ranges = summary['y_range_px_all_reached']
                lines.append(f"- {family}: authored/reached/active-end-alive "
                             f"{summary['authored_modules']}/{summary['active_geometry_reached_modules']}/{summary['active_end_reached_alive_modules']}; "
                             f"reached native y-range median {ranges['median']}; bounces {summary['bounce_contact_count']}")
    lines += ['', 'Detailed JSON retains per-module y ranges, contacts, cadence, actual states at seams, every family order, ',
              'provider parameter use and source hashes. Unselected provider choices are structural unused concepts, ',
              'not automatically missing physical relations, and do not inherit qualification.', '']
    return '\n'.join(lines)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('panels', type=Path, nargs='+')
    parser.add_argument('--out', type=Path, required=True)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args(argv)
    for output in (args.out, args.report):
        if output and output.exists():
            parser.error(f'Refusing to replace existing output: {output}')
    audit = {'schema': SCHEMA, 'limits': LIMITS, 'native_ticks_per_second': HZ,
             'new_physics_runs': 0, 'panels': [audit_panel(p) for p in args.panels]}
    with args.out.open('x') as stream:
        json.dump(audit, stream, ensure_ascii=False, indent=2, allow_nan=False)
        stream.write('\n')
    if args.report:
        with args.report.open('x') as stream:
            stream.write(render_report(audit))
    print(json.dumps({'audit': str(args.out), 'report': str(args.report) if args.report else None,
                      'panels': len(audit['panels']), 'new_physics_runs': 0}))


if __name__ == '__main__':
    main()
