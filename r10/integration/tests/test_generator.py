import copy, importlib.util, json, math, pathlib, sys, unittest
HERE=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(HERE))
import generator as G

class GeneratorTests(unittest.TestCase):
 def test_explicit_experimental(self):
  with self.assertRaisesRegex(ValueError,'experimental'):G.build()
 def test_policy_recursive(self):
  for nested in [{'mechanic_kind':'suction_core'},{'components':[{'mechanics':['push_pulse_core']}]}]:
   with self.assertRaises(ValueError):G.eligibility.require_mechanics(nested)
 def test_provider_hashes_and_variants(self):
  for family in ['cloister','slider-island','spring-reception','light-cavity']:
   a=G.fragment(family);b=G.fragment(family,'alternate')
   self.assertNotEqual(G.digest(a['map']),G.digest(b['map']))
   self.assertFalse(a['metadata']['qualification_transferred'])
 def test_phase_translation(self):
  f=G.fragment('slider-island');o=next(o for o in f['map']['obstacles'] if o['motion']);dx=783.;dt=dx/150
  n=G.translate(o,dx,dt,'m99');p=o['motion'];q=n['motion']
  for t in [0,1.5,6.7]:
   self.assertAlmostEqual(p['amplitude_px']*math.sin(t*2*math.pi/p['period_s']+p['phase_rad']),q['amplitude_px']*math.sin((t+dt)*2*math.pi/q['period_s']+q['phase_rad']))
 def test_gate_origin_only(self):
  f=G.fragment('light-cavity');o=f['map']['obstacles'][-1];n=G.translate(o,600,4,'m99')
  self.assertEqual(n['timeline']['start_s'],o['timeline']['start_s']+4)
  for k in ['warning_s','opening_s','hold_s','closing_s','cooldown_s']:self.assertEqual(n['timeline'][k],o['timeline'][k])
 def test_actual_full_map_and_reproducibility(self):
  a=G.build(701,experimental=True);b=G.build(701,experimental=True)
  self.assertEqual(a,b);self.assertLessEqual(a['width'],5000);self.assertLessEqual(len(a['obstacles']),40)
  self.assertGreaterEqual((a['width']-60)/150,30)
  self.assertGreaterEqual(len({m['family'] for m in a['integration']['modules']}),4)
  self.assertEqual(len({o['id'] for o in a['obstacles']}),len(a['obstacles']))
  self.assertNotIn('initial_player',a)
  self.assertTrue(any(o['mechanic_kind']=='fixed_armor_or_spike' for o in a['obstacles']))
  for s in a['integration']['seams']:self.assertIsNone(s['qualified_state_box']);self.assertGreater(s['spatial_reserve_px'],0)
 def test_theme_changes_choice(self):
  choices=[]
  for theme in G.THEMES:
   m=G.build(701,theme=theme,experimental=True)
   choices.append(tuple(x['family'] for x in m['integration']['modules']))
  self.assertGreater(len(set(choices)),1)
 def test_difficulty_changes_geometry(self):
  a=G.build(701,difficulty='easy',experimental=True);b=G.build(701,difficulty='hard',experimental=True)
  self.assertNotEqual(G.digest(a['obstacles']),G.digest(b['obstacles']))
 def test_no_intermediate_state_reset(self):
  m=G.build(703,experimental=True)
  self.assertNotIn('intervention',m);self.assertNotIn('checkpoints',m)
  for module in m['integration']['modules']:
   actual=[o for o in m['obstacles'] if o['id'] in module['body_ids']]
   self.assertEqual(len(actual),len(module['body_ids']))
 def test_unsupported_duration_no_truncation(self):
  with self.assertRaises(ValueError):G.build(701,40,experimental=True)
if __name__=='__main__':unittest.main()
