import {app, BrowserWindow, ipcMain, dialog, shell, globalShortcut, session} from "electron"
import {autoUpdater} from "electron-updater"
import path from "path"
import fs from "fs"
import axios from "axios"
import Store from "electron-store"
import functions from "./structures/functions"
import crunchyroll, {FFmpegProgress, DownloadOptions, CrunchyrollEpisode} from "crunchyroll.ts"
import process from "process"
import pack from "./package.json"
import "./dev-app-update.yml"

process.setMaxListeners(0)
let window: Electron.BrowserWindow | null
let website: Electron.BrowserWindow | null
let ffmpegPath = path.join(app.getAppPath(), "../../ffmpeg/ffmpeg.exe") as any
let ffprobePath = path.join(app.getAppPath(), "../../ffmpeg/ffprobe.exe") as any
if (!fs.existsSync(ffmpegPath)) ffmpegPath = undefined
if (!fs.existsSync(ffprobePath)) ffprobePath = undefined
autoUpdater.autoDownload = false
const store = new Store()

const active: Array<{id: number, dest: string, action: null | "pause" | "stop" | "kill", resume?: () => boolean}> = []

ipcMain.handle("delete-all", () => {
  window?.webContents.send("delete-all")
})

ipcMain.handle("stop-all", () => {
  window?.webContents.send("stop-all")
})

ipcMain.handle("clear-all", () => {
  window?.webContents.send("clear-all")
})

ipcMain.handle("get-cookie", () => {
  return store.get("cookie", "")
})

ipcMain.handle("download-url", (event, url) => {
  if (window?.isMinimized()) window?.restore()
  window?.focus()
  window?.webContents.send("download-url", url)
})

const openWebsite = async () => {
  if (!website) {
    website = new BrowserWindow({width: 800, height: 600, minWidth: 790, minHeight: 550, frame: false, backgroundColor: "#ffffff", center: false, webPreferences: {nodeIntegration: true, webviewTag: true, contextIsolation: false, enableRemoteModule: true}})
    await website.loadFile(path.join(__dirname, "crunchyroll.html"))
    website?.on("closed", () => {
      website = null
    })
  } else {
    if (website.isMinimized()) website.restore()
    website.focus()
  }
}

ipcMain.handle("open-url", async (event, url: string) => {
  await openWebsite()
  website?.webContents.send("open-url", url)
})

ipcMain.handle("open-website", async () => {
  if (website) {
    website.close()
  } else {
    await openWebsite()
  }
})

ipcMain.handle("logout", async (event) => {
  await crunchyroll.logout().catch(() => null)
  store.delete("username")
  store.delete("password")
})

ipcMain.handle("init-login", async () => {
  const username = store.get("username", null) as string
  const password = store.get("password", null) as string
  if (username && password) {
    try {
      await crunchyroll.login(username, password)
      return username
    } catch {
      return null
    }
  }
})

ipcMain.handle("login", async (event, username, password) => {
  try {
    const result = await crunchyroll.login(username, password)
    store.set("username", result.user.username)
    store.set("password", password)
    return result.user.username
  } catch (error) {
    if (Number(error.response?.status) === 429) {
      return "rate limited"
    }
    return null
  }
})

ipcMain.handle("login-dialog", async (event) => {
  window?.webContents.send("close-all-dialogs", "login")
  window?.webContents.send("show-login-dialog")
})

ipcMain.handle("install-update", async (event) => {
  await autoUpdater.downloadUpdate()
  autoUpdater.quitAndInstall()
})

ipcMain.handle("check-for-updates", async (event, startup: boolean) => {
  window?.webContents.send("close-all-dialogs", "version")
  const update = await autoUpdater.checkForUpdates()
  let newVersion = update.updateInfo.version
  if (pack.version === newVersion) {
    if (!startup) window?.webContents.send("show-version-dialog", null)
  } else {
    window?.webContents.send("show-version-dialog", newVersion)
  }
})

ipcMain.handle("get-downloads-folder", async (event, location: string) => {
  if (store.has("downloads")) {
    return store.get("downloads")
  } else {
    const downloads = app.getPath("downloads")
    store.set("downloads", downloads)
    return downloads
  }
})

ipcMain.handle("open-location", async (event, location: string) => {
  if (!fs.existsSync(location)) return
  if (fs.statSync(location).isDirectory()) {
    shell.openPath(path.normalize(location))
  } else {
    shell.showItemInFolder(path.normalize(location))
  }
})

ipcMain.handle("delete-download", async (event, id: number) => {
  const index = active.findIndex((a) => a.id === id)
  if (index !== -1) {
    const dest = active[index].dest
    active[index].action = "kill"
    let error = true
    while (fs.existsSync(dest) && error) {
      await functions.timeout(1000)
      try {
        if (fs.statSync(dest).isDirectory()) {
          functions.removeDirectory(dest)
        } else {
          fs.unlinkSync(dest)
        }
        error = false
      } catch {
        // ignore
      }
    }
    return true
  }
  return false
})

ipcMain.handle("stop-download", async (event, id: number) => {
  const index = active.findIndex((a) => a.id === id)
  if (index !== -1) {
    active[index].action = "stop"
    return true
  }
  return false
})

ipcMain.handle("pause-download", async (event, id: number) => {
  const index = active.findIndex((a) => a.id === id)
  if (index !== -1) active[index].action = "pause"
})

ipcMain.handle("resume-download", async (event, id: number) => {
  const index = active.findIndex((a) => a.id === id)
  if (index !== -1) {
    active[index].action = null
    active[index].resume?.()
  }
})

