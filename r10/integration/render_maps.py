#!/usr/bin/env python3
"""Render stored maps and traces, using canonical geometry without physics replays.

Examples:
  python integration/render_maps.py --root integration/evidence/L1 --out integration/visuals/L1
  python integration/render_maps.py path/to/map.json --trace path/to/trace.json --out /tmp/map-review

Inputs: ordinary map JSON (or {map: ...}); map.integration.modules and .guide are
optional. Traces may be an array, {trace: [...]}, {trajectory: [...]}, or JSONL;
points need x/y/tick. Optional point.state supplies actual historical mechanism
state; no state is fabricated. --states accepts an independent snapshot array.
Outputs: contact-sheet.png, detail-*.png, seams-*.png, renderer-manifest.json,
and geometry-*.json with the exact sample times and geometry warnings.
"""
from __future__ import annotations
import argparse
import hashlib
import gzip
import json
import math
import os
import re
import subprocess
from pathlib import Path

os.environ.setdefault('MPLCONFIGDIR', '/tmp/combo-map-mpl-cache')
os.environ.setdefault('XDG_CACHE_HOME', '/tmp/combo-map-xdg-cache')

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Polygon, Rectangle
from matplotlib.lines import Line2D

HERE = Path(__file__).resolve().parent
COLORS = ['#16788a', '#bd6438', '#7069a9', '#528843', '#a35387', '#b69632', '#537caa', '#7d756a', '#497c76', '#ac5965']
BG, INK, MUTED = '#fbfaf7', '#222b35', '#65717b'

NODE_GEOMETRY = r'''
const fs=require('fs');
const input=JSON.parse(fs.readFileSync(0,'utf8'));
require(input.runtime);const E=globalThis.FlappyRuntime;
const m=input.map, samples=input.samples;
let output=[];
for(let k=0;k<m.obstacles.length;k++){
 const d=m.obstacles[k], q=samples[k], piece={...m,obstacles:[d]}, state=q.state;
 let warnings=[];
 if(d.trigger_id&&!state?.triggerState)warnings.push('trigger history unavailable; untriggered descriptor shown');
 if(['warning_missile','phase_wall','paired_portal','crack_bumper_panel'].includes(d.mechanic_kind)&&!state)
   warnings.push('historical mechanism state unavailable');
 try {
   const bodies=E.obstacles(piece,q.tick,state);
   output.push({descriptor_id:d.id,tick:q.tick,time_s:q.tick*E.DT,clock_basis:q.clock_basis,state_basis:q.state_basis,
     family:q.family,module_id:q.module_id,warnings,bodies});
 }catch(e){output.push({descriptor_id:d.id,tick:q.tick,time_s:q.tick*E.DT,clock_basis:q.clock_basis,
     state_basis:q.state_basis,family:q.family,module_id:q.module_id,warnings:[...warnings,String(e.message)],bodies:[]});}
}
process.stdout.write(JSON.stringify({engine:E.engineId,DT:E.DT,map_sha256:require('crypto').createHash('sha256').update(JSON.stringify(m)).digest('hex'),samples:output}));
'''


def read_json(path):
    text = gzip.open(path, 'rt').read() if str(path).endswith('.gz') else Path(path).read_text()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return [json.loads(line) for line in text.splitlines() if line.strip()]


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def points_of(obj):
    if isinstance(obj, list):
        points = obj
    elif isinstance(obj, dict):
        if isinstance(obj.get('rows'), list) and isinstance(obj.get('rowSchema'), list):
            return points_of([dict(zip(obj['rowSchema'], row)) for row in obj['rows']])
        for key in ('trace', 'trajectory', 'points', 'states', 'snapshots', 'samples'):
            if isinstance(obj.get(key), list):
                return points_of(obj[key])
        return []
    else:
        return []
    out = []
    for p in points:
        if not isinstance(p, dict):
            continue
        state = p.get('state', p)
        if isinstance(state, dict) and all(isinstance(state.get(k), (float, int)) for k in ('x', 'y', 'tick')):
            row = {**p, **{k: state[k] for k in ('x', 'y', 'tick')}}
            if p.get('state'):
                row['state'] = state
            elif all(k in p for k in ('mechanicState', 'broken', 'cooldowns')):
                row['state'] = p
            out.append(row)
    return sorted(out, key=lambda p: p['tick'])


