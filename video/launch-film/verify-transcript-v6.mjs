// Run narration-words.py on the selected take and the encoded portrait master first.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {say,VOICE} from './app-pacing-v6.mjs';
const root=import.meta.dirname;
function tokens(text){
  return text.toLowerCase().replace(/two thousand/g,'2 000').replace(/\b2000\b/g,'2 000').replace(/,000/g,' 000')
    .replace(/repeatai/g,'repeat ai dot').replace(/colour/g,'color').replace(/-/g,' ').replace(/'/g,'').match(/[a-z0-9]+/g)||[];
}
function load(file){return JSON.parse(readFileSync(path.join(root,'out',file))).flatMap(word=>tokens(word.word).map(token=>({token,start:word.start,end:word.end})));}
const expected=tokens(readFileSync(path.join(root,'dialogue-natural-v6.txt'),'utf8'));
const source=load(VOICE.file.replace('.mp3','.words.json'));
const master=load('repeat-ai-app-film-v6-9x16.words.json');
assert.deepEqual(source.map(word=>word.token),expected,'Original take transcript');
assert.deepEqual(master.map(word=>word.token),expected,'Encoded master transcript');
// Whisper sometimes anchors the first token to 0 despite the leading silence.
// Check drift on the remaining words rather than treating that as a real edit.
const errors=master.slice(3).map((word,index)=>Math.abs(word.start-say(source[index+3].start))).sort((a,b)=>a-b);
const p95=errors[Math.floor(errors.length*.95)];
const maximum=errors.at(-1);
assert.ok(p95<.35,`Speech alignment p95: ${p95}`);
assert.ok(maximum<.8,`Speech alignment max: ${maximum}`);
const report={passed:true,words:expected.length,normalisations:['colour/color','two thousand/2000/2,000','spoken URL/ASR joined domain','apostrophe formatting'],p95Seconds:p95,maxSeconds:maximum,firstThreeTokensExcludedFromTiming:true};
writeFileSync(path.join(root,'out/transcript-checks-v6.json'),JSON.stringify(report,null,2));
console.log(`All ${expected.length} spoken tokens recovered; alignment p95 ${p95.toFixed(3)}s, max ${maximum.toFixed(3)}s.`);
