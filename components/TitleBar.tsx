import React, {useState} from "react"
import {remote} from "electron"
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
import appIcon from "../assets/icon.png"
import "../styles/titlebar.less"

const TitleBar: React.FunctionComponent = (props) => {
    let [hoverClose, setHoverClose] = useState(false)
    let [hoverMin, setHoverMin] = useState(false)
    let [hoverMax, setHoverMax] = useState(false)
    let [hoverReload, setHoverReload] = useState(false)
    let [hoverStar, setHoverStar] = useState(false)
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
        remote.shell.openExternal("https://github.com/Tenpi/Crunchyroll-Downloader-GUI")
    }
    const reload = () => {
        remote.app.relaunch()
        remote.app.exit()
    }

    return (
        <section className="title-bar">
                <div className="title-bar-drag-area">
                    <div className="title-container">
                        <img className="app-icon" height="22" width="22" src={appIcon}/>
                        <p><span className="title">Crunchyroll Downloader GUI v{remote.app.getVersion()}</span></p>
                    </div>
                    <div className="title-bar-buttons">
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