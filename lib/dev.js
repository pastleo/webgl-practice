const devMode = location.host.match(/^(127\.0\.0\.1)|(192\.168\.)|(localhost)/);

const devModePromise = devMode ? new Promise(resolve => {
  const consolePanelScript = document.createElement('script');
  consolePanelScript.src = 'https://unpkg.com/console-panel@1.0.4/src/console-panel.js';
  consolePanelScript.onload = () => {
    consolePanel.enable();
    console.log('Development mode enabled');
    resolve();
  }
  document.body.appendChild(consolePanelScript);

  const consolePanelLink = document.createElement('link');
  consolePanelLink.rel = 'stylesheet'
  consolePanelLink.href = 'https://unpkg.com/console-panel@1.0.4/src/console-panel.css';
  document.body.appendChild(consolePanelLink);
}) : () => {};


export default devModePromise;
