import { app, BrowserWindow, ipcMain, shell, nativeTheme, dialog, globalShortcut } from 'electron'
import path, { join } from 'path'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

import log from 'electron-log/main'
async function createWindow(): Promise<BrowserWindow> {
  const mainWindow = new BrowserWindow({
    width: 1500,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#00000000',
      symbolColor: 'gray'
    },
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      nodeIntegrationInWorker: true,
      sandbox: false
    }
  })
  mainWindow.on('ready-to-show', () => {
    globalShortcut.register('F5', () => {
      mainWindow.reload()
    })
    mainWindow.show()
  })
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    await mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    await mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
  await setupAutoUpdater(mainWindow)
  return mainWindow
}
import * as gateway from './gateway.ts'
import * as setting from './setting'
import * as middleware from './middleware'
import * as fs from 'node:fs'

app.whenReady().then(async () => {
  log.initialize()
  electronApp.setAppUserModelId('com.rwdz')
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })
  ipcMain.handle('gateway:start', gateway.start)
  ipcMain.handle('gateway:stop', gateway.stop)
  ipcMain.handle('gateway:list', gateway.list)
  ipcMain.handle('gateway:tag_list', gateway.tag_list)
  ipcMain.handle('gateway:runtime', gateway.runtime)
  ipcMain.handle('middleware:ips', middleware.ips)
  ipcMain.handle('middleware:start', middleware.start)
  ipcMain.handle('middleware:runtime', middleware.runtime)
  ipcMain.handle('middleware:stop', middleware.stop)
  ipcMain.handle('middleware:list', middleware.list)
  ipcMain.handle('middleware:tag_list', middleware.tag_list)
  ipcMain.handle('middleware:export_tag_list', middleware.export_tag_list)
  ipcMain.handle('setting:app_version', setting.appVersion)
  ipcMain.handle(
    'setting:set_theme',
    (_event: Electron.IpcMainInvokeEvent, value: 'light' | 'dark' | 'system') => {
      nativeTheme.themeSource = value
    }
  )
  ipcMain.handle('setting:check_update', async () => {
    return await autoUpdater.checkForUpdatesAndNotify()
  })
  ipcMain.handle('dialog:openDirectory', () => {
    return dialog.showOpenDialog({
      properties: ['openDirectory']
    })
  })
  ipcMain.handle('shell:openPath', (_event: Electron.IpcMainInvokeEvent, path: string) => {
    return shell.openPath(path)
  })
  ipcMain.handle(
    'app:path',
    (
      _event: Electron.IpcMainInvokeEvent,
      name:
        | 'home'
        | 'appData'
        | 'assets'
        | 'userData'
        | 'sessionData'
        | 'temp'
        | 'exe'
        | 'module'
        | 'desktop'
        | 'documents'
        | 'downloads'
        | 'music'
        | 'pictures'
        | 'videos'
        | 'recent'
        | 'logs'
        | 'crashDumps'
    ) => {
      return app.getPath(name)
    }
  )
  ipcMain.handle('app:downloadUpdate', async () => {
    return autoUpdater.downloadUpdate()
  })
  ipcMain.handle('app:quitAndInstall', async () => {
    return autoUpdater.quitAndInstall()
  })
  await createWindow()
})
app.on('activate', async function () {
  if (BrowserWindow.getAllWindows().length === 0) await createWindow()
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
app.on('before-quit', () => {
  fs.readdirSync(path.join(app.getPath('userData'), 'cache')).forEach((value) => {
    const ext = path.extname(value)
    if (ext == '.cache') {
      fs.unlinkSync(path.join(path.join(app.getPath('userData'), 'cache', value)))
    }
  })
})

import { autoUpdater } from 'electron-updater'
async function setupAutoUpdater(mainWindow: BrowserWindow): Promise<void> {
  autoUpdater.forceDevUpdateConfig = true
  autoUpdater.autoDownload = false
  // 自动检查更新并通知用户
  // 监听更新可用事件
  autoUpdater.on('update-available', (info) => {
    console.log('检测到新版本', info)
    mainWindow.webContents.send('update-available', info)
  })
  autoUpdater.on('download-progress', (info) => {
    mainWindow.webContents.send('update-progress', info)
  })
  // 监听更新下载完成事件
  autoUpdater.on('update-downloaded', (event) => {
    log.info('更新下载完成，准备安装')
    mainWindow.webContents.send('update-downloaded', event)
    // 退出应用并安装更新
  })
  await autoUpdater.checkForUpdatesAndNotify()
}
