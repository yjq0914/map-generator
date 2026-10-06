"""Reproduce report figures from stored native evidence; no physics."""
import gzip
import hashlib
import json
from pathlib import Path
import sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / 'integration'))
from audit_action_quality import sampled_clearance, trace_rows

OUTPUT = Path(__file__).resolve().parent
AUDIT = json.loads((OUTPUT.parent / 'FINAL-STAGE-AUDIT.json').read_text())
for record in AUDIT['maps']:
    if not record['id'].startswith('macro-'):
        continue
    source = ROOT / record['evidence']['source_directory']
    native = json.loads((source / 'map.json').read_text())
    trace = json.loads(gzip.decompress((source / 'trace.json.gz').read_bytes()))
    rows = trace_rows(trace)
    clearance = sampled_clearance(trace, rows, native)['series']
    times = [row['tick'] / 120 for row in rows]
    fig, axes = plt.subplots(5, 1, figsize=(16, 11), sharex=True,
        gridspec_kw={'height_ratios': [2.3, 1.2, 1.5, .75, .7]}, layout='constrained')
    fig.suptitle(f"{record['id']} · one native 120s world · intended 40s thirds\n"
                 'Saved proximity and phase samples are not safety bounds or input tolerances', fontsize=14, weight='bold')
    for i, color in enumerate(['#d9e8ed', '#efe5ce', '#e8ddee']):
        for axis in axes:
            axis.axvspan(i * 40, (i + 1) * 40, color=color, alpha=.45)
            axis.grid(axis='y', alpha=.2)
        stage = record['elapsed_time_stages'][i]
        axes[0].text(i * 40 + 1, 32,
            f"Stage {i+1}: {stage['cadence']['flaps_per_s']:.3f} flaps/s · "
            f"{stage['major_movement_by_threshold_px']['60']['reversals']} major reversals", fontsize=9)
    axes[0].plot(times, [row['y'] for row in rows], color='#173c4c', lw=.85)
    axes[0].set_ylim(540, 0)
    axes[0].set_ylabel('Native y (px, down +)')
    for event in record['whole_trace']['major_movement_by_threshold_px']['60']['events']:
        axes[0].scatter(event['tick'] / 120, event['y'],
                        marker='v' if event['direction'] == 'down' else '^', s=9, color='#995522')
    axes[1].plot(times, [row['vy'] for row in rows], color='#695c94', lw=.6)
    axes[1].axhline(0, lw=.5, color='#999')
    axes[1].set_ylabel('Native vy (px/s)')
    axes[2].plot([point['time_s'] for point in clearance],
                 [point['minimum_clearance_px'] for point in clearance], color='#34765c', lw=.75)
    axes[2].axhline(0, lw=.7, color='#b25044')
    axes[2].set_ylabel('Sampled clearance (px)')
    for run in record['whole_trace']['cadence']['equal_cadence_runs']:
        axes[3].plot([run['start_tick'] / 120, run['end_tick'] / 120], [.3, .3], color='#a0834a', lw=4)
    axes[3].scatter([tick / 120 for tick in trace['flapTicks']], [1] * len(trace['flapTicks']),
                    marker='|', s=22, color='#315d75')
    axes[3].set_yticks([.3, 1], ['Equal cadence', 'Actual flaps'])
    axes[3].set_ylim(0, 1.3)
    for body in record['timed_body_observations']:
        for frame in body['saved_phase_samples']:
            if body['kind'] == 'laser_scanner' and 'active' in frame['phases']:
                axes[4].scatter(frame['tick'] / 120, 1.2, s=6, color='#a8454d')
            if body['kind'] == 'timed_armor_gate' and 'closing' in frame['phases']:
                axes[4].scatter(frame['tick'] / 120, .4, s=6, color='#a67c22')
    axes[4].set_yticks([.4, 1.2], ['Gate closing', 'Laser active'])
    axes[4].set_ylim(0, 1.6)
    axes[4].set_xlim(0, 120)
    axes[4].set_xlabel('Native elapsed time (s) · dots: saved occupied-body phases · triangles: confirmed 60px movement', fontsize=10)
    fig.savefig(OUTPUT / f"{record['id']}-three-stage-overlay.png", dpi=120)
    plt.close(fig)
manifest = json.loads((OUTPUT / 'MANIFEST.json').read_text())
manifest['plots'] = {path.name: hashlib.sha256(path.read_bytes()).hexdigest() for path in sorted(OUTPUT.glob('*.png'))}
manifest['overlay_renderer_sha256'] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
(OUTPUT / 'MANIFEST.json').write_text(json.dumps(manifest, indent=2) + '\n')