def metadata(m):
    for key in ('integration', 'integration_metadata', 'combo_integration', 'composition', 'metadata'):
        if isinstance(m.get(key), dict) and ('modules' in m[key] or 'guide' in m[key]):
            return m[key]
    return m


def mod_for(m, d):
    mods = metadata(m).get('modules', [])
    for mod in mods:
        ids = mod.get('body_ids', mod.get('obstacle_ids', mod.get('descriptor_ids', [])))
        if d['id'] in ids or d.get('module_id') and mod.get('id') == d['module_id']:
            return mod
    x = d['x'] + d['collider']['w'] / 2
    return next((mod for mod in mods if mod.get('start_x', -1) <= x <= mod.get('end_x', -1)), {})


def descriptor_x(d):
    # Hammer authoring x is its pivot; unlike other shapes it is not a box origin.
    if d.get('mechanic_kind') == 'swing_armor_hammer':
        return d['x']
    if d.get('mechanic_kind') == 'laser_scanner':
        return d['x'] + d.get('motion', {}).get('dx_px', 0) / 2
    return d['x'] + d['collider']['w'] / 2


def arrival(d, trace, clock, initial_x=60):
    for key in ('authored_arrival_tick', 'arrival_tick'):
        if isinstance(d.get(key), (int, float)):
            return max(0, d[key]), 'authored descriptor tick'
    for key in ('authored_arrival_time_s', 'arrival_time_s'):
        if isinstance(d.get(key), (int, float)):
            return max(0, d[key] * 120), 'authored descriptor time'
    x = descriptor_x(d)
    if clock == 'measured' and trace and trace[0]['x'] <= x <= max(p['x'] for p in trace):
        crossings = [(a, b) for a, b in zip(trace, trace[1:]) if a['x'] <= x <= b['x'] and b['x']-a['x'] < 100]
        if crossings:
            a, b = crossings[0]
            f = (x-a['x'])/(b['x']-a['x']) if b['x'] != a['x'] else 0
            return a['tick']+(b['tick']-a['tick'])*f, 'measured x-crossing (interpolated)'
    return max(0, (x-initial_x)/150*120), 'authored nominal x / 150 px/s'


def nearest_state(tick, snapshots):
    if not snapshots:
        return None, 'unavailable'
    p = min(snapshots, key=lambda p: abs(p['tick'] - tick))
    # Never extrapolate sparse full checkpoints into a false mechanism history.
    if abs(p['tick'] - tick) > 1.01:
        return None, 'no full snapshot within one tick'
    return p['state'], f"stored full state at tick {p['tick']}"


def adjacent_trace(path):
    for name in ('trace.json.gz', 'trace.json', 'trajectory.json', 'trace.jsonl', 'trajectory.jsonl', 'rollout.json', 'result.json'):
        p = path.parent / name
        if p.exists() and points_of(read_json(p)):
            return p
    compressed = path.parent.parent / 'runs' / (path.parent.name + '.trace.json.gz')
    return compressed if compressed.exists() else None


