import {app, BrowserWindow, ipcMain, dialog, shell, globalShortcut} from "electron"
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
let ffmpegPath = path.join(app.getAppPath(), "../../ffmpeg/ffmpeg.exe") as any
let ffprobePath = path.join(app.getAppPath(), "../../ffmpeg/ffprobe.exe") as any
if (!fs.existsSync(ffmpegPath)) ffmpegPath = undefined
if (!fs.existsSync(ffprobePath)) ffprobePath = undefined
autoUpdater.autoDownload = false
const store = new Store()

const active: Array<{id: number, dest: string, action: null | "pause" | "stop" | "kill", resume?: () => boolean}> = []

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
    store.set("username", username)
    store.set("password", password)
    return result.user.username
  } catch (error) {
    if (Number(error.response.status) === 429) {
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
  let episodes = null
  if (/\d{5,}/.test(query)) {
    const anime = await crunchyroll.anime.get(query).catch(() => query)
    episodes = await crunchyroll.anime.episodes(anime, info).catch(() => null)
  } else {
    const season = await crunchyroll.season.get(query, info).catch(() => query)
    episodes = await crunchyroll.anime.episodes(season, info).catch(() => null)
  }
  if (!episodes) window?.webContents.send("download-error", "search")
  return episodes
})

ipcMain.handle("get-episode", async (event, query, info) => {
  if (!/\d+/.test(query)) return null
  const episode = await crunchyroll.episode.get(query, info).catch(() => null)
  return episode
})

const downloadEpisode = async (info: any, episode: CrunchyrollEpisode) => {
  if (!episode.stream_data.streams[0]?.url && !info.thumbnails) return Promise.reject("premium only")
  let format = info.skipConversion ? "m3u8" : (info.audioOnly ? "mp3" : "mp4") 
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
  window?.webContents.send("download-started", {id: info.id, episode, format})
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
  let output = `${info.dest}/${info.episode.collection_name.replace(/-/g, " ")} ${info.episode.episode_number}.txt`
  active.push({id: info.id, dest: output, action: null})
  window?.webContents.send("download-started", {id: info.id, episode: info.episode, format: "txt"})
  const data = await axios.get(info.url).then((r) => r.data)
  fs.writeFileSync(output, data)
  window?.webContents.send("download-ended", {id: info.id, output})
})

ipcMain.handle("download-error", async (event, info) => {
    window?.webContents.send("download-error", info)
})

ipcMain.handle("download", async (event, info) => {
  await downloadEpisode(info, info.episode).catch((err) => {
    if (!info.ignoreError) window?.webContents.send("download-error", "download")
  })
})

app.on("ready", () => {
  window = new BrowserWindow({width: 800, height: 600, minWidth: 790, minHeight: 550, frame: false, backgroundColor: "#f97540", center: true, webPreferences: {nodeIntegration: true, contextIsolation: false, enableRemoteModule: true}})
  window.loadFile(path.join(__dirname, "index.html"))
  window.removeMenu()
  window.on("close", () => {
    for (let i = 0; i < active.length; i++) {
      active[i].action = "stop"
    }
  })
  window.on("closed", () => {
    window = null
  })
  globalShortcut.register("Control+Shift+I", () => {
    window?.webContents.toggleDevTools()
  })
})

app.allowRendererProcessReuse = false