"""Absolute-progress three-stage authoring preferences, never a pressure model.

Only already-admitted immutable fragments compete. Bands are source geometry;
constant targets remain author intent. Neither is a reached state or a human
skill measure. No quota, new randomness, physics, fragment edit, or role relabel
is performed here. The existing v7 terminal-evidence test is retained.
"""
from __future__ import annotations

import math
from collections import Counter

from . import grammar_v4 as V4, grammar_v7 as V7

VERSION = 'combo-plan-stage-grammar/8'
STAGES = ('read', 'redirect', 'chain')
ORIGIN_X, SPEED, RADIUS = 60.0, 150.0, 10.0


def stage_context(start_x, end_x, duration_s):
    """Stage by absolute active midpoint, with fractional boundary overlap.

    Beam search passes the requested duration. Completion ranking passes its
    actual native duration, including the existing terminal tail. The 120s
    timed world uses 120s, never its larger rendering width or observed lifetime.
    """
    if not all(math.isfinite(x) for x in (start_x, end_x, duration_s)):
        raise ValueError('Stage coordinates and duration must be finite')
    if end_x <= start_x or duration_s <= 0:
        raise ValueError('Stage range and duration must be positive')
    a, b = (start_x - ORIGIN_X) / SPEED, (end_x - ORIGIN_X) / SPEED
    midpoint = min(1.0, max(0.0, (a + b) / (2 * duration_s)))
    index = min(2, int(midpoint * 3))
    overlaps = [max(0.0, min(b, (i + 1) * duration_s / 3) -
                    max(a, i * duration_s / 3)) for i in range(3)]
    total = sum(overlaps)
    fractions = [value / total for value in overlaps] if total else [float(i == index) for i in range(3)]
    return {'index': index, 'name': STAGES[index],
            'active_start_s': a, 'active_end_s': b,
            'progress_midpoint': midpoint, 'overlap_fractions': fractions,
            'basis_duration_s': duration_s}


def stage_for(start_x, end_x, duration_s):
    return stage_context(start_x, end_x, duration_s)['index']


def _body_bands(fragment):
    """Conservative ordered source apertures, not trajectory certificates.

    Circle-side bands apply to the authored route only. Spring uses the widest
    existing composed receiver (220px), so its later answer cannot earn a
    spurious redirect from the narrower pre-compositor source gate.
    """
    bodies = {b['id']: b for b in fragment.get('map', {}).get('obstacles', [])}
    family = fragment['family']
    bands = []
    def add(ids, low, high, x):
        if set(ids) <= bodies.keys() and low <= high:
            bands.append({'source_body_ids': list(ids), 'x': x,
                          'center_band_y': [low, high]})
    def paired(top, bottom):
        if top in bodies and bottom in bodies:
            t, b = bodies[top], bodies[bottom]
            if max(t['x'], b['x']) <= min(t['x'] + t['collider']['w'], b['x'] + b['collider']['w']):
                add((top, bottom), t['y'] + t['collider']['h'] + RADIUS,
                    b['y'] - RADIUS, max(t['x'], b['x']))
    if family == 'cloister':
        for index in (1, 2, 3):
            crown = bodies.get(f'solid-crown-{index}')
            if crown is None:
                continue
            if index == 2 and 'floor-loft-2' in bodies:
                add((crown['id'], 'floor-loft-2'), crown['y'] + crown['collider']['h'] + RADIUS,
                    bodies['floor-loft-2']['y'] - RADIUS, crown['x'])
            elif f'canopy-{index}' in bodies:
                top = bodies[f'canopy-{index}']
                add((crown['id'], top['id']), top['y'] + top['collider']['h'] + RADIUS,
                    crown['y'] - RADIUS, crown['x'])
    elif family == 'tidal-staircase':
        for top, bottom in (('roof-2', 'bank-1'), ('roof-3', 'bank-3'), ('roof-4', 'bank-4')):
            paired(top, bottom)
    elif family == 'slider-island':
        paired('entry-top', 'entry-bottom')
        island = bodies.get('island')
        if island and 'corridor-top' in bodies and 'corridor-bottom' in bodies:
            normalized = fragment.get('metadata', {}).get('provider_metadata', {}).get('normalized_spec', {})
            lower = normalized.get('branch') == 'lower'
            top, bottom = bodies['corridor-top'], bodies['corridor-bottom']
            add(('island', top['id'], bottom['id']),
                island['y'] + island['collider']['h'] + RADIUS if lower else top['y'] + top['collider']['h'] + RADIUS,
                bottom['y'] - RADIUS if lower else island['y'] - RADIUS, island['x'])
        paired('receiver-top', 'receiver-bottom')
    elif family in ('spring-reception', 'bellows-question-answer'):
        names = ('G-receiver',) if family == 'spring-reception' else ('Q-in', 'Q-out', 'A-in', 'A-out')
        for name in names:
            if name not in bodies:
                continue
            b = bodies[name]
            opening = b.get('motion', {}).get('opening_px', 0)
            if family == 'spring-reception':
                opening = max(220, opening)
            add((name,), b['y'] - opening / 2 + RADIUS,
                b['y'] + opening / 2 - RADIUS, b['x'])
        if 'receipt-answer-roof' in bodies:
            b = bodies['receipt-answer-roof']
            add((b['id'],), b['y'] + b['collider']['h'] + RADIUS,
                fragment['map'].get('height', 540) - RADIUS, b['x'])
    # Refinements may supply new physical relation bands. Require real source
    # IDs; a stage name or unsupported prose cannot earn a geometry preference.
    extra = fragment.get('metadata', {}).get('stage_relations_v8', {})
    for band in extra.get('action_bands', []):
        ids = band.get('source_body_ids', [])
        if ids and set(ids) <= bodies.keys() and len(band.get('center_band_y', [])) == 2:
            add(ids, *band['center_band_y'], band['x'])
    return sorted(bands, key=lambda band: band['x'])