def load_item(path, args):
    data = read_json(path)
    m = data.get('map', data)
    if not isinstance(m, dict) or not isinstance(m.get('obstacles'), list):
        raise ValueError(f'Not a map: {path}')
    trpath = Path(args.trace) if args.trace else adjacent_trace(path)
    trace = points_of(read_json(trpath)) if trpath else []
    stpath = Path(args.states) if args.states else path.parent / 'state-snapshots.json'
    if not stpath.exists() and not args.states:
        stpath = path.parent / 'states.json'
    snapshots = [p for p in trace if 'state' in p]
    if stpath.exists():
        snapshots += [p for p in points_of(read_json(stpath)) if 'state' in p]
    terminal_state = None
    native_trace = None
    compressed = path.parent / 'trace.json.gz'
    if not compressed.exists():
        compressed = path.parent.parent / 'runs' / (path.parent.name + '.trace.json.gz')
    if compressed.exists():
        native_trace = read_json(compressed)
        snapshots += [p for p in points_of(native_trace.get('checkpoints', [])) if 'state' in p]
        terminal_state = native_trace.get('finalState')
    samples = []
    for d in m['obstacles']:
        tick, basis = arrival(d, trace, args.clock, m.get('initial_player', {}).get('x', 60))
        state, state_basis = nearest_state(tick, snapshots)
        mod = mod_for(m, d)
        samples.append(dict(tick=tick, clock_basis=basis, state_basis=state_basis, state=state,
                            family=mod.get('family', d.get('family', 'legacy / unassigned')),
                            module_id=mod.get('id')))
    result = subprocess.run(['node', '-e', NODE_GEOMETRY], input=json.dumps(dict(runtime=str(args.runtime.resolve()), map=m, samples=samples)),
                            text=True, capture_output=True, check=True)
    geometry = json.loads(result.stdout)
    if native_trace and native_trace.get('mapSHA256') != geometry['map_sha256']:
        raise ValueError(f'Stored native trace map hash mismatch: {compressed}')
    slug = re.sub(r'[^a-zA-Z0-9_-]+', '-', path.parent.name if path.name == 'map.json' else path.stem)
    if args.root:
        rel = path.relative_to(Path(args.root).resolve())
        slug = re.sub(r'[^a-zA-Z0-9_-]+', '-', str(rel.parent if path.name == 'map.json' else rel.with_suffix('')))
    if not slug or slug == '-':
        slug = 'map-' + str(m.get('seed', 0))
    horizon = args.horizon_s
    if horizon is None and m.get('schema') == 'timed-course-120/v1':
        sidecar = path.parent / 'metadata.json'
        supplied = read_json(sidecar) if sidecar.exists() else {}
        horizon = supplied.get('evaluationHorizonTicks', 32 * 120) / 120
    limit = min(m['width'], 60+150*horizon) if horizon else m['width']
    return dict(path=path, map=m, trace=trace, trace_path=trpath, geometry=geometry,
                slug=slug, xmax=limit, duration=(limit-60)/150, terminal_state=terminal_state, runtime=args.runtime)


def family_palette(items):
    names = sorted({s['family'] for item in items for s in item['geometry']['samples']})
    return {name: COLORS[i % len(COLORS)] for i, name in enumerate(names)}


def capsule_vertices(b, n=12):
    x, y, x2, y2, r = b['x'], b['y'], b['x2'], b['y2'], b['width']/2
    a = math.atan2(y2-y, x2-x)
    return [(x2+r*math.cos(a-math.pi/2+j*math.pi/n), y2+r*math.sin(a-math.pi/2+j*math.pi/n)) for j in range(n+1)] + [
        (x+r*math.cos(a+math.pi/2+j*math.pi/n), y+r*math.sin(a+math.pi/2+j*math.pi/n)) for j in range(n+1)]


def draw_body(ax, b, color, uncertain=False):
    inactive = b.get('status') in ('cleared', 'idle', 'warning', 'cooldown') and not b.get('lethal')
    nonlethal = not b.get('lethal', True)
    fill = not inactive and not b.get('forceRegion')
    face = color if fill else 'none'
    alpha = .9 if b.get('lethal', True) else .43
    edge = color
    style = ':' if uncertain else '--' if inactive else '-'
    kwargs = dict(facecolor=face, edgecolor=edge, linewidth=.75, alpha=alpha, linestyle=style, zorder=3)
    if b['shape'] == 'circle':
        patch = Circle((b['x']+b['w']/2, b['y']+b['h']/2), b['w']/2, **kwargs)
    elif b['shape'] == 'polygon':
        patch = Polygon([(b['x']+p[0], b['y']+p[1]) for p in b['points']], **kwargs)
    elif b['shape'] == 'segment':
        patch = Polygon(capsule_vertices(b), **kwargs)
    else:
        patch = Rectangle((b['x'], b['y']), b['w'], b['h'], **kwargs)
    ax.add_patch(patch)
    # Clip native off-world collider extensions to the physical world, leaving
    # the separate family-band/label area unobstructed.
    lo, hi = ax.get_xlim()
    patch.set_clip_path(Rectangle((lo, 0), hi-lo, 540, transform=ax.transData))
    if b.get('contactSurface') == 'descending-top-only':
        ax.plot([b['x'], b['x']+b['w']], [b['y'], b['y']], color='#20262c', linewidth=1.5, zorder=5)


