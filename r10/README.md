# Experimental pressure-aware combo maps

Current generator default: revision10, still explicit experimental. Start design/review work with [SKILL.md](SKILL.md), a selectable and revisable pressure/rhythm reference, not a mandatory six-axis checklist or a restored historical full skill. The legacy SKILL.zh-CN.md entry redirects to it.

The active four-loop batch lives in `integration/runs/stage-pressure/`. All four loops are complete and frozen. r10 macro7701 and macro7703 each completed one actual120-second native world; two predeclared full short tails completed too. These are exact witnesses, not general safety or human-fun proofs. Start with `integration/runs/stage-pressure/REPORT.zh-CN.md` and `FINAL-SUMMARY.json`. Previous r7 evidence stays historical.

```sh
python3 integration/stage_pressure_panel.py read-reference 4
python3 integration/generator.py --experimental --revision 10 --seed 7703 --duration 120 --difficulty medium --theme signal --holdout --out /tmp/new-map.json
python3 -m unittest discover -s integration/tests -p 'test_*.py' -v
node --test integration/tests/*.cjs
```

Generation needs Python standard library and Node20+; plots additionally use matplotlib. Ordinary short requests are30..32.9s;120s uses one native timed world. No site publishing, physics changes, mid-world resets, new qualification or human-fun claim.

History: `integration/runs/four-loops/` preserves the previous frozen r7 batch; `integration/README.md` and older reports are historical. `integration/runs/stage-pressure/SKILL-SOURCE-AUDIT.json` limits lineage claims: the current recovery subset omitted the old guide, and the new project reference is not recovery of all earlier skill experience.

Known recovery gap: `combo_library.py select` cannot run without missing `schemas/candidate.schema.json` and the complete original archive. The experimental generator works from its bundled providers; this subset is not the complete historical library or cumulative generating skill.
