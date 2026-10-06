"""Seeded, authored phrase selection; this is not a physical safety model.

The compiler owns feasibility (duration, descriptor cap, palette and seam rules).
This module ranks only candidates that the compiler already admitted. A seed
chooses one of four readable phrase outlines, rather than independent mechanic
phases or an unconstrained shuffle. Requested-action coverage has priority over
the outline. Family orders compete once each, so more discrete variants of one
order do not buy it more chances to win.

Call role_for before computing a seam, add score_adjustment during beam search,
then return choose_complete instead of complete[0][1]. None of these functions
edits fragments, maps, clocks, runtime state or qualification.
"""
from __future__ import annotations

import hashlib
import json
from collections import Counter

VERSION = 'combo-plan-grammar/4'

# Every slot is an action phrase, not a time bin. Its actual length is inherited
# from the selected whole fragment. Pressure is authored metadata, not measured
# human difficulty. Missing families in an explicit palette are soft fallbacks.
GROUPS = {
    'contour': frozenset(('cloister', 'tidal-staircase')),
    'route': frozenset(('slider-island',)),
    'receive': frozenset(('spring-reception', 'light-cavity')),
    'timing': frozenset(('bellows-question-answer',)),
}
OUTLINES = (
    ('contour-commit-return', (
        ('contour', 'introduce'), ('route', 'peak'),
        ('receive', 'answer'), ('contour', 'release'),
        ('timing', 'recall'), ('receive', 'resolve'))),
    ('question-contrast-answer', (
        ('timing', 'introduce'), ('receive', 'develop'),
        ('contour', 'release'), ('route', 'peak'),
        ('receive', 'answer'), ('contour', 'resolve'))),
    ('commit-relax-rebuild', (
        ('route', 'introduce'), ('contour', 'release'),
        ('receive', 'develop'), ('timing', 'peak'),
        ('contour', 'answer'), ('receive', 'resolve'))),
    ('contour-question-crescendo', (
        ('contour', 'introduce'), ('timing', 'develop'),
        ('receive', 'answer'), ('route', 'peak'),
        ('contour', 'release'), ('receive', 'resolve'))),
)


def _hash(value):
    return int.from_bytes(hashlib.sha256(json.dumps(
        value, sort_keys=True, separators=(',', ':')).encode()).digest(), 'big')


def _catalog():
    # Lazy import avoids an import cycle and keeps the compiler catalog the sole
    # source of family actions, theme memberships and nominal pressures.
    from generator import CATALOG
    return CATALOG


def _outline(seed):
    index = int.from_bytes(hashlib.sha256(
        (VERSION + ':' + str(seed)).encode()).digest(), 'big') % len(OUTLINES)
    return OUTLINES[index]


def role_for(depth, seed, theme):
    """The selected slot's role; use this *before* seam_gap is evaluated."""
    del theme  # Theme controls family affinities; seed controls phrase shape.
    return _outline(seed)[1][depth % len(_outline(seed)[1])][1]


def plan_metadata(seed, theme):
    name, slots = _outline(seed)
    return {
        'schema': VERSION,
        'outline': name,
        'theme': theme,
        'slots': [{'intent': group, 'role': role} for group, role in slots],
        'selection_basis': 'maximal requested-action coverage among admitted beam '
                           'candidates, then authored '
                           'phrase fit; seeded choice among near-equal family orders',
        'qualification': 'authoring heuristic only; no transferred qualification '
                         'or claim about reachable seam states',
    }


def _family(row):
    return row['fragment']['family']


def _slot_score(family, depth, seed):
    group, role = _outline(seed)[1][depth % len(_outline(seed)[1])]
    pressure = _catalog()[family]['pressure']
    score = 2.4 if family in GROUPS[group] else 0.0
    if role == 'release':
        score += {1: 1.2, 2: .25, 3: -.6}[pressure]
    elif role == 'peak':
        score += {1: -.4, 2: .3, 3: .8}[pressure]
    return score