def status_text(s):
    kinds = {'laser_scanner', 'timed_armor_gate', 'phase_wall', 'warning_missile', 'warning_drop_spike'}
    b = next((b for b in s['bodies'] if b['kind'] in kinds and not b.get('projectile')), None)
    if not b:
        return None
    state = b.get('phase', b.get('status', 'active'))
    return f"{state}\n@ {s['time_s']:.2f}s"


def draw_panel(ax, item, palette, xlo=0, xhi=None, detailed=False, show_title=True):
    m, geom = item['map'], item['geometry']
    xhi = item['xmax'] if xhi is None else xhi
    ax.set_facecolor(BG)
    ax.set_xlim(xlo, xhi)
    ax.set_ylim(565 if detailed else 550, -45 if detailed else -20)
    ax.set_aspect('equal', adjustable='box')
    ax.set_yticks([0, 270, 540])
    ax.tick_params(axis='both', labelsize=8, length=2, colors=MUTED)
    ax.set_axisbelow(True)
    ax.grid(axis='x', color='#dfe3e4', linewidth=.4)
    ax.axhline(10, color='#b7bdc1', linewidth=.45, linestyle=':')
    ax.axhline(530, color='#b7bdc1', linewidth=.45, linestyle=':')
    ax.axhline(0, color=INK, linewidth=.7)
    ax.axhline(540, color=INK, linewidth=.7)
    mods = metadata(m).get('modules', [])
    for i, mod in enumerate(mods):
        a, b = mod.get('start_x', 0), mod.get('end_x', 0)
        color = palette.get(mod.get('family'), '#757c83')
        if b < xlo or a > xhi:
            continue
        ax.axvspan(a, b, facecolor=color, alpha=.035, zorder=0)
        ax.axvline(a, color=color, linewidth=.8, alpha=.6, linestyle='-.')
        lo, hi = mod.get('active_start_x', a), mod.get('active_end_x', b)
        ax.plot([lo, hi], [-13, -13], color=color, linewidth=3, solid_capstyle='butt')
        if detailed:
            label = str(mod.get('family', mod.get('id', 'module'))).replace('_', ' ')
            ax.text(max(a+8, xlo+10), -24, f"{i+1}. {label}", color=color, fontsize=8, va='bottom', clip_on=True)
    for s in geom['samples']:
        color = palette[s['family']]
        if not s['bodies'] and s['warnings']:
            d = next(d for d in m['obstacles'] if d['id'] == s['descriptor_id'])
            if xlo < descriptor_x(d) < xhi:
                ax.axvspan(d['x'], d['x']+d['collider']['w'], facecolor='#c65486', alpha=.2, hatch='///', zorder=2)
                ax.text(descriptor_x(d), 260, 'STATE?\ngeometry omitted', fontsize=6, color='#a52d61', rotation=90, va='center', ha='center', zorder=7)
        for b in s['bodies']:
            draw_body(ax, b, color, bool(s['warnings']))
        if detailed and status_text(s):
            b = s['bodies'][0]
            bx = b['x']
            if xlo < bx < xhi:
                ax.text(bx+8, 28, status_text(s), fontsize=6.2, color=color, va='top', zorder=7,
                        bbox=dict(facecolor=BG, edgecolor='none', alpha=.86, pad=1))
    for guide in metadata(m).get('guide', []):
        x = guide.get('x', guide.get('start_x'))
        y = guide.get('target_y', guide.get('y'))
        end = guide.get('until_x', guide.get('end_x', x))
        if x is not None and y is not None:
            ax.plot([x, end], [y, guide.get('target_y_end', y)], color='#d8a331', linewidth=1.25, linestyle=(0, (5, 4)), alpha=.94, zorder=6)
    trace = item['trace']
    if trace:
        # Break portal jumps so a straight line is never mistaken for measured flight.
        chunks, current = [], []
        for p in trace:
            if current and (abs(p['x']-current[-1]['x']) > 50 or abs(p['y']-current[-1]['y']) > 100):
                chunks.append(current)
                current = []
            current.append(p)
        if current:
            chunks.append(current)
        for chunk in chunks:
            ax.plot([p['x'] for p in chunk], [p['y'] for p in chunk], color='#0b2634', linewidth=1.3 if detailed else .8, zorder=8)
        p = trace[-1]
        if xlo <= p['x'] <= xhi:
            ax.plot(p['x'], p['y'], 'o', color='#0b2634', markersize=3, zorder=9)
            if detailed:
                ax.annotate(f"trace ends {p['tick']/120:.2f}s", (p['x'], p['y']), xytext=(8, -12), textcoords='offset points', color=INK, fontsize=7)
    if xlo <= 60 <= xhi:
        y = m.get('initial_player', {}).get('y', 270)
        ax.add_patch(Circle((60, y), 10, color='#283843', zorder=9))
    if xlo < m['width'] <= xhi:
        ax.axvline(m['width'], color=INK, linewidth=1.4)
    for spine in ax.spines.values():
        spine.set_visible(False)
    if detailed:
        ax.set_xlabel('World x (px)  ·  y increases downward', color=MUTED, fontsize=8)
    if show_title:
        label = item['slug']
        warning_count = sum(bool(s['warnings']) for s in geom['samples'])
        if warning_count:
            label += f' [state warnings: {warning_count}]'
        prefix = 'prefix only' if m.get('schema') == 'timed-course-120/v1' else 'complete authored map extent'
        trace_info = f"stored trace to {trace[-1]['tick']/120:.2f}s" if trace else 'no measured trace'
        ax.set_title(f"{label}  |  {item['duration']:.1f}s nominal  |  {prefix}  |  {trace_info}", loc='left', fontsize=10, fontweight='bold', color=INK, pad=9)


