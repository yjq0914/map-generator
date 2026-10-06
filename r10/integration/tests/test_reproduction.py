import json,pathlib,sys,unittest
HERE=pathlib.Path(__file__).resolve().parents[1];sys.path.insert(0,str(HERE));import generator as G
class Reproduction(unittest.TestCase):
 def test_saved_targeted_maps_reproduce(self):
  palette=['cloister','slider-island','spring-reception','tidal-staircase']
  for seed,difficulty,theme in [(701,'easy','arcade'),(708,'medium','foundry'),(2701,'medium','arcade'),(2703,'medium','signal')]:
   m=G.build(seed,31.5,difficulty,theme,experimental=True,revision=3,holdout=seed>2000,families=palette if seed!=2703 else None)
   saved=json.loads((HERE/f'evidence/L2B/runs/new-{seed}/map.json').read_text())
   self.assertEqual(m,saved)
 def test_macro_maps_reproduce(self):
  for seed,theme,palette in [(3701,'arcade',['cloister','slider-island','spring-reception','tidal-staircase']),(3703,'signal',None)]:
   m=G.build(seed,120,'medium',theme,experimental=True,revision=3,holdout=True,families=palette)
   saved=json.loads((HERE/f'evidence/L3/runs/macro-{seed}/map.json').read_text());self.assertEqual(m,saved)
   self.assertEqual(m['macroPlan'][0]['startTick'],0);self.assertEqual(m['macroPlan'][-1]['endTick'],14400)
 def test_explicit_palette_and_intent_disclosure(self):
  with self.assertRaises(ValueError):G.build(experimental=True,families=['cloister'])
  m=G.build(701,theme='signal',actions=['nonexistent-action'],experimental=True)
  self.assertEqual(m['integration']['plan']['unmatched_requested_actions'],['nonexistent-action'])
if __name__=='__main__':unittest.main()