def fragment_profile(fragment):
    """Small, transparent authoring features with source evidence attached."""
    a, b = fragment['active_start'], fragment['active_end']
    if b <= a:
        raise ValueError('Fragment active range must be positive')
    spans, ramp_length = [], 0.0
    for g in fragment.get('guide', []):
        x, end = max(a, g['x']), min(b, g['until_x'])
        if end <= x:
            continue
        if g.get('target_y_end', g['target_y']) != g['target_y']:
            ramp_length += end - x
            continue
        if spans and spans[-1]['end_x'] == x and spans[-1]['target_y'] == g['target_y']:
            spans[-1]['end_x'] = end
        else:
            spans.append({'start_x': x, 'end_x': end, 'target_y': g['target_y']})
    bodies = fragment.get('map', {}).get('obstacles', [])
    timed = [o['id'] for o in bodies if o.get('timeline') and (
        o['timeline'].get('hold_s', 0) > 0 or o['timeline'].get('active_s', 0) > 0)]
    moving = [o['id'] for o in bodies if (o.get('motion') or {}).get('period_s', 0) > 0
              and o.get('mechanic_kind') in ('vertical_armor_slider', 'horizontal_armor_slider')]
    bands = _body_bands(fragment)
    signs, shifts = [], []
    for first, second in zip(bands, bands[1:]):
        left, right = first['center_band_y'], second['center_band_y']
        shift = right[0] - left[1] if right[0] > left[1] else (
            right[1] - left[0] if right[1] < left[0] else 0.0)
        if shift:
            signs.append(1 if shift > 0 else -1)
            shifts.append(abs(shift))
    high_limit = fragment.get('map', {}).get('height', 540) * .45
    return {'active_length_px': b - a, 'source_bands': bands,
            'disjoint_band_changes': len(shifts), 'minimum_band_travel_px': sum(shifts),
            'band_direction_reversals': sum(a != b for a, b in zip(signs, signs[1:])),
            'timed_body_ids': timed, 'moving_body_ids': moving,
            'constant_spans': spans, 'ramp_length_px': ramp_length,
            'longest_constant_span_px': max((s['end_x'] - s['start_x'] for s in spans), default=0),
            'long_constant_excess_px': sum(max(0, s['end_x'] - s['start_x'] - 300) for s in spans),
            'high_constant_length_px': sum(s['end_x'] - s['start_x'] for s in spans if s['target_y'] <= high_limit),
            'source_band_widths_px': [band['center_band_y'][1] - band['center_band_y'][0] for band in bands],
            'sustain_support': 'timed-control' if timed or moving else (
                'visible-source-confinement' if any(
                    band['center_band_y'][0] <= span['target_y'] <= band['center_band_y'][1]
                    for band in bands for span in spans) else 'unattributed-author-aim')}