def legend_handles(palette):
    handles = [Line2D([0], [0], color=c, lw=5, label=k.replace('_', ' ')) for k, c in palette.items()]
    handles += [Line2D([0], [0], color='#0b2634', lw=1.7, label='stored measured trajectory'),
                Line2D([0], [0], color='#d8a331', lw=1.7, ls='--', label='authored target guide (not a trace)'),
                Line2D([0], [0], color=MUTED, lw=1.2, ls='--', label='inactive / non-colliding outline')]
    return handles


def save_contact(items, palette, out, dpi, filename='contact-sheet.png'):
    n = len(items)
    fig, axes = plt.subplots(n, 1, figsize=(23, 2.9*n + 2.5), squeeze=False, facecolor=BG)
    fig.subplots_adjust(top=1-1.75/(2.9*n+2.5), bottom=.55/(2.9*n+2.5), left=.03, right=.985, hspace=.33)
    fig.text(.03, 1-.28/(2.9*n+2.5), 'ACTUAL MAPS  /  arrival-time geometry', fontsize=21, color=INK, weight='bold', va='top')
    fig.text(.03, 1-.69/(2.9*n+2.5), 'Each descriptor uses its own arrival clock: this is a montage, not one simultaneous frame. Canonical runtime geometry; no physics replay.', fontsize=10, color=MUTED, va='top')
    fig.legend(handles=legend_handles(palette), loc='upper left', bbox_to_anchor=(.026, 1-.9/(2.9*n+2.5)), ncol=5, fontsize=8, frameon=False)
    for ax, item in zip(axes[:, 0], items):
        draw_panel(ax, item, palette)
    fig.text(.03, .16/(2.9*n+2.5), 'Filled disks are whole solid circle colliders. Ghost outlines are time-inactive bodies, never safe windows carved into solid bodies. State limitations are listed in renderer-manifest.json.', fontsize=9, color=MUTED)
    fig.savefig(out / filename, dpi=dpi, facecolor=BG)
    plt.close(fig)


