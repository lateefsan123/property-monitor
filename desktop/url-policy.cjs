'use strict';

const EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:']);

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isAppNavigationUrl(value, appUrl) {
  const target = parseUrl(value);
  const app = parseUrl(appUrl);

  return Boolean(
    target
      && app
      && (target.protocol === 'http:' || target.protocol === 'https:')
      && target.origin === app.origin,
  );
}

function getExternalUrl(value) {
  const target = parseUrl(value);
  if (!target || !EXTERNAL_PROTOCOLS.has(target.protocol)) {
    return null;
  }

  return target.toString();
}

module.exports = {
  getExternalUrl,
  isAppNavigationUrl,
};