def _stage_fits(profile):
    changes = min(3, profile['disjoint_band_changes'])
    reversals = min(2, profile['band_direction_reversals'])
    timing = min(3, len(profile['timed_body_ids']) + len(profile['moving_body_ids']))
    # These are explicit pedagogic preferences, not a calibrated pressure score.
    # Read: maintain a visible static route. Redirect: change source bands.
    # Chain: couple those changes to real moving/timed controls.
    return (1.4 - .22 * changes - .55 * timing,
            .60 * changes + .30 * reversals - .08 * timing,
            .35 * changes + .25 * reversals + .60 * timing)


def _row_fit(fragment, dx, duration_s, profile=None):
    profile = profile or fragment_profile(fragment)
    context = stage_context(fragment['active_start'] + dx, fragment['active_end'] + dx, duration_s)
    score = sum(weight * fit for weight, fit in zip(context['overlap_fractions'], _stage_fits(profile)))
    return score, context, profile


def score_adjustment(seq, fragment, dx, duration_s, theme, *, actions=None):
    """Duration-weighted incremental beam preference, never family quotas."""
    score, _, profile = _row_fit(fragment, dx, duration_s)
    catalog = V4._catalog()
    family = fragment['family']
    requested = set(actions or ())
    covered = {a for row in seq for a in catalog[row['fragment']['family']]['actions']}
    novel = requested.intersection(catalog[family]['actions']) - covered
    # One point per nominal 5s of active action; no per-module count reward.
    score *= profile['active_length_px'] / (SPEED * 5)
    score += 1.2 * len(novel)
    if theme in catalog[family]['themes']:
        score += .15 * profile['active_length_px'] / (SPEED * 5)
    if seq:
        if profile['sustain_support'] == 'unattributed-author-aim':
            repeated = any(row['fragment']['family'] == family and
                           row['fragment'].get('variant') == fragment.get('variant') for row in seq)
            later = sum(stage_context(fragment['active_start'] + dx, fragment['active_end'] + dx, duration_s)['overlap_fractions'][1:])
            if repeated:
                score -= later * profile['long_constant_excess_px'] / (SPEED * 5)
        pair = (seq[-1]['fragment']['family'], family)
        old = [row['fragment']['family'] for row in seq]
        score -= .4 * sum(p == pair for p in zip(old, old[1:]))
    return score


def _duration(state, duration_s):
    return 120.0 if duration_s == 120 else (state['last'] + 160 - ORIGIN_X) / SPEED


def _plan_fit(state, duration_s, theme, profiles):
    total, weighted, rows = 0.0, 0.0, []
    seen_relations = set()
    for row in state['seq']:
        fragment = row['fragment']
        key = id(fragment)
        if key not in profiles:
            profiles[key] = fragment_profile(fragment)
        fit, context, profile = _row_fit(fragment, row['dx'], duration_s, profiles[key])
        length = profile['active_length_px']
        total += length
        relation = (fragment['family'], fragment.get('variant', 'base'))
        if relation in seen_relations and profile['sustain_support'] == 'unattributed-author-aim':
            fit -= sum(context['overlap_fractions'][1:]) * profile['long_constant_excess_px'] / length
        seen_relations.add(relation)
        weighted += length * fit
        rows.append(dict(context, family=fragment['family'], variant=fragment.get('variant', 'base'),
                         geometry_stage=fragment.get('metadata', {}).get('stage_relations_v8', {}).get('stage_name'),
                         source_band_changes=profile['disjoint_band_changes'],
                         source_direction_reversals=profile['band_direction_reversals'],
                         timed_control_count=len(profile['timed_body_ids']) + len(profile['moving_body_ids']),
                         longest_constant_span_px=profile['longest_constant_span_px'],
                         source_band_widths_px=profile['source_band_widths_px'],
                         sustain_support=profile['sustain_support']))
    order = tuple(row['fragment']['family'] for row in state['seq'])
    catalog = V4._catalog()
    thematic = sum(profiles[id(row['fragment'])]['active_length_px']
                   for row in state['seq'] if theme in catalog[row['fragment']['family']]['themes']) / total
    repeats = sum(count - 1 for count in Counter(zip(order, order[1:])).values())
    fit = weighted / total + .15 * thematic - .15 * repeats / len(order)
    return fit, rows


