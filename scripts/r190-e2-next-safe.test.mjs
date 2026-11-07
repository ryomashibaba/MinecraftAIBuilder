import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const cmd=fs.readFileSync(new URL('../RUN_E2_NEXT_SAFE.cmd',import.meta.url),'utf8');
test('E2 Windows launcher enforces branch, clean tree, safe sync, offline tests then one request',()=>{
 const idx=s=>{const i=cmd.indexOf(s);assert(i>=0,'missing '+s);return i;};
 const branch=idx('if /i not "%CURRENT_BRANCH%"=="%EXPECTED_BRANCH%" goto stop');
 const clean=idx('if defined DIRTY goto stop');
 const ff=idx('git merge --ff-only FETCH_HEAD');
 const test=idx('node --test scripts');
 const model=idx('node scripts\\r190-e2-qwen-study.mjs');
 assert(branch<clean&&clean<ff&&ff<test&&test<model);
 assert.equal(cmd.split('node scripts\\r190-e2-qwen-study.mjs').length-1,1);
 assert(cmd.includes('E2_CHAT_HANDOFF.json'));
 assert(cmd.includes('git status --porcelain --untracked-files=no'));
 assert(!cmd.includes('git reset --hard'));
 assert(!cmd.includes('git push'));
 assert(!cmd.includes('mabbuild'));
});