def save_detail(item, palette, out, dpi):
    xmax = item['xmax']
    slices = max(1, math.ceil(xmax/1700))
    fig, axes = plt.subplots(slices, 1, figsize=(19, 6*slices+1.5), squeeze=False, facecolor=BG)
    fig.subplots_adjust(top=1-1.15/(6*slices+1.5), bottom=.04, left=.035, right=.985, hspace=.20)
    fig.suptitle(f"{item['slug']}  /  actual map detail", x=.035, y=1-.20/(6*slices+1.5), ha='left', va='top', fontsize=20, color=INK, weight='bold')
    fig.text(.035, 1-.64/(6*slices+1.5), 'Arrival montage: canonical collider geometry, full solid disks, time-state labels. Solid navy = stored trajectory; dashed gold = authored guide.', fontsize=10, color=MUTED)
    width = xmax/slices
    for i, ax in enumerate(axes[:, 0]):
        draw_panel(ax, item, palette, max(0, i*width-30), min(xmax, (i+1)*width+30), detailed=True, show_title=False)
    filename = f"detail-{item['slug']}.png"
    fig.savefig(out / filename, dpi=dpi, facecolor=BG)
    plt.close(fig)
    return filename


def save_seams(item, palette, out, dpi):
    mods = metadata(item['map']).get('modules', [])
    seams = [mod['start_x'] for mod in mods[1:] if 0 < mod.get('start_x', 0) < item['xmax']]
    if not seams:
        seams = [item['xmax']/3, 2*item['xmax']/3]
    # Select two distinct consecutive transitions; keep each title exact.
    seams = seams[:2]
    fig, axes = plt.subplots(len(seams), 1, figsize=(16, 7*len(seams)+1), squeeze=False, facecolor=BG)
    fig.subplots_adjust(top=.91, bottom=.045, left=.04, right=.985, hspace=.22)
    fig.suptitle(f"{item['slug']}  /  seam close-ups", x=.04, ha='left', fontsize=20, color=INK, weight='bold')
    for ax, x in zip(axes[:, 0], seams):
        draw_panel(ax, item, palette, max(0, x-570), min(item['xmax'], x+650), detailed=True, show_title=False)
        ax.set_title(f"World x = {x:.0f}px  ·  arrival-time montage, not a synchronized snapshot", loc='left', fontsize=10, color=INK)
        ax.axvline(x, color='#182c3b', linestyle='-.', linewidth=1.3, alpha=.7)
    filename = f"seams-{item['slug']}.png"
    fig.savefig(out / filename, dpi=dpi, facecolor=BG)
    plt.close(fig)
    return filename


