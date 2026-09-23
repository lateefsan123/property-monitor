// Code-native recreation of the FighterCenter store layout, in its 1320 × 2868 coordinates.
export function drawBackground(context) {
  context.fillStyle = '#f7faff';
  context.fillRect(0, 0, 1320, 2868);
  context.strokeStyle = '#e7eef7';
  context.lineWidth = 1;
  context.beginPath();
  for (let offset = -2900; offset < 4300; offset += 94) {
    context.moveTo(offset, 0);
    context.lineTo(offset + 2868, 2868);
    context.moveTo(offset, 0);
    context.lineTo(offset - 2868, 2868);
  }
  context.stroke();
}

function rounded(context, x, y, width, height, radius, fill) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fillStyle = fill;
  context.fill();
}

export function drawPhone(context, capture, { webPreview = false } = {}) {
  const metal = context.createLinearGradient(180, 0, 1140, 0);
  [[0, '#343c4b'], [0.006, '#b9c2cf'], [0.015, '#455269'], [0.029, '#151c29'],
    [0.05, '#68788f'], [0.1, '#0b0d13'], [0.9, '#151c28'], [0.965, '#8b9bb1'],
    [0.98, '#1b2332'], [0.993, '#aeb8c6'], [1, '#3a4354']]
    .forEach(([position, color]) => metal.addColorStop(position, color));
  // Side controls sit behind the body, matching the reference silhouette.
  rounded(context, 176, 892, 11, 79, 5, metal);
  rounded(context, 176, 1180, 11, 145, 5, metal);
  rounded(context, 176, 1370, 11, 145, 5, metal);
  rounded(context, 1133, 1232, 11, 235, 5, metal);
  context.save();
  context.shadowColor = '#111b3038';
  context.shadowBlur = 5;
  context.shadowOffsetY = 3;
  rounded(context, 184, 610, 952, 1992, 180, metal);
  context.restore();
  rounded(context, 193, 621, 934, 1970, 171, '#090c12');
  context.strokeStyle = '#91a0b577';
  context.lineWidth = 3;
  context.stroke();
  rounded(context, 207, 635, 906, 1943, 155, '#111111');
  context.save();
  context.clip();
  // Preserve aspect ratio and all UI, with only the empty outer corners masked by the device.
  const topInset = webPreview ? 145 : 0;
  const availableHeight = 1943 - topInset;
  const width = Math.min(906, availableHeight * capture.naturalWidth / capture.naturalHeight);
  const height = capture.naturalHeight * width / capture.naturalWidth;
  context.drawImage(capture, 207 + (906 - width) / 2, 635 + topInset + (availableHeight - height) / 2, width, height);
  context.restore();
  rounded(context, 522, 674, 276, 79, 40, '#000000');
  const lens = context.createRadialGradient(758, 711, 2, 758, 713, 15);
  lens.addColorStop(0, '#204480');
  lens.addColorStop(0.35, '#08142d');
  lens.addColorStop(0.65, '#151e3d');
  lens.addColorStop(1, '#030407');
  rounded(context, 744, 698, 28, 28, 14, lens);
}