def score_adjustment(seq, f, role, depth, seed, theme, *, actions=None):
    """Incremental beam preference, with no geometry changes or rejection.

    Passing actions is optional but recommended: it rewards a newly represented
    requested verb, instead of rewarding the same matching verb on every repeat.
    The original positional role argument remains in the interface so callers
    can adopt this without changing their seam API; role_for is authoritative.
    """
    del role
    catalog = _catalog()
    family = f['family']
    previous = [_family(row) for row in seq]
    covered = {a for name in previous for a in catalog[name]['actions']}
    requested = set(actions or ())
    newly_covered = requested.intersection(catalog[family]['actions']) - covered
    score = .8 * _slot_score(family, depth, seed) + 1.5 * len(newly_covered)
    if family not in previous and theme in catalog[family]['themes']:
        score += .6
    if previous:
        pair = (previous[-1], family)
        score -= 1.0 * sum(p == pair for p in zip(previous, previous[1:]))
    return score


def _order_quality(order, seed, theme):
    catalog = _catalog()
    n = len(order)
    unique = set(order)
    # Average slot fit avoids favoring short fragments merely because they can
    # be counted more times. Theme is rewarded for distinct contributions.
    fit = sum(_slot_score(f, i, seed) for i, f in enumerate(order)) / n
    thematic = sum(theme in catalog[f]['themes'] for f in unique) / len(unique)
    pairs = Counter(zip(order, order[1:]))
    repeated_pairs = sum(count - 1 for count in pairs.values())
    high_plateaus = sum(catalog[a]['pressure'] == catalog[b]['pressure'] == 3
                        for a, b in zip(order, order[1:]))
    return fit + 1.0 * thematic - .45 * repeated_pairs - .12 * high_plateaus


def choose_complete(complete, seed, theme, actions):
    """Return one admitted compiler state, retaining all fragment geometry.

    complete is the compiler's list of (duration-adjusted-score, state) pairs.
    Coverage is lexicographic: if a requested verb is represented in an eligible
    order, a higher scalar theme score cannot simply crowd it out. If all verbs
    cannot coexist, maximize their count and retain unmet-action disclosure in
    the compiler. Variant selection still uses the compiler's original score.

    Scores within 0.20 are intentionally treated as equivalent authoring fits.
    A stable seed hash chooses among those family orders, not among every variant
    combination. Identical inputs are independent of input iteration order and
    duplicated candidates. The function does not add or remove candidate bodies.
    """
    if not complete:
        raise ValueError('No complete plan is available to the phrase grammar')
    catalog = _catalog()
    requested = frozenset(actions or ())
    by_order = {}
    for score, state in complete:
        order = tuple(_family(row) for row in state['seq'])
        if not order:
            raise ValueError('A complete plan cannot have an empty sequence')
        if any(f not in catalog for f in order):
            raise ValueError('A complete plan contains an unknown family')
        variants = tuple(row['fragment'].get('variant', 'base') for row in state['seq'])
        # Deterministic variant tie break; never sample variants as if each were
        # an independent macro design. dx disambiguates equal fragment choices.
        geometry_key = tuple(row.get('dx', 0) for row in state['seq'])
        rank = (score, variants, geometry_key)
        if order not in by_order or rank > by_order[order][0]:
            by_order[order] = (rank, state)
    coverage = {
        order: len(requested.intersection(
            a for f in order for a in catalog[f]['actions']))
        for order in by_order
    }
    most_covered = max(coverage.values())
    eligible = {order: _order_quality(order, seed, theme) for order in by_order
                if coverage[order] == most_covered}
    best_quality = max(eligible.values())
    shortlist = [order for order, score in eligible.items()
                 if score >= best_quality - .20 - 1e-12]
    chosen = max(shortlist, key=lambda order: (
        _hash((VERSION, seed, theme, sorted(requested), order)), order))
    state = dict(by_order[chosen][1])
    state['grammar'] = dict(plan_metadata(seed, theme),
                            actual_family_order=list(chosen),
                            candidate_order_count=len(by_order),
                            action_covering_order_count=len(eligible),
                            near_equal_order_count=len(shortlist),
                            covered_requested_actions=sorted(requested.intersection(
                                a for f in chosen for a in catalog[f]['actions'])),
                            authoring_fit=eligible[chosen])
    return state
