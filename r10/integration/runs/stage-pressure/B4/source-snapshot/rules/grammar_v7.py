"""Terminal-aware ranking of already admitted whole-fragment completions.

Revision 4 remains the beam/seam grammar. This selector uses the *actual* last
module, rather than waiting for its six-slot outline to reach ``resolve``.
It changes which existing family order wins; it does not append recovery space,
change a fragment/offset, run physics, or claim a reachable terminal state.
"""
from __future__ import annotations

from . import grammar_v4 as V4

VERSION = 'combo-plan-grammar/7'

# Receipt keeps the existing catch (and alternate spring's lower answer), a
# contour returns upward after its trough, and Bellows sustains a timed outlet.
# In particular, resolution is not synonymous with low catalog pressure.
THEME_INTENTS = {
    'arcade': ('returning-contour',),
    'foundry': ('receipt', 'sustained-outlet', 'returning-contour'),
    'signal': ('receipt', 'sustained-outlet'),
}


def _resolution(fragment):
    """Describe an existing terminal control, or decline to call it resolution.

    Check source bodies and retained guides, not a family name/role alone. The
    composer trims recovery guides at active_end, so those cannot support the
    claimed terminal action. All coordinates here are fragment-local.
    """
    family = fragment['family']
    bodies = {body['id']: body for body in fragment.get('map', {}).get('obstacles', [])}
    end = fragment.get('active_end')
    if end is None:
        return None
    guides = [g for g in fragment.get('guide', [])
              if g['x'] < end and min(g['until_x'], end) > g['x']]
    if not guides:
        return None
    last = guides[-1]
    policies = {g.get('policy') for g in guides}
    targets = [g.get('target_y_end', g['target_y']) for g in guides]
    ids, intent, action = [], None, None
    if (family == 'spring-reception' and 'G-receiver' in bodies
            and 'spring-receive' in policies):
        ids = ['G-receiver']
        intent, action = 'receipt', 'catch after optional spring contact or bypass'
        if 'receipt-answer-roof' in bodies:
            ids.append('receipt-answer-roof')
            action += ', then descend under the existing answer roof'
    elif (family == 'light-cavity' and 'wide-receiving-cavity' in bodies
          and last.get('policy') == 'laser-receive'):
        ids = ['wide-receiving-cavity']
        intent, action = 'receipt', 'release from the light channel and catch in its cavity'
    elif (family == 'cloister' and 'solid-crown-3' in bodies
          and targets[-1] < max(targets)):
        ids = ['solid-crown-3']
        intent, action = 'returning-contour', 'rise from the low answer back over the final crown'
    elif (family == 'tidal-staircase' and {'roof-4', 'bank-4'} <= bodies.keys()
          and targets[-1] < max(targets)):
        ids = ['roof-4', 'bank-4']
        intent, action = 'returning-contour', 'lift from the low trough and sustain the exit shelf'
    elif (family == 'bellows-question-answer' and 'A-out' in bodies
          and bodies['A-out'].get('timeline', {}).get('hold_s', 0) > 0
          and last['x'] < bodies['A-out']['x'] + bodies['A-out']['collider']['w']
          and last['until_x'] >= end):
        ids = ['A-out']
        intent, action = 'sustained-outlet', 'return to the low answer and sustain through the thick timed outlet'
    if intent is None:
        return None
    return {
        'intent': intent,
        'family': family,
        'action': action,
        'source_body_ids': ids,
        'retained_terminal_guide_local_x': [last['x'], min(last['until_x'], end)],
        'source_terminal_target_y': targets[-1],
        'control_scope': 'fragment-local before existing compositor connectors; not an attained state',
        'qualification': 'existing authored control only; not a reached state or a physical completion claim',
    }


def _actions(order, catalog):
    return {action for family in order for action in catalog[family]['actions']}


def _preferred_intent(seed, theme):
    choices = THEME_INTENTS.get(theme, ('receipt', 'returning-contour', 'sustained-outlet'))
    return choices[V4._hash((VERSION, seed, theme, 'terminal-intent')) % len(choices)]


def _quality(order, resolution, seed, theme, requested, catalog):
    # Remove the obsolete last slot's fit: a four-module completion must not
    # win because slot four wanted another route peak. Keep prefix preferences,
    # theme breadth, repeated-pair and high-pressure-plateau penalties intact.
    score = V4._order_quality(order, seed, theme)
    score -= V4._slot_score(order[-1], len(order) - 1, seed) / len(order)
    if resolution is None:
        return score
    intent = resolution['intent']
    score += 1.4 if intent == _preferred_intent(seed, theme) else (
        .6 if intent in THEME_INTENTS.get(theme, ()) else 0)
    if theme in catalog[order[-1]]['themes']:
        score += .4
    # Rank the final action in context, rather than reward a verb already
    # repeated throughout the prefix. Global coverage remains lexicographic.
    remaining = requested - _actions(order[:-1], catalog)
    score += .35 * len(remaining.intersection(catalog[order[-1]]['actions']))
    if intent == 'returning-contour' and order[0] in V4.GROUPS['contour']:
        score += .25
    return score


