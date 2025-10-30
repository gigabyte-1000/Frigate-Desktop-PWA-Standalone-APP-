const { app, BrowserWindow, Tray, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
  process.exit(0);
} else {
  app.on('second-instance', () => {
    // Someone tried to run another instance — restore the window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
let mainWindow;
let tray;
let isQuitting = false;

const configPath = path.join('config.json');

// Default settings
let settings = {
  autoStart: false,
  startMinimized: false,
  windowBounds: { width: 1280, height: 800 },
  isMaximized: false,
  serverIP: 'http://192.168.1.50:5000',
};

// Load settings from file
function loadSettings() {
  try {
    if (fs.existsSync(configPath)) {
      const saved = JSON.parse(fs.readFileSync(configPath));
      settings = { ...settings, ...saved };
    }
  } catch (e) {
    console.error('Failed to load settings', e);
  }
}

// Save settings to file
function saveSettings() {
  try {
    fs.writeFileSync(configPath, JSON.stringify(settings, null, 2));
  } catch (e) {
    console.error('Failed to save settings', e);
  }
}

// Apply auto-start setting
function applyAutoStart() {
  app.setLoginItemSettings({
    openAtLogin: settings.autoStart,
    openAsHidden: true,
  });
}

// Create main window
function createWindow() {
  const bounds = settings.windowBounds || {};
  const width = bounds.width || 1280;
  const height = bounds.height || 800;

  mainWindow = new BrowserWindow({
    width,
    height,
    x: bounds.x,
    y: bounds.y,
    icon: path.join(__dirname, 'icon.ico'),
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: 'persist:frigate',
    },
  });

  // Use saved IP
  mainWindow.loadURL(`${settings.serverIP}`);

  mainWindow.once('ready-to-show', () => {
    if (settings.isMaximized) mainWindow.maximize();
    if (!settings.startMinimized) mainWindow.show();
  });

  // Save window state (bounds and maximized)
  const saveWindowState = () => {
    if (!mainWindow) return;
    settings.isMaximized = mainWindow.isMaximized();
    if (!settings.isMaximized) settings.windowBounds = mainWindow.getBounds();
    saveSettings();
  };

  mainWindow.on('resize', saveWindowState);
  mainWindow.on('move', saveWindowState);
  mainWindow.on('maximize', saveWindowState);
  mainWindow.on('unmaximize', saveWindowState);

  mainWindow.on('minimize', (event) => {
    event.preventDefault();
    mainWindow.hide();
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

// Simple input dialog workaround (HTML-free)
async function openServerIPDialog() {
  const inputWindow = new BrowserWindow({
    width: 300,
    height: 300,
    resizable: true,
    title: 'Frigate Server',
    parent: mainWindow,
    modal: false,
    show: false,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Inline HTML so it still works in a single .exe
  const htmlContent = `
  <html>
    <body style="font-family:sans-serif; margin:20px;">
      <h3>Frigate Server IP/Host:</h3>
      <br>
      <center>(include http(s)://)
      <input id="ip" style="width:100%;padding:5px;" value="${settings.serverIP}">
      <br><br>
      <button id="save">Save</button>
      <button id="cancel">Cancel</button>
      <script>
        const { ipcRenderer } = require('electron');
        document.getElementById('save').onclick = () => {
          const ip = document.getElementById('ip').value.trim();
          ipcRenderer.send('set-server-ip', ip);
          window.close();
        };
        document.getElementById('cancel').onclick = () => window.close();
      </script>
    </body>
  </html>`;

  inputWindow.loadURL('data:text/html,' + encodeURIComponent(htmlContent));
  inputWindow.once('ready-to-show', () => inputWindow.show());
}

const { ipcMain } = require('electron');
ipcMain.on('set-server-ip', (event, ip) => {
  if (!ip) return;
  settings.serverIP = ip;
  saveSettings();
  if (mainWindow) mainWindow.loadURL(`${ip}`);
});

// Create tray
function createTray() {
  tray = new Tray(path.join(__dirname, 'icon.ico'));
  tray.setToolTip('Frigate Desktop');

  const menuTemplate = [
    { label: 'Show', click: () => mainWindow.show() },
    {
      label: 'Settings',
      submenu: [
        {
          label: 'Server IP',
          click: () => openServerIPDialog()
        },
        { type: 'separator' },
        {
          label: 'Auto-start on login',
          type: 'checkbox',
          checked: settings.autoStart,
          click: (menuItem) => {
            settings.autoStart = menuItem.checked;
            saveSettings();
            applyAutoStart();
          }
        },
        {
          label: 'Start minimized',
          type: 'checkbox',
          checked: settings.startMinimized,
          click: (menuItem) => {
            settings.startMinimized = menuItem.checked;
            saveSettings();
          }
        }
      ]
    },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit(); } },
  ];

  tray.setContextMenu(Menu.buildFromTemplate(menuTemplate));
  tray.on('double-click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

// App ready
app.whenReady().then(() => {
  loadSettings();
  applyAutoStart();
  createWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
