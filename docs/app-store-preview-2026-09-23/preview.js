import { drawBackground, drawPhone } from './frame.js';

const screens = {
  listings: ['Track your buildings', 'in one place'],
  home: ['Stay on top of', 'every follow-up'],
  sellers: ['Keep your sellers', 'within reach'],
};

// Add a disclosure above each real capture; never redraw or invent app UI.
async function renderScreen(figure) {
  const name = figure.dataset.screen;
  const capture = new Image();
  capture.src = new URL(`./assets/${name}.png`, import.meta.url).href;
  await capture.decode();
  const canvas = figure.querySelector('canvas');
  const context = canvas.getContext('2d', { alpha: false });
  context.save();
  context.scale(canvas.width / 1320, canvas.height / 2868);
  drawBackground(context);
  context.textBaseline = 'alphabetic';
  context.textAlign = 'center';
  context.fillStyle = '#17202b';
  context.font = '700 62px Arial';
  screens[name].forEach((line, index) => context.fillText(line, 660, 306 + index * 64));
  context.fillStyle = '#526172';
  context.font = '400 34px Arial';
  context.fillText('Paid subscription required', 660, 444);
  drawPhone(context, capture);
  context.restore();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  figure.querySelector('a').href = URL.createObjectURL(blob);
  figure.dataset.ready = 'true';
}

try {
  const description = await fetch(new URL('description.txt', import.meta.url));
  if (!description.ok) throw new Error('Description could not be loaded.');
  document.querySelector('#description').textContent = await description.text();
  await Promise.all([...document.querySelectorAll('figure')].map(renderScreen));
  document.documentElement.dataset.ready = 'true';
} catch (error) {
  document.querySelector('.note').textContent = `Preview could not load: ${error.message}`;
}
