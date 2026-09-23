// Re-render the polished walkthrough after visual changes, without touching its original master.
const path = require('node:path');
const fs = require('node:fs');
const {bundle} = require('@remotion/bundler');
const {selectComposition, renderStill, renderMedia, openBrowser} = require('@remotion/renderer');

const root = path.resolve(__dirname, '../../..');
const output = path.join(root, 'video/review/polished-sunlit');
const stills = process.argv.includes('--stills');

async function main() {
  fs.mkdirSync(output, {recursive: true});
  const serveUrl = await bundle({
    entryPoint: path.join(root, 'video/src/workflow/polished-index.tsx'),
    publicDir: path.join(root, 'video/assets/accurate/public'),
    outDir: path.join(output, 'bundle'),
    webpackOverride: config => ({
      ...config,
      module: {...config.module, rules: [...(config.module?.rules || []), {test: /\.m?js$/, resolve: {fullySpecified: false}}]},
      resolve: {...config.resolve, alias: {...config.resolve?.alias, react: path.join(root, 'video/node_modules/react'), 'react-dom': path.join(root, 'video/node_modules/react-dom')}},
    }),
  });
  const browser = await openBrowser('chrome');
  try {
    const composition = await selectComposition({serveUrl, id: 'RepeatAIWorkflow', puppeteerInstance: browser});
    if (stills) {
      const selected = process.argv.find(arg => arg.startsWith('--frames='));
      const frames = selected ? selected.slice(9).split(',').map(Number) : [740, 798, 1079, 1303, 1337, 3201, 3229, 3388, 4456, 4743];
      for (const frame of frames) {
        await renderStill({serveUrl, composition, puppeteerInstance: browser, frame,
          output: path.join(output, `cursor-frame-${frame}.png`), imageFormat: 'png', scale: .6666667});
        console.log('STILL', frame);
      }
      return;
    }
    let last = -1;
    await renderMedia({serveUrl, composition, puppeteerInstance: browser, codec: 'h264',
      outputLocation: path.join(output, 'picture-master.mp4'), crf: 18,
      pixelFormat: 'yuv420p', audioBitrate: '192k', concurrency: 1,
      onProgress: progress => {
        const pc = Math.floor(progress.progress * 20) * 5;
        if (pc !== last) { last = pc; console.log('RENDER', `${pc}%`); }
      },
    });
    console.log('PICTURE READY');
  } finally {
    await browser.close({silent: true});
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