ipcMain.handle("select-directory", async () => {
  if (!window) return
  const result = await dialog.showOpenDialog(window, {
    properties: ["openDirectory"]
  })
  const dir = result.filePaths[0]
  if (dir) {
    store.set("downloads", dir)
    return dir
  }
})

ipcMain.handle("get-episodes", async (event, query, info) => {
  if (/crunchyroll.com/.test(query)) return null
  let episodes = null
  if (/\d{5,}/.test(query)) {
    const anime = await crunchyroll.anime.get(query).catch(() => query)
    episodes = await crunchyroll.anime.episodes(anime, info).catch(() => null)
  } else {
    const season = await crunchyroll.season.get(query, info).catch(() => query)
    episodes = await crunchyroll.anime.episodes(season, info).catch(() => null)
  }
  return episodes
})

ipcMain.handle("get-episode", async (event, query, info) => {
  if (!/\d+/.test(query)) return null
  const episode = await crunchyroll.episode.get(query, info).catch(() => null)
  if (!episode && /\d{5,}/.test(query) && /episode/.test(query)) return query
  return episode
})

const downloadEpisode = async (info: any, episode: CrunchyrollEpisode) => {
  let format = "mp4"
  if (info.softSubs) format = "mkv"
  if (info.audioOnly) format = "mp3"
  if (info.skipConversion) format = "m3u8"
  if (info.thumbnails) format = "png"
  let dest = crunchyroll.util.parseDest(episode, format, info.dest)
  const videoProgress = (progress: FFmpegProgress, resume: () => boolean) => {
    window?.webContents.send("download-progress", {id: info.id, progress})
    let index = active.findIndex((e) => e.id === info.id)
    if (index !== -1) {
      if (!active[index].resume) active[index].resume = resume
      let action = active[index].action
      if (action) {
        if (action === "kill") active.splice(index, 1)
        return action
      }
    }
  }
  active.push({id: info.id, dest, action: null})
  window?.webContents.send("download-started", {id: info.id, kind: info.kind, episode, format})
  await functions.timeout(100)
  if (fs.existsSync(dest)) {
    if (fs.statSync(dest).isDirectory()) {
      const files = fs.readdirSync(dest)
      if (files.length) return window?.webContents.send("download-ended", {id: info.id, output: dest, skipped: true})
    } else {
      if (info.skipConversion) return window?.webContents.send("download-ended", {id: info.id, output: dest, skipped: true})
      const duration1 = await crunchyroll.util.parseDuration(dest, ffmpegPath)
      const duration2 = await crunchyroll.util.parseDuration(info.playlist, ffmpegPath)
      if (Math.round(duration1) === Math.round(duration2)) {
        return window?.webContents.send("download-ended", {id: info.id, output: dest, skipped: true})
      }
    }
  }
  info.ffmpegPath = ffmpegPath
  info.ffprobePath = ffprobePath
  let output = ""
  if (info.thumbnails) {
    output = await crunchyroll.util.downloadThumbnails(episode, info.dest, info)
  } else {
    output = await crunchyroll.util.downloadEpisode(episode, info.dest, info, videoProgress)
  }
  if (info.skipConversion) {
    await functions.download(output, dest)
    output = dest
  }
  window?.webContents.send("download-ended", {id: info.id, output})
}

ipcMain.handle("download-subtitles", async (event, info) => {
  let output = `${info.dest}/${info.episode.collection_name.replace(/-/g, " ").replace(/:/g, " ")} ${info.episode.episode_number}.ass`
  active.push({id: info.id, dest: output, action: null})
  window?.webContents.send("download-started", {id: info.id, episode: info.episode, format: "ass", kind: info.kind})
  await functions.timeout(100)
  if (fs.existsSync(output)) {
    return window?.webContents.send("download-ended", {id: info.id, output, skipped: true})
  }
  const data = await axios.get(info.url).then((r) => r.data)
  fs.writeFileSync(output, data)
  window?.webContents.send("download-ended", {id: info.id, output})
})

ipcMain.handle("download-error", async (event, info) => {
    window?.webContents.send("download-error", info)
})

ipcMain.handle("download", async (event, info) => {
  await downloadEpisode(info, info.episode).catch((err) => {
    window?.webContents.send("download-error", "download")
  })
})

const singleLock = app.requestSingleInstanceLock()

if (!singleLock) {
  app.quit()
} else {
  app.on("second-instance", () => {
    if (window) {
      if (window.isMinimized()) window.restore()
      window.focus()
    }
  })

  app.on("ready", () => {
    window = new BrowserWindow({width: 800, height: 600, minWidth: 790, minHeight: 550, frame: false, backgroundColor: "#f97540", center: true, webPreferences: {nodeIntegration: true, contextIsolation: false, enableRemoteModule: true}})
    window.loadFile(path.join(__dirname, "index.html"))
    window.removeMenu()
    window.on("close", () => {
      website?.close()
      for (let i = 0; i < active.length; i++) {
        active[i].action = "stop"
      }
    })
    window.on("closed", () => {
      window = null
    })
    globalShortcut.register("Control+Shift+I", () => {
      window?.webContents.toggleDevTools()
      website?.webContents.toggleDevTools()
    })
    session.defaultSession.webRequest.onSendHeaders({urls: ["https://www.crunchyroll.com/", "https://www.crunchyroll.com/login"]}, (details) => {
      const cookie = details.requestHeaders["Cookie"]
      store.set("cookie", cookie)
    })
  })
}

app.allowRendererProcessReuse = false