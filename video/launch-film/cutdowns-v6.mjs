// Frame-accurate cutdowns from the completed master; decode trims avoid
// keyframe/preroll errors caused by stream-copy seeking.
import {spawnSync} from 'node:child_process';
import {existsSync,renameSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {CUTDOWNS,say,DURATION,P4} from './app-pacing-v6.mjs';

const out=path.resolve(import.meta.dirname,'out');
const master=path.join(out,'repeat-ai-app-film-v6-9x16.mp4');
if(!existsSync(master))throw new Error('Render the portrait master first.');
const results=[];

for(const cut of CUTDOWNS){
  const ranges=[];
  // Preserve short natural paragraph gaps and the intentional status demo room.
  for(const segment of cut.segments){
    const previous=ranges.at(-1);
    if(previous&&segment.vStart-previous.vEnd<=1)previous.vEnd=segment.vEnd;
    else ranges.push({...segment});
  }
  const clips=ranges.map(segment=>{
    const start=segment.vStart===0?0:Math.max(0,say(segment.vStart)-.1);
    let end=say(segment.vEnd)+.12;
    // The status bridge ends exactly at the NEXT paragraph's first word.
    // Stop safely before that word rather than adding unwanted "Then...".
    if(Math.abs(say(segment.vEnd)-P4.at)<.01)end=P4.at-.12;
    if(segment.vStart>=84)end=DURATION; // full CTA and music tail
    return {start,end,duration:end-start};
  });
  const filters=[];
  clips.forEach((clip,index)=>{
    filters.push(`[0:v]trim=start=${clip.start}:end=${clip.end},setpts=PTS-STARTPTS[v${index}]`);
    filters.push(`[0:a]atrim=start=${clip.start}:end=${clip.end},asetpts=PTS-STARTPTS,afade=t=in:d=0.01,afade=t=out:st=${Math.max(0,clip.duration-.01)}:d=0.01[a${index}]`);
  });
  filters.push(clips.map((_,index)=>`[v${index}][a${index}]`).join('')+`concat=n=${clips.length}:v=1:a=1[v][a]`);
  const final=path.join(out,`repeat-ai-${cut.id}-v6-9x16.mp4`);
  const temporary=final.replace(/\.mp4$/,'-next.mp4');
  const render=spawnSync('ffmpeg',['-y','-v','error','-i',master,'-filter_complex',filters.join(';'),'-map','[v]','-map','[a]',
    '-r','30','-c:v','libx264','-preset','fast','-crf','16','-pix_fmt','yuv420p','-c:a','aac','-b:a','256k','-ar','48000','-ac','2','-movflags','+faststart',temporary],{maxBuffer:4*1024*1024});
  if(render.status!==0)throw new Error(render.stderr?.toString()||'Cutdown encode failed');
  renameSync(temporary,final);
  const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',final]);
  if(probe.status!==0)throw new Error(probe.stderr?.toString()||'Cutdown probe failed');
  const duration=Number(probe.stdout.toString().trim());
  const expected=clips.reduce((total,clip)=>total+clip.duration,0);
  if(Math.abs(duration-expected)>.1)throw new Error(`${cut.id}: unexpected duration ${duration}/${expected}`);
  const decode=spawnSync('ffmpeg',['-v','error','-i',final,'-f','null','-']);
  if(decode.status!==0||decode.stderr.length)throw new Error(decode.stderr?.toString()||'Cutdown decode failed');
  results.push({id:cut.id,file:final,duration,clips,decodePassed:true});
  console.log(`${cut.id}: ${duration.toFixed(3)}s, frame-accurate encode and full decode passed`);
}
writeFileSync(path.join(out,'cutdown-checks-v6.json'),JSON.stringify(results,null,2));
