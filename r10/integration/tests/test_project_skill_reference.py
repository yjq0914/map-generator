import contextlib,hashlib,io,json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
import sys
HERE=Path(__file__).resolve().parents[1];sys.path.insert(0,str(HERE))
import stage_pressure_panel as panel

class ProjectSkillReferenceTests(unittest.TestCase):
 def test_read_reference_tracks_actual_body_and_preserves_old_snapshot(self):
  with tempfile.TemporaryDirectory() as d:
   root=Path(d);here=root/'integration';here.mkdir();runs=here/'runs';runs.mkdir()
   skill=root/'SKILL.md';skill.write_text('A selected timing reference; unused axes are optional.\n')
   with patch.object(panel,'HERE',here),patch.object(panel,'ROOT',runs):
    with contextlib.redirect_stdout(io.StringIO()) as output:r=panel.read_reference(1,True)
    self.assertIn(skill.read_text(),output.getvalue());self.assertEqual(r['sha256'],hashlib.sha256(skill.read_bytes()).hexdigest())
    old=root/r['snapshot'];self.assertEqual(old.read_text(),skill.read_text())
    skill.write_text('A revised sustained-precision reference only.\n');new=panel.read_reference(1)
    self.assertNotEqual(new['snapshot'],r['snapshot']);self.assertEqual(old.read_text(),'A selected timing reference; unused axes are optional.\n')
    self.assertEqual((root/new['snapshot']).read_text(),skill.read_text())
    self.assertEqual(panel.read_reference(1),new)
 def test_exported_project_guide_is_real_and_legacy_entry_resolves(self):
  import combo_library as lib
  result=lib.index_data({})
  guide=HERE.parent/result['layers']['skill_scripts']['guide']
  self.assertTrue(guide.is_file());self.assertEqual(guide.name,'SKILL.md')
  self.assertIn('(SKILL.md)',(HERE.parent/'SKILL.zh-CN.md').read_text())
