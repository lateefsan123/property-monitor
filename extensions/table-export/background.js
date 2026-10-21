/* global chrome */
chrome.action.onClicked.addListener(async tab => {
  if (!tab.id || !/^https?:/.test(tab.url || '')) return;
  await chrome.windows.create({
    url: chrome.runtime.getURL(`workspace.html?tab=${tab.id}`),
    type: 'popup', width: 640, height: 880,
  });
});
