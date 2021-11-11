import React, {useState, useEffect} from "react"
import {ipcRenderer} from "electron"
import {getCurrentWindow, shell} from "@electron/remote"
import reloadButton from "../assets/reloadButton.png"
import starButton from "../assets/starButton.png"
import minimizeButton from "../assets/minimizeButton.png"
import maximizeButton from "../assets/maximizeButton.png"
import closeButton from "../assets/closeButton.png"
import reloadButtonHover from "../assets/reloadButton-hover.png"
import starButtonHover from "../assets/starButton-hover.png"
import minimizeButtonHover from "../assets/minimizeButton-hover.png"
import maximizeButtonHover from "../assets/maximizeButton-hover.png"
import closeButtonHover from "../assets/closeButton-hover.png"
import loginButton from "../assets/loginButton.png"
import loginButtonHover from "../assets/loginButton-hover.png"
import webButton from "../assets/webButton.png"
import webButtonHover from "../assets/webButton-hover.png"
import settingsButtonHover from "../assets/settingsButton-hover.png"
import settingsButton from "../assets/settingsButton.png"
import appIcon from "../assets/icon.png"
import lightButton from "../assets/light.png"
import lightButtonHover from "../assets/light-hover.png"
import darkButton from "../assets/dark.png"
import darkButtonHover from "../assets/dark-hover.png"
import pack from "../package.json"
import "../styles/titlebar.less"

