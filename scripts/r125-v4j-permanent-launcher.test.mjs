import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const cmd=fs.readFileSync('scripts/r125-v4j-permanent-launcher.cmd','utf8');
test('one reusable local launcher checks exact SHA and both CI before Qwen',()=>{
 assert(cmd.includes('r125-v4j-safe-ci-gate.mjs'));
 assert(cmd.includes('r125-v4j-current-pilot.mjs'));
 assert(cmd.indexOf('r125-v4j-safe-ci-gate.mjs" "%MAB_HEAD%"')<
  cmd.indexOf('r125-v4j-current-pilot.mjs" --model'));
 assert(!cmd.includes('choice /C YN'));
 assert(cmd.includes('Your double-click authorizes ONE local Qwen research model request.'));
 assert(cmd.includes('if errorlevel 1 goto CI_HOLD'));
 assert(cmd.includes('V4J_CURRENT_SAFE_REPORT.json'));
 assert(cmd.includes('Set-Clipboard'));
 assert(cmd.includes('GIT_LFS_SKIP_SMUDGE=1'));
 assert(cmd.includes('git.exe -c credential.interactive=never clone'));
 assert(cmd.includes('feature/b198zr1-protected-architectural-revision'));
});
test('no production world, git pushes, raw sharing, model auto-download or private study deletion',()=>{
 for(const forbidden of ['git push','gh pr merge','git reset','ollama pull',
  'Invoke-WebRequest','MODEL_RESPONSE_ORIGINAL.txt','rd /s /q "%PRIVATE_ROOT%"']){
  assert(!cmd.includes(forbidden),forbidden);
 }
 assert(cmd.includes('if not exist "%V4J_SAFE_FILE%" goto NO_SAFE_OUTPUT'));
 assert(cmd.includes('PRIVATE studies stay'));
});

test('safe-report recovery does not convert SOURCE HOLD into exit code zero',()=>{
 const guard='if not "%MODEL_EXIT%"=="0" goto DONE';
 assert.equal(cmd.split(guard).length-1,2);
 assert.equal(cmd.split('set "FINAL_EXIT=0"').length-1,2);
 assert(cmd.indexOf('set "MODEL_EXIT=%ERRORLEVEL%"')<cmd.indexOf(guard));
 assert(cmd.indexOf('V4J_CURRENT_SAFE_REPORT.json')<cmd.indexOf(guard));
 assert(cmd.includes('if not exist "%V4J_SAFE_FILE%" goto NO_SAFE_OUTPUT'));
});


test('owned civic V6 route is explicit, research only, and never touches default launcher mode',()=>{
 assert(cmd.includes('MAB_V6_CIVIC_RESEARCH_OPT_IN'));
 assert(cmd.includes('research/r125-v6-readonly-facade-diagnostic-20261111'));
 assert(cmd.includes('--v7-civic-v6'));
 assert(cmd.includes('goto CONFLICTING_OPT_IN'));
 assert(cmd.indexOf('r125-v4j-safe-ci-gate.mjs" "%MAB_HEAD%"')<
  cmd.indexOf('r125-v4j-current-pilot.mjs" --model'));
 assert(cmd.includes('PRIVATE owner stop and monitor are mandatory'));
 assert(cmd.includes('if /I "%MAB_V7_OPT_IN%"=="1" ('));
});
