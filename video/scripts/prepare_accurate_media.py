"""Prepare actual Codex Chrome captures as frame-timed editorial clips."""
from pathlib import Path
import shutil,subprocess,json
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'video/assets/accurate'
PUB=BASE/'public'
def main():
 PUB.mkdir(parents=True,exist_ok=True)
 assets={
  ROOT/'public/brand/repeat-ai-logo.png':'logo.png',
  ROOT/'video/assets/minimal/public/video/repeat-ai-minimal/inter.woff2':'inter.woff2',
  ROOT/'video/assets/minimal/public/video/repeat-ai-minimal/architecture.png':'architecture.png',
  ROOT/'video/assets/september-rebuild/sources/native-iphone-sept13.png':'native-iphone.png',
 }
 for source,name in assets.items():shutil.copy2(source,PUB/name)
 for file in (BASE/'captures').glob('*.png'):shutil.copy2(file,PUB/file.name)
 rates={'spreadsheet-search':6,'burj-listings':6,'price-history':8,'template-edit':7,'schedule-search':7}
 info={}
 for name,rate in rates.items():
  take=BASE/'captures'/('spreadsheet-search-final' if name=='spreadsheet-search' else name)
  extension='jpg'
  count=len(list(take.glob('*.'+extension)))
  subprocess.run(['ffmpeg','-v','error','-y','-framerate',str(rate),'-i',str(take/('%05d.'+extension)),'-vf','fps=30','-c:v','libx264','-crf','16','-pix_fmt','yuv420p','-movflags','+faststart',str(PUB/f'{name}.mp4')],check=True)
  info[name]={'frames_captured':count,'editorial_fps':rate,'duration':count/rate,'recording_times':json.loads((take/'timing.json').read_text())}
 (BASE/'capture-manifest.json').write_text(json.dumps(info,indent=2)+'\n')
 print({key:round(value['duration'],2) for key,value in info.items()})
if __name__=='__main__':main()