def choose_complete(complete, seed, theme, actions, duration_s=None):
    """Rank admitted geometry at its actual duration; preserve all source rows.

    Coverage and truthful terminal resolution retain v7 precedence. Variants
    compete on actual authored geometry before order deduplication. No role is
    changed by v8; terminal evidence is inherited by applying v7 to one winner.
    """
    if not complete:
        raise ValueError('No complete plan is available to the stage grammar')
    catalog, requested, profiles, by_order = V4._catalog(), frozenset(actions or ()), {}, {}
    for compiler_score, state in complete:
        order = tuple(row['fragment']['family'] for row in state['seq'])
        if not order:
            raise ValueError('A complete plan cannot have an empty sequence')
        if any(family not in catalog for family in order):
            raise ValueError('A complete plan contains an unknown family')
        actual_duration = _duration(state, duration_s)
        fit, rows = _plan_fit(state, actual_duration, theme, profiles)
        variants = tuple(row['fragment'].get('variant', 'base') for row in state['seq'])
        offsets = tuple(row['dx'] for row in state['seq'])
        rank = (fit, compiler_score, variants, offsets)
        if order not in by_order or rank > by_order[order]['rank']:
            by_order[order] = {'rank': rank, 'state': state, 'fit': fit,
                               'rows': rows, 'duration': actual_duration,
                               'compiler_score': compiler_score}
    coverage = {order: len(requested.intersection(V7._actions(order, catalog))) for order in by_order}
    most = max(coverage.values())
    covering = [order for order in by_order if coverage[order] == most]
    resolving = [order for order in covering if V7._resolution(by_order[order]['state']['seq'][-1]['fragment'])]
    eligible = resolving or covering
    best = max(by_order[order]['fit'] for order in eligible)
    shortlist = [order for order in eligible if by_order[order]['fit'] >= best - .12 - 1e-12]
    chosen = max(shortlist, key=lambda order: (V4._hash((VERSION, seed, theme, sorted(requested), order)), order))
    winner = by_order[chosen]
    selected = V7.choose_complete([(winner['compiler_score'], winner['state'])], seed, theme, actions)
    grammar = dict(selected['grammar'])
    terminal = grammar['terminal_resolution']
    grammar.update(schema=VERSION, outline='absolute-progress-read-redirect-chain',
                   stage_duration_s=winner['duration'],
                   stages=[{'index': i, 'name': name, 'start_s': i * winner['duration'] / 3,
                            'end_s': (i + 1) * winner['duration'] / 3} for i, name in enumerate(STAGES)],
                   module_stages=winner['rows'], candidate_order_count=len(by_order),
                   action_covering_order_count=len(covering), resolving_order_count=len(resolving),
                   near_equal_order_count=len(shortlist), authoring_fit=winner['fit'],
                   beam_schema=VERSION,
                   selection_basis='maximal requested-action coverage; existing terminal resolution; '
                       'actual-duration-weighted source-band and timed-action stage fit; penalize '
                       'repeated later long author aims only without visible confinement or timed '
                       'control; existing deterministic seeded tie-break',
                   qualification='authored geometry/timing hypothesis only; no observed pressure, '
                       'human difficulty, reachable state, or safe-range claim',
                   unmeasured_axes=['human anticipation', 'correctable input window',
                                    'human click-frequency burden', 'human precision burden'])
    # Legacy six-slot annotations cannot masquerade as the new driving grammar.
    grammar.pop('beam_slots', None)
    grammar['slots'] = [{'intent': row['name'], 'role': selected['seq'][i]['role']}
                        for i, row in enumerate(winner['rows'])]
    grammar['terminal_resolution'] = terminal
    selected['grammar'] = grammar
    return selected
