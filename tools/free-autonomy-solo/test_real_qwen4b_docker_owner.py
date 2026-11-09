"""No-Docker, no-model independent adversarial tests for V3 Docker ownership."""
import subprocess
import unittest
from unittest.mock import patch
import real_qwen4b_two_cumulative_ci as runner

TOKEN = '0123456789abcdef0123456789abcdef'
NAME = 'dec-qwen4b-two-cycles-' + TOKEN
CREATED_ID = 'a' * 64
FOREIGN_ID = 'b' * 64

def ok(out=''):
    return subprocess.CompletedProcess([], 0, stdout=out, stderr='')
def err():
    return subprocess.CompletedProcess([], 1, stdout='', stderr='not found')

class DockerOwnershipTests(unittest.TestCase):
    def run_case(self, responses, *, token=TOKEN, name=NAME, created_id=CREATED_ID):
        calls=[]
        it=iter(responses)
        def fake(args,**kwargs):
            calls.append(args)
            return next(it)
        with patch.object(runner.subprocess, 'run', side_effect=fake):
            result=runner._owned_container_cleanup_verified(name,token,created_id)
        self.assertEqual(len(calls),len(responses))
        return result,calls

    def test_owned_delete_by_start_id(self):
        result,c=self.run_case([ok(CREATED_ID+'|'+TOKEN),ok(),ok('')]);self.assertTrue(result)
        self.assertEqual(c[1],['docker','rm','-f',CREATED_ID])
    def test_same_label_wrong_id_never_deleted(self):
        result,c=self.run_case([ok(FOREIGN_ID+'|'+TOKEN)]);self.assertFalse(result)
        self.assertEqual(len(c),1)
    def test_foreign_label_never_deleted(self):
        result,c=self.run_case([ok(CREATED_ID+'|foreign')]);self.assertFalse(result)
        self.assertEqual(len(c),1)
    def test_no_start_id_name_present_holds(self):
        result,c=self.run_case([ok(FOREIGN_ID+'|'+NAME+'\n')],created_id=None);self.assertFalse(result)
        self.assertEqual(len(c),1);self.assertEqual(c[0][:3],['docker','container','ls'])
    def test_no_start_id_absent_no_deletion(self):
        result,c=self.run_case([ok('')],created_id=None);self.assertTrue(result)
        self.assertEqual(len(c),1);self.assertFalse(any('rm' in x for x in c))
    def test_forged_label_no_start_id_never_deleted(self):
        # Same label is insufficient evidence if docker run did not return an ID.
        result,c=self.run_case([ok(FOREIGN_ID+'|'+NAME+'\n')],created_id=None);self.assertFalse(result)
        self.assertNotIn('inspect',c[0]);self.assertFalse(any('rm' in x for x in c))
    def test_malformed_start_id_rejects_without_docker(self):
        result,c=self.run_case([],created_id='bad');self.assertFalse(result);self.assertFalse(c)
    def test_bad_name_and_bad_token_rejects_without_docker(self):
        self.assertFalse(self.run_case([],token='x')[0]);self.assertFalse(self.run_case([],name='other')[0])
    def test_inspect_failure_absence_proven(self):
        result,c=self.run_case([err(),ok('')]);self.assertTrue(result)
        self.assertFalse(any('rm' in x for x in c))
    def test_inspect_failure_name_present_holds(self):
        result,c=self.run_case([err(),ok(FOREIGN_ID+'|'+NAME+'\n')]);self.assertFalse(result)
        self.assertFalse(any('rm' in x for x in c))
    def test_remove_failure_holds(self):
        result,c=self.run_case([ok(CREATED_ID+'|'+TOKEN),err()]);self.assertFalse(result)
        self.assertEqual(c[1],['docker','rm','-f',CREATED_ID])
    def test_daemon_list_error_holds(self):
        result,c=self.run_case([err(),err()]);self.assertFalse(result)
    def test_name_reused_after_removal_holds(self):
        result,c=self.run_case([ok(CREATED_ID+'|'+TOKEN),ok(),ok(FOREIGN_ID+'|'+NAME+'\n')]);self.assertFalse(result)
    def test_inspect_id_invalid_holds(self):
        result,c=self.run_case([ok('not64hex|'+TOKEN)]);self.assertFalse(result)
    def test_renamed_owner_container_is_still_present(self):
        # \`docker rename\` changes the name, not immutable ID.
        result,c=self.run_case([err(),ok(CREATED_ID+'|renamed-owner-container\n')])
        self.assertFalse(result)
        self.assertFalse(any('rm' in x for x in c))
    def test_malformed_daemon_list_never_certifies_cleanup(self):
        result,c=self.run_case([err(),ok('garbled-output-without-id')])
        self.assertFalse(result)
    def test_unrelated_container_does_not_block_owner_cleanup(self):
        result,c=self.run_case([ok(CREATED_ID+'|'+TOKEN),ok(),ok(FOREIGN_ID+'|unrelated\n')])
        self.assertTrue(result)
        self.assertEqual(c[1],['docker','rm','-f',CREATED_ID])
    def test_docker_timeout_holds(self):
        with patch.object(runner.subprocess,'run',side_effect=subprocess.TimeoutExpired(['docker'],25)) as m:
            self.assertFalse(runner._owned_container_cleanup_verified(NAME,TOKEN,CREATED_ID))
        self.assertEqual(m.call_count,1)

if __name__=='__main__': unittest.main()
