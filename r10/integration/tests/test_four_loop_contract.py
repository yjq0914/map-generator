import unittest,json,hashlib
from pathlib import Path
HERE=Path(__file__).resolve().parents[1]
class FourLoopContract(unittest.TestCase):
 def test_runtime_frozen(self):
  self.assertEqual(hashlib.sha256((HERE/'vendor/flappy-runtime.js').read_bytes()).hexdigest(),'58c19ff5f258bfc05ff2a4b1b9f8edbbf7742fc57fa1c0c294b1ddfda668e987')
 def test_committed_arms_preregistered(self):
  for p in (HERE/'runs/four-loops').glob('B*/*-manifest.json'):
   m=json.loads(p.read_text());self.assertEqual(len(m['entries']),8)
   self.assertEqual(len({r['seed'] for r in m['entries']}),8)
   for r in m['entries']:
    self.assertEqual(r['horizonTicks'],3600)
    self.assertEqual(hashlib.sha256((p.parent/r['mapFile']).read_bytes()).hexdigest(),r['mapFileSHA256'])
 def test_panel_paired_requests(self):
  for p in (HERE/'runs/four-loops').glob('B*/candidate-manifest.json'):
   a=json.loads((p.parent/'baseline-manifest.json').read_text());b=json.loads(p.read_text())
   self.assertEqual([x['request'] for x in a['entries']],[x['request'] for x in b['entries']])
 def test_no_native_reset_in_new_harness(self):
  s=(HERE/'four_loop_run.cjs').read_text()
  self.assertNotIn('createState(',s);self.assertNotIn('runtime.step',s)
if __name__=='__main__':unittest.main()