def choose_complete(complete, seed, theme, actions):
    """Return a compatible compiler state with a truthful actual-length ending.

    Maximal requested-action coverage comes first. Among those orders, prefer
    one with an existing terminal resolution control if available, then rank
    prefix phrase fit, thematic ending and actions still owed before the last
    fragment. If the admitted beam cannot supply such an ending, retain the
    original terminal role and disclose that limit. No completion is invented.

    Variants still use the compiler score; order multiplicity cannot buy weight.
    Existing nonterminal roles and every admitted geometry/offset are retained.
    The final ``resolve`` role describes the selected control, not a new seam:
    its original admission role is recorded alongside it in grammar metadata.
    """
    if not complete:
        raise ValueError('No complete plan is available to the phrase grammar')
    catalog = V4._catalog()
    requested = frozenset(actions or ())
    by_order = {}
    for score, state in complete:
        order = tuple(V4._family(row) for row in state['seq'])
        if not order:
            raise ValueError('A complete plan cannot have an empty sequence')
        if any(family not in catalog for family in order):
            raise ValueError('A complete plan contains an unknown family')
        variants = tuple(row['fragment'].get('variant', 'base') for row in state['seq'])
        geometry_key = tuple(row.get('dx', 0) for row in state['seq'])
        rank = (score, variants, geometry_key)
        if order not in by_order or rank > by_order[order][0]:
            by_order[order] = (rank, state)

    coverage = {order: len(requested.intersection(_actions(order, catalog)))
                for order in by_order}
    most_covered = max(coverage.values())
    covering = [order for order in by_order if coverage[order] == most_covered]
    resolutions = {order: _resolution(by_order[order][1]['seq'][-1]['fragment'])
                   for order in covering}
    resolving = [order for order in covering if resolutions[order] is not None]
    eligible = resolving or covering
    quality = {order: _quality(order, resolutions[order], seed, theme, requested, catalog)
               for order in eligible}
    best = max(quality.values())
    shortlist = [order for order in eligible if quality[order] >= best - .20 - 1e-12]
    chosen = max(shortlist, key=lambda order: (
        V4._hash((VERSION, seed, theme, sorted(requested), order)), order))
    state = dict(by_order[chosen][1])
    state['seq'] = [dict(row) for row in state['seq']]
    terminal = state['seq'][-1]
    original_role = terminal['role']
    resolution = resolutions[chosen]
    if resolution is not None:
        terminal['role'] = 'resolve'
    prefix_covered = _actions(chosen[:-1], catalog)
    remaining = requested - prefix_covered
    covered = requested.intersection(_actions(chosen, catalog))
    base = V4.plan_metadata(seed, theme)
    beam_slots = base['slots']
    actual_slots = [dict(beam_slots[i % len(beam_slots)], role=row['role'])
                    for i, row in enumerate(state['seq'])]
    if resolution is not None:
        actual_slots[-1]['intent'] = resolution['intent']
    state['grammar'] = dict(
        base,
        schema=VERSION,
        beam_schema=V4.VERSION,
        beam_slots=beam_slots,
        slots=actual_slots,
        actual_family_order=list(chosen),
        actual_module_count=len(chosen),
        candidate_order_count=len(by_order),
        action_covering_order_count=len(covering),
        resolving_order_count=len(resolving),
        near_equal_order_count=len(shortlist),
        covered_requested_actions=sorted(covered),
        authoring_fit=quality[chosen],
        selection_basis='maximal requested-action coverage among admitted beam candidates; '
                        'then an existing terminal resolution control at the actual plan length; '
                        'then prefix fit, thematic ending and remaining action; '
                        'seeded choice among near-equal family orders',
        terminal_resolution=dict(
            resolution or {},
            status='authored-resolution' if resolution is not None else 'unavailable-at-maximal-action-coverage',
            preferred_intent=_preferred_intent(seed, theme),
            module_index=len(chosen) - 1,
            admission_role=original_role,
            remaining_requested_actions_before_terminal=sorted(remaining),
            answered_requested_actions=sorted(remaining.intersection(catalog[chosen[-1]]['actions'])),
            unmatched_requested_actions=sorted(requested - covered),
            geometry_policy='unchanged admitted fragment, offsets and seam reserves; no added rest',
        ),
    )
    return state