def save_terminal(item, palette, out, dpi):
    state = item.get('terminal_state')
    if not state:
        return None
    samples = [{**s, 'tick': state['tick'], 'state': state, 'state_basis': 'stored native finalState',
                'clock_basis': 'one synchronized terminal-state tick'} for s in item['geometry']['samples']]
    result = subprocess.run(['node', '-e', NODE_GEOMETRY], input=json.dumps(dict(runtime=str(item['runtime'].resolve()), map=item['map'], samples=samples)),
                            text=True, capture_output=True, check=True)
    terminal = {**item, 'geometry': json.loads(result.stdout)}
    x = state['x']
    fig, ax = plt.subplots(figsize=(18, 9), facecolor=BG)
    fig.subplots_adjust(left=.04, right=.985, bottom=.08, top=.82)
    event = next((e for e in reversed(state.get('events', [])) if e.get('type') == 'death'), None)
    fig.suptitle(f"{item['slug']}  /  synchronized stored terminal state", x=.04, y=.96, ha='left', fontsize=19, color=INK, weight='bold')
    fig.text(.04, .899, f"Canonical geometry at tick {state['tick']} ({state['tick']/120:.3f}s). Full stored mechanism state. This panel is one simultaneous frame.", fontsize=10, color=MUTED)
    if event:
        fig.text(.04, .865, f"Recorded death: {event.get('id')} · event tick {event['tick']} (collision occurred during the preceding integration tick)", fontsize=10, color='#95492f')
    draw_panel(ax, terminal, palette, max(0, x-780), min(item['xmax'], x+420), detailed=True, show_title=False)
    ax.add_patch(Circle((state['x'], state['y']), 10, facecolor='#183749', edgecolor=BG, linewidth=.8, zorder=10))
    filename = f"terminal-{item['slug']}.png"
    fig.savefig(out / filename, dpi=dpi, facecolor=BG)
    plt.close(fig)
    (out / ('geometry-terminal-' + item['slug'] + '.json')).write_text(json.dumps(terminal['geometry'], indent=2)+'\n')
    return filename


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('maps', nargs='*', type=Path)
    parser.add_argument('--root', type=Path)
    parser.add_argument('--out', type=Path, default=HERE / 'visuals' / 'current')
    parser.add_argument('--runtime', type=Path, default=HERE / 'vendor' / 'flappy-runtime.js')
    parser.add_argument('--trace', help='Explicit trace (only with one map)')
    parser.add_argument('--states', help='Optional stored full-state snapshots')
    parser.add_argument('--clock', choices=('authored', 'measured'), default='authored')
    parser.add_argument('--horizon-s', type=float, help='Crop plots at this nominal time; default old timed maps: 32s')
    parser.add_argument('--detail', action='append', default=[], help='Slug substring to select details; default first two new maps')
    parser.add_argument('--dpi', type=int, default=130)
    args = parser.parse_args()
    discovered = sorted(args.root.rglob('map.json')) if args.root else []
    discovered = [p for p in discovered if not any(part.lower().startswith('diagnostic') for part in p.parts)]
    paths = args.maps + discovered
    if not paths:
        parser.error('Give map paths or --root containing map.json files')
    if args.trace and len(paths) != 1:
        parser.error('--trace requires one map')
    args.out.mkdir(parents=True, exist_ok=True)
    items = [load_item(path.resolve(), args) for path in paths]
    items.sort(key=lambda i: (i['slug'].startswith('holdout-'), i['map'].get('seed', 0), not i['slug'].startswith('baseline-')))
    palette = family_palette(items)
    save_contact(items, palette, args.out, args.dpi)
    new = sorted([item for item in items if item['map'].get('schema') != 'timed-course-120/v1'], key=lambda item: (not item['slug'].startswith('new-'), item['slug']))
    selected = [item for item in items if any(term in item['slug'] for term in args.detail)] if args.detail else (new or items)[:2]
    files = ['contact-sheet.png']
    if len(items) > 8:
        for i in range(0, len(items), 8):
            filename = f'contact-sheet-page-{i//8+1}.png'
            save_contact(items[i:i+8], palette, args.out, args.dpi, filename)
            files.append(filename)
    for item in selected:
        files += [save_detail(item, palette, args.out, args.dpi), save_seams(item, palette, args.out, args.dpi)]
        terminal = save_terminal(item, palette, args.out, args.dpi)
        if terminal:
            files.append(terminal)
    entries = []
    for item in items:
        geo_file = 'geometry-' + item['slug'] + '.json'
        (args.out / geo_file).write_text(json.dumps(item['geometry'], indent=2) + '\n')
        warnings = [dict(descriptor_id=s['descriptor_id'], tick=s['tick'], messages=s['warnings']) for s in item['geometry']['samples'] if s['warnings']]
        entries.append(dict(map=str(item['path']), sha256=sha(item['path']), seed=item['map'].get('seed'),
                            trace=str(item['trace_path']) if item['trace_path'] else None,
                            trace_sha256=sha(item['trace_path']) if item['trace_path'] else None,
                            trace_points=len(item['trace']), nominal_extent_s=item['duration'],
                            geometry=geo_file, warnings=warnings))
    manifest = dict(schema='combo-map-renderer/1', physics_reruns=0, clock=args.clock,
                    geometry_contract='Canonical E.obstacles evaluated separately at each descriptor arrival; not a simultaneous snapshot',
                    runtime=str(args.runtime), runtime_sha256=sha(args.runtime), files=files,
                    legend={'full_filled_circles':'solid whole-circle colliders, with no invented windows',
                            'navy_solid':'stored measured player trace', 'gold_dashed':'authored guide only',
                            'inactive_outline':'non-colliding at sampled clock; may be active at other times'},
                    family_palette=palette, maps=entries)
    (args.out / 'renderer-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps(dict(out=str(args.out), maps=len(items), files=files,
                          warnings=sum(len(e['warnings']) for e in entries), physics_reruns=0), indent=2))


if __name__ == '__main__':
    main()
