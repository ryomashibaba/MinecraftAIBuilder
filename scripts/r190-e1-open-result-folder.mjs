/**
 * GUI convenience only: open the folder CONTAINING an already-written E1 report.
 * Invoked exclusively by directly run CLI entrypoints, never library functions,
 * tests, source compilation, Minecraft, or the LLM request path.
 */
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';

export function openE1ResultFolder(reportFile,{
 platform=process.platform,
 enabled=process.env.MAB_NO_AUTO_OPEN!=='1',
 launch=spawn,
 exists=fs.existsSync,
 warn=message=>console.warn(message)
}={}){
 if(!enabled)return {attempted:false,reason:'DISABLED'};
 if(platform!=='win32')return {attempted:false,reason:'NON_WINDOWS'};
 if(typeof reportFile!=='string'||!path.isAbsolute(reportFile)||!exists(reportFile))
  return {attempted:false,reason:'REPORT_NOT_FOUND'};
 const folder=path.dirname(reportFile);
 try{
  // No shell, no string-interpolated command: Windows paths (including spaces)
  // are passed as one argument. Explorer is fire-and-forget.
  const child=launch('explorer.exe',[folder],{
   detached:true,stdio:'ignore',windowsHide:false,shell:false
  });
  if(typeof child?.on==='function'){
   child.on('error',e=>warn('E1 folder open failed: '+String(e?.message??e)));
  }
  if(typeof child?.unref==='function')child.unref();
  return {attempted:true,folder};
 }catch(e){
  warn('E1 folder open failed: '+String(e?.message??e));
  return {attempted:false,reason:'EXPLORER_LAUNCH_FAILED',folder};
 }
}
