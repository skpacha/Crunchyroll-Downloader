import React, {useState, useEffect} from "react"
import {remote, ipcRenderer} from "electron"
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
import appIcon from "../assets/icon.png"
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
    
    useEffect(() => {
        ipcRenderer.invoke("check-for-updates", true)
    }, [])

    const minimize = () => {
        remote.getCurrentWindow().minimize()
    }
    const maximize = () => {
        const window = remote.getCurrentWindow()
        if (window.isMaximized()) {
            window.unmaximize()
        } else {
            window.maximize()
        }
    }
    const close = () => {
        remote.getCurrentWindow().close()
    }
    const star = () => {
        remote.shell.openExternal(pack.repository.url)
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

    return (
        <section className="title-bar">
                <div className="title-bar-drag-area">
                    <div className="title-container">
                        <img className="app-icon" height="22" width="22" src={appIcon}/>
                        <p><span className="title">Crunchyroll Downloader v{pack.version}</span></p>
                    </div>
                    <div className="title-bar-buttons">
                        <img src={hoverWeb ? webButtonHover : webButton} height="20" width="20" className="title-bar-button" onClick={web} onMouseEnter={() => setHoverWeb(true)} onMouseLeave={() => setHoverWeb(false)}/>
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