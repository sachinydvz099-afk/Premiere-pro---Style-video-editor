import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';

let mainWindow: BrowserWindow | null = null;
let activeFFmpegProcess: ChildProcess | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#121212',
    title: 'ReaCut Studio — Professional Video Editor',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  });

  // Load from Vite dev server if running, or production build index.html
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  setupAppMenu();
}

function setupAppMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        { label: 'New Project', accelerator: 'CmdOrCtrl+N', click: () => mainWindow?.webContents.send('menu:new') },
        { label: 'Open Project...', accelerator: 'CmdOrCtrl+O', click: () => mainWindow?.webContents.send('menu:open') },
        { type: 'separator' },
        { label: 'Save Project', accelerator: 'CmdOrCtrl+S', click: () => mainWindow?.webContents.send('menu:save') },
        { label: 'Save As...', accelerator: 'CmdOrCtrl+Shift+S', click: () => mainWindow?.webContents.send('menu:saveAs') },
        { type: 'separator' },
        { label: 'Import Media...', accelerator: 'CmdOrCtrl+I', click: () => mainWindow?.webContents.send('menu:import') },
        { label: 'Export Sequence...', accelerator: 'CmdOrCtrl+M', click: () => mainWindow?.webContents.send('menu:export') },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
ipcMain.handle('dialog:openFile', async (_event, options) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, options || {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Media Files', extensions: ['mp4', 'mov', 'mkv', 'avi', 'mp3', 'wav', 'png', 'jpg', 'jpeg'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  return result.canceled ? null : result.filePaths;
});

ipcMain.handle('dialog:saveFile', async (_event, options) => {
  if (!mainWindow) return null;
  const result = await dialog.showSaveDialog(mainWindow, options || {
    filters: [
      { name: 'ReaCut Project', extensions: ['rcproj'] },
      { name: 'MP4 Video', extensions: ['mp4'] }
    ]
  });
  return result.canceled ? null : result.filePath;
});

// FFprobe media metadata extraction
ipcMain.handle('media:probe', async (_event, filePath: string) => {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath
    ]);

    let stdoutData = '';
    ffprobe.stdout.on('data', (chunk) => { stdoutData += chunk; });
    ffprobe.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(stdoutData));
        } catch (e) {
          reject(e);
        }
      } else {
        reject(new Error(`ffprobe exited with code ${code}`));
      }
    });
    ffprobe.on('error', reject);
  });
});

// FFmpeg render child process
ipcMain.handle('export:render', async (_event, args: string[]) => {
  return new Promise((resolve, reject) => {
    if (activeFFmpegProcess) {
      return reject(new Error('An export job is already running.'));
    }

    const ffmpeg = spawn('ffmpeg', args);
    activeFFmpegProcess = ffmpeg;

    ffmpeg.stderr.on('data', (data) => {
      const log = data.toString();
      // Parse frame progress: frame=\s*(\d+)
      const match = log.match(/frame=\s*(\d+)/);
      if (match && mainWindow) {
        mainWindow.webContents.send('export:progress', {
          frame: parseInt(match[1], 10),
          raw: log
        });
      }
    });

    ffmpeg.on('close', (code) => {
      activeFFmpegProcess = null;
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(`FFmpeg exited with error code ${code}`));
      }
    });

    ffmpeg.on('error', (err) => {
      activeFFmpegProcess = null;
      reject(err);
    });
  });
});

ipcMain.handle('export:cancel', async () => {
  if (activeFFmpegProcess) {
    activeFFmpegProcess.kill('SIGTERM');
    activeFFmpegProcess = null;
    return true;
  }
  return false;
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
