import copy, json, tempfile, unittest
from pathlib import Path
from unittest.mock import patch
import dec_current_v6_private as m
from prepare_pinned_real_project import load_manifest

class CurrentV6Tests(unittest.TestCase):
 def test_immutable_old_and_current_v6_pin(self):
  old=load_manifest(); previous=copy.deepcopy(old)
  changed=m.profile(old)
  self.assertEqual(old,previous)
  self.assertEqual(changed['project_candidates']['minecraftaibuilder']['pinned_commit'],m.SOURCE_COMMIT)
  self.assertEqual(changed['project_candidates']['minecraftaibuilder']['source_blob_sha'],m.SOURCE_BLOB)
  self.assertEqual(changed['project_candidates']['browser-ink-tps'],old['project_candidates']['browser-ink-tps'])
  self.assertFalse(changed['allow_dockerless_untrusted_model_source_execution'])
 def test_refuses_permissions(self):
  old=load_manifest();old['allow_main_write']=True
  with self.assertRaises(ValueError):m.profile(old)
 def test_explicit_current_commit_only(self):
  class CP: pass
  good=CP();good.returncode=0;good.stdout=m.SOURCE_COMMIT+'\trefs/heads/'+m.SOURCE_BRANCH+'\n'
  self.assertTrue(m.current_source_commit(lambda *a,**kw:good))
  good.stdout='0'*40+'\trefs/heads/'+m.SOURCE_BRANCH+'\n'
  self.assertFalse(m.current_source_commit(lambda *a,**kw:good))
 def test_check_only_never_mutates(self):
  with tempfile.TemporaryDirectory() as t:
   with patch.object(m,'prepare',side_effect=AssertionError('CLONE_NOT_ALLOWED')):
    r,p=m.run_once(Path(t)/'future',real=False)
   self.assertEqual(r['status'],'CHECKED_NO_INFERENCE');self.assertIsNone(p)
   self.assertFalse((Path(t)/'future').exists())
 def test_no_windows_no_model(self):
  with tempfile.TemporaryDirectory() as t:
   r,p=m.run_once(Path(t)/'future',real=True,platform_name='posix')
   self.assertEqual(r['status'],'HOLD_WINDOWS_ONLY_NO_MODEL_CALL')
 def test_missing_docker_prevents_clone_or_model(self):
  with tempfile.TemporaryDirectory() as t:
   with patch.object(m,'qa_image_preflight',side_effect=RuntimeError('MOCK_DOCKER_NOT_INSTALLED')),patch.object(m,'prepare',side_effect=AssertionError('NO_GIT')),patch.object(m,'execute',side_effect=AssertionError('NO_MODEL')):
    r,p=m.run_once(Path(t)/'future',real=True,platform_name='nt')
   self.assertEqual(r['status'],'HOLD_DOCKER_QA_UNAVAILABLE_NO_MODEL_CALL')
   self.assertEqual(r['local_model_requests_by_this_wrapper'],0)
 def test_source_drift_no_clone(self):
  with tempfile.TemporaryDirectory() as t:
   with patch.object(m,'qa_image_preflight',return_value=None),patch.object(m,'current_source_commit',return_value=False),patch.object(m,'prepare',side_effect=AssertionError('NO_GIT')):
    r,p=m.run_once(Path(t)/'future',real=True,platform_name='nt')
   self.assertEqual(r['status'],'HOLD_CURRENT_SOURCE_MOVED_OR_OFFLINE_NO_MODEL_CALL')
 def test_no_model_on_failed_admission_and_safe_receipt(self):
  with tempfile.TemporaryDirectory() as t:
   with patch.object(m,'qa_image_preflight',return_value=None),patch.object(m,'current_source_commit',return_value=True),patch.object(m,'prepare',return_value={'status':'HOLD'}),patch.object(m,'execute',side_effect=AssertionError('NO_MODEL')):
    r,p=m.run_once(Path(t)/'future',real=True,platform_name='nt')
   self.assertEqual(r['status'],'HOLD_PINNED_SOURCE_CLONE_NO_MODEL_CALL')
   self.assertEqual(json.loads(p.read_text()),r)
 def test_success_keeps_private_unpublished(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);repo=root/'repo';repo.mkdir()
   f={'status':'REAL_SOURCE_CLONE_PINNED_READONLY_READY','private_workspace_path':str(repo)}
   with patch.object(m,'qa_image_preflight',return_value=None),patch.object(m,'current_source_commit',return_value=True),patch.object(m,'prepare',return_value=f),patch.object(m,'verify_repo',return_value=None),patch.object(m,'run_in_docker',return_value=(0,'')),patch.object(m,'execute',return_value={'status':'SOURCE_ONLY_TASK_QUEUE_DONE','cycles':2,'commits':[{'sha':'a'}]}) as call:
    r,p=m.run_once(root/'private',real=True,platform_name='nt')
   self.assertEqual(r['status'],'PRIVATE_SOURCE_QA_PASSED_ART_HOLD')
   self.assertEqual(r['private_verified_commits'],1)
   self.assertEqual(r['public_model_source_pushes'],0)
   self.assertEqual(call.call_args.kwargs['push'],False)
   self.assertEqual(json.loads(p.read_text()),r)
   self.assertNotIn(str(root),p.read_text())
 def test_draft_only_one_model_no_docker_or_source_execution(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);repo=root/'repo';(repo/'source/ai').mkdir(parents=True)
   (repo/m.SOURCE_FILE).write_text('const a=1;\n')
   admission={'status':'REAL_SOURCE_CLONE_PINNED_READONLY_READY','private_workspace_path':str(repo)}
   with patch.object(m,'qa_image_preflight',side_effect=AssertionError('DRAFT_MUST_NOT_NEED_DOCKER')),patch.object(m,'current_source_commit',return_value=True),patch.object(m,'prepare',return_value=admission),patch.object(m,'verify_repo',return_value=None),patch.object(m,'changed_files',return_value=[]),patch.object(m,'execute',side_effect=AssertionError('DRAFT_MUST_NOT_RUN_UNTRUSTED_SOURCE')),patch.object(m,'propose_once',return_value=({'find':'a=1','replace':'a=2'},{})) as prop:
    result,receipt=m.run_once(root/'private',real=True,draft_only=True,platform_name='nt')
   self.assertEqual(result['status'],'PRIVATE_ONE_MODEL_PATCH_DRAFT_NO_QA_ART_HOLD')
   self.assertEqual(result['private_drafts_not_qa_verified'],1)
   self.assertEqual(result['private_verified_commits'],0)
   self.assertEqual(result['public_model_source_pushes'],0)
   self.assertEqual((repo/m.SOURCE_FILE).read_text(),'const a=1;\n')
   self.assertEqual(len(list(receipt.parent.glob('V6_UNVERIFIED_SOURCE_PRIVATE.txt'))),1)
   self.assertEqual(prop.call_count,1)
   self.assertNotIn('a=2',receipt.read_text())
 def test_draft_only_rejects_ambiguous_model_span_without_output(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);repo=root/'repo';(repo/'source/ai').mkdir(parents=True)
   (repo/m.SOURCE_FILE).write_text('const a=1; const a=1;\n')
   admission={'status':'REAL_SOURCE_CLONE_PINNED_READONLY_READY','private_workspace_path':str(repo)}
   with patch.object(m,'current_source_commit',return_value=True),patch.object(m,'prepare',return_value=admission),patch.object(m,'verify_repo',return_value=None),patch.object(m,'propose_once',return_value=({'find':'a=1','replace':'a=2'},{})):
    result,receipt=m.run_once(root/'private',real=True,draft_only=True,platform_name='nt')
   self.assertEqual(result['status'],'HOLD_MODEL_DRAFT_INVALID_NO_EXECUTION')
   self.assertFalse((receipt.parent/'V6_UNVERIFIED_SOURCE_PRIVATE.txt').exists())
   self.assertEqual(result['private_verified_commits'],0)
 def test_error_does_not_leak_private_path(self):
  with tempfile.TemporaryDirectory() as t:
   root=Path(t);repo=root/'repo';repo.mkdir()
   f={'status':'REAL_SOURCE_CLONE_PINNED_READONLY_READY','private_workspace_path':str(repo)}
   with patch.object(m,'qa_image_preflight',return_value=None),patch.object(m,'current_source_commit',return_value=True),patch.object(m,'prepare',return_value=f),patch.object(m,'verify_repo',return_value=None),patch.object(m,'run_in_docker',side_effect=RuntimeError('C:\\Users\\private\\password')):
    r,p=m.run_once(root/'private',real=True,platform_name='nt')
   self.assertEqual(r['status'],'HOLD_PRIVATE_V6_NO_PUBLICATION')
   self.assertEqual(r['reason_code'],'RUNTIMEERROR')
   self.assertNotIn('password',p.read_text())
if __name__=='__main__':unittest.main()
