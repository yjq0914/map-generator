import unittest,json,hashlib
from pathlib import Path
HERE=Path(__file__).resolve().parents[1]
class StagePressureContract(unittest.TestCase):
 def test_fixed_controller_runtime(self):
  for name,h in [('diagnostic.cjs','b97537cfc5e50fb43f8bd517d1c59be8d1038590069d434dab46cc79fbc26fb5'),('vendor/flappy-runtime.js','58c19ff5f258bfc05ff2a4b1b9f8edbbf7742fc57fa1c0c294b1ddfda668e987')]:
   self.assertEqual(hashlib.sha256((HERE/name).read_bytes()).hexdigest(),h)
 def test_preregistered_maps_and_requests(self):
  for p in (HERE/'runs/stage-pressure').glob('B*/*-manifest.json'):
   m=json.loads(p.read_text());self.assertEqual(len(m['entries']),8)
   self.assertEqual(len({x['seed'] for x in m['entries']}),8)
   for x in m['entries']:
    self.assertEqual(x['horizonTicks'],3600)
    self.assertEqual(hashlib.sha256((p.parent/x['mapFile']).read_bytes()).hexdigest(),x['mapFileSHA256'])
  for p in (HERE/'runs/stage-pressure').glob('B*/candidate-manifest.json'):
   a=json.loads(p.read_text());b=json.loads((p.parent/'baseline-manifest.json').read_text())
   self.assertEqual([x['request'] for x in a['entries']],[x['request'] for x in b['entries']])
 def test_harness_has_no_direct_physics_or_state_edits(self):
  s=(HERE/'stage_pressure_run.cjs').read_text()
  for token in ['createState(', 'runtime.step', 'restore(', 'state.y =']:
   self.assertNotIn(token,s)