const TitleBar: React.FunctionComponent = (props) => {
    let [hoverClose, setHoverClose] = useState(false)
    let [hoverMin, setHoverMin] = useState(false)
    let [hoverMax, setHoverMax] = useState(false)
    let [hoverReload, setHoverReload] = useState(false)
    let [hoverStar, setHoverStar] = useState(false)
    let [hoverLogin, setHoverLogin] = useState(false)
    let [hoverWeb, setHoverWeb] = useState(false)
    let [hoverTheme, setHoverTheme] = useState(false)
    let [theme, setTheme] = useState("light")
    let [hoverSettings, setHoverSettings] = useState(false)
    
    useEffect(() => {
        ipcRenderer.invoke("check-for-updates", true)
        const initTheme = async () => {
            const saved = await ipcRenderer.invoke("get-theme")
            changeTheme(saved)
        }
        initTheme()
    }, [])

    const minimize = () => {
        getCurrentWindow().minimize()
    }
    const maximize = () => {
        const window = getCurrentWindow()
        if (window.isMaximized()) {
            window.unmaximize()
        } else {
            window.maximize()
        }
    }
    const close = () => {
        getCurrentWindow().close()
    }
    const star = () => {
        shell.openExternal(pack.repository.url)
    }
    const reload = () => {
        ipcRenderer.invoke("check-for-updates", false)
    }

    const login = () => {
        ipcRenderer.invoke("login-dialog")
    }

    const web = () => {
        ipcRenderer.invoke("open-website")
    }

    
    const settings = () => {
        ipcRenderer.invoke("advanced-settings")
    }

    const changeTheme = (value?: string) => {
        let condition = value !== undefined ? value === "dark" : theme === "light"
        if (condition) {
            document.documentElement.style.setProperty("--bg-color", "#090409")
            document.documentElement.style.setProperty("--title-color", "#090409")
            document.documentElement.style.setProperty("--text-color", "#ff5b28")
            document.documentElement.style.setProperty("--search-color", "#090409")
            document.documentElement.style.setProperty("--search-text", "#ff5f25")
            document.documentElement.style.setProperty("--drop-color", "#090409")
            document.documentElement.style.setProperty("--drop-border", "#ff7211")
            document.documentElement.style.setProperty("--drop-hover", "#090409")
            document.documentElement.style.setProperty("--drop-text", "#ff7211")
            document.documentElement.style.setProperty("--drop-text-hover", "white")
            document.documentElement.style.setProperty("--settings-color", "#090409")
            document.documentElement.style.setProperty("--settings-text", "#fa5a3e")
            document.documentElement.style.setProperty("--version-color", "#090409")
            document.documentElement.style.setProperty("--version-text", "#ff3a3b")
            document.documentElement.style.setProperty("--settings-ok", "#090409")
            document.documentElement.style.setProperty("--settings-ok-text", "#ff9035")
            document.documentElement.style.setProperty("--settings-revert", "#090409")
            document.documentElement.style.setProperty("--settings-revert-text", "#f0413b")
            document.documentElement.style.setProperty("--version-accept", "#090409")
            document.documentElement.style.setProperty("--version-accept-text", "#5142ff")
            document.documentElement.style.setProperty("--version-reject", "#090409")
            document.documentElement.style.setProperty("--version-reject-text", "#ff4252")
            setTheme("dark")
            ipcRenderer.invoke("save-theme", "dark")
            ipcRenderer.invoke("update-color", "dark")
        } else {
            document.documentElement.style.setProperty("--bg-color", "#f97540")
            document.documentElement.style.setProperty("--title-color", "#ff5b28")
            document.documentElement.style.setProperty("--text-color", "black")
            document.documentElement.style.setProperty("--search-color", "#ff5f25")
            document.documentElement.style.setProperty("--search-text", "black")
            document.documentElement.style.setProperty("--drop-color", "#ff7211")
            document.documentElement.style.setProperty("--drop-border", "#ffae3b")
            document.documentElement.style.setProperty("--drop-hover", "#ff8a3c")
            document.documentElement.style.setProperty("--drop-text", "white")
            document.documentElement.style.setProperty("--drop-text-hover", "black")
            document.documentElement.style.setProperty("--settings-color", "#fa5a3e")
            document.documentElement.style.setProperty("--settings-text", "black")
            document.documentElement.style.setProperty("--version-color", "#ff3a3b")
            document.documentElement.style.setProperty("--version-text", "black")
            document.documentElement.style.setProperty("--settings-ok", "#ff9035")
            document.documentElement.style.setProperty("--settings-ok-text", "black")
            document.documentElement.style.setProperty("--settings-revert", "#f0413b")
            document.documentElement.style.setProperty("--settings-revert-text", "black")
            document.documentElement.style.setProperty("--version-accept", "#5142ff")
            document.documentElement.style.setProperty("--version-accept-text", "black")
            document.documentElement.style.setProperty("--version-reject", "#ff4252")
            document.documentElement.style.setProperty("--version-reject-text", "black")
            setTheme("light")
            ipcRenderer.invoke("save-theme", "light")
            ipcRenderer.invoke("update-color", "light")
        }
    }

    return (
        <section className="title-bar">
                <div className="title-bar-drag-area">
                    <div className="title-container">
                        <img className="app-icon" height="22" width="22" src={appIcon}/>
                        <p><span className="title">Crunchyroll Downloader v{pack.version}</span></p>
                    </div>
                    <div className="title-bar-buttons">
                        <img src={hoverTheme ? (theme === "light" ? darkButtonHover : lightButtonHover) : (theme === "light" ? darkButton : lightButton)} height="20" width="20" className="title-bar-button theme-button" onClick={() => changeTheme()} onMouseEnter={() => setHoverTheme(true)} onMouseLeave={() => setHoverTheme(false)}/>
                        <img src={hoverSettings ? settingsButtonHover : settingsButton} height="20" width="20" className="title-bar-button settings-button" onClick={settings} onMouseEnter={() => setHoverSettings(true)} onMouseLeave={() => setHoverSettings(false)}/>
                        <img src={hoverWeb ? loginButtonHover : loginButton} height="20" width="20" className="title-bar-button" onClick={web} onMouseEnter={() => setHoverWeb(true)} onMouseLeave={() => setHoverWeb(false)}/>
                        {/*<img src={hoverLogin ? loginButtonHover : loginButton} height="20" width="20" className="title-bar-button" onClick={login} onMouseEnter={() => setHoverLogin(true)} onMouseLeave={() => setHoverLogin(false)}/>*/}
                        <img src={hoverStar ? starButtonHover : starButton} height="20" width="20" className="title-bar-button star-button" onClick={star} onMouseEnter={() => setHoverStar(true)} onMouseLeave={() => setHoverStar(false)}/>
                        <img src={hoverReload ? reloadButtonHover : reloadButton} height="20" width="20" className="title-bar-button reload-button" onClick={reload} onMouseEnter={() => setHoverReload(true)} onMouseLeave={() => setHoverReload(false)}/>
                        <img src={hoverMin ? minimizeButtonHover : minimizeButton} height="20" width="20" className="title-bar-button" onClick={minimize} onMouseEnter={() => setHoverMin(true)} onMouseLeave={() => setHoverMin(false)}/>
                        <img src={hoverMax ? maximizeButtonHover : maximizeButton} height="20" width="20" className="title-bar-button" onClick={maximize} onMouseEnter={() => setHoverMax(true)} onMouseLeave={() => setHoverMax(false)}/>
                        <img src={hoverClose ? closeButtonHover : closeButton} height="20" width="20" className="title-bar-button" onClick={close} onMouseEnter={() => setHoverClose(true)} onMouseLeave={() => setHoverClose(false)}/>
                    </div>
                </div>
        </section>
    )
}

export default TitleBar