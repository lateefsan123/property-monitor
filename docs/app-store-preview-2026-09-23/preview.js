const screens = {
  listings: ['Track your', 'buildings.'],
  home: ['Your day,', 'at a glance.'],
  sellers: ['Keep every', 'follow-up in view.'],
};

// Add a disclosure above each real capture; never redraw or invent app UI.
async function renderScreen(figure) {
  const name = figure.dataset.screen;
  const capture = new Image();
  capture.src = new URL(`./assets/${name}.png`, import.meta.url).href;
  await capture.decode();
  const canvas = figure.querySelector('canvas');
  const context = canvas.getContext('2d', { alpha: false });
  context.fillStyle = '#111111';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.textBaseline = 'alphabetic';
  context.fillStyle = '#adbbb7';
  context.font = '500 36px Arial';
  context.fillText('Repeat AI', 108, 84);
  context.fillStyle = '#f4f4f0';
  context.font = '600 84px Arial';
  screens[name].forEach((line, index) => context.fillText(line, 108, 192 + index * 94));
  context.fillStyle = '#86dfcf';
  context.font = '500 46px Arial';
  context.fillText('Paid subscription required', 108, 367);
  const width = 1026;
  const height = capture.naturalHeight * width / capture.naturalWidth;
  context.strokeStyle = '#383b3b';
  context.lineWidth = 2;
  context.strokeRect(107, 431, width + 2, height + 2);
  context.drawImage(capture, 108, 432, width, height);
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
