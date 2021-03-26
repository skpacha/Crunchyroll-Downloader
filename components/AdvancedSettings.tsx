import {ipcRenderer} from "electron"
import React, {useContext, useEffect, useState} from "react"
import {TemplateContext, VideoQualityContext, TypeContext, LanguageContext, QualityContext, FormatContext} from "../renderer"
import "../styles/advancedsettings.less"

const AdvancedSettings: React.FunctionComponent = (props) => {
    const {template, setTemplate} = useContext(TemplateContext)
    const {videoQuality, setVideoQuality} = useContext(VideoQualityContext)
    const [visible, setVisible] = useState(false)
    const {type, setType} = useContext(TypeContext)
    const {language, setLanguage} = useContext(LanguageContext)
    const {format, setFormat} = useContext(FormatContext)
    const {quality, setQuality} = useContext(QualityContext)
    const [cookieDeleted, setCookieDeleted] = useState(false)

    useEffect(() => {
        const showSettingsDialog = (event: any, update: any) => {
            setVisible((prev) => !prev)
        }
        const closeAllDialogs = (event: any, ignore: any) => {
            if (ignore !== "settings") setVisible(false)
        }
        ipcRenderer.on("show-settings-dialog", showSettingsDialog)
        ipcRenderer.on("close-all-dialogs", closeAllDialogs)
        initSettings()
        return () => {
            ipcRenderer.removeListener("show-settings-dialog", showSettingsDialog)
            ipcRenderer.removeListener("close-all-dialogs", closeAllDialogs)
        }
    }, [])

    const initSettings = async () => {
        const settings = await ipcRenderer.invoke("init-settings")
        if (settings.videoQuality) setVideoQuality(settings.videoQuality)
        if (settings.template) setTemplate(settings.template)
    }

    useEffect(() => {
        ipcRenderer.invoke("store-settings", {template, videoQuality})
    })

    const ok = () => {
        setVisible(false)
    }

    const revert = () => {
        setVideoQuality(16)
        setTemplate("{seasonTitle} {episodeNumber}")
        setType("sub")
        setLanguage("enUS")
        setFormat("mp4")
        setQuality("1080")
    }

    const changeTemplate = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value
        setTemplate(value)
    }

    const changeVideoQuality = (event: React.ChangeEvent<HTMLInputElement>) => {
        let value = event.target.value
        if (value.includes(".")) return
        if (value.length > 2) return
        if (Number.isNaN(Number(value))) return
        if (Number(value) > 51) value = "51"
        setVideoQuality(value)
    }

    const changeVideoQualityKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "ArrowUp") {
            setVideoQuality((prev: any) => {
                if (Number(prev) + 1 > 51) return Number(prev)
                return Number(prev) + 1
            })
        } else if (event.key === "ArrowDown") {
            setVideoQuality((prev: any) => {
                if (Number(prev) - 1 < 0) return Number(prev)
                return Number(prev) - 1
            })
        }
    }

    const deleteCookie = () => {
        ipcRenderer.invoke("delete-cookies")
        setCookieDeleted(true)
        setTimeout(() => {setCookieDeleted(false)}, 2000)
    }

    if (visible) {
        return (
            <section className="settings-dialog">
                <div className="settings-dialog-box">
                    <div className="settings-container">
                        <div className="settings-title-container">
                            <p className="settings-title">Advanced Settings</p>
                        </div>
                        <div className="settings-row-container">
                            <div className="settings-row">
                                <p className="settings-text">Video Quality: </p>
                                <input className="settings-input" type="text" spellCheck="false" value={videoQuality} onChange={changeVideoQuality} onKeyDown={changeVideoQualityKey}/>
                            </div>
                            <div className="settings-row">
                                <p className="settings-text">Output: </p>
                                <input className="settings-input wide" type="text" spellCheck="false" value={template} onChange={changeTemplate}/>
                            </div>
                            <div className="settings-row">
                                <button onClick={deleteCookie} className="cookie-button">Delete Cookies</button>
                                {cookieDeleted ? <p className="cookie-text">Deleted!</p> : null}
                            </div>
                        </div>
                        <div className="settings-button-container">
                         <button onClick={revert} className="revert-button">Revert</button>
                            <button onClick={ok} className="ok-button">Ok</button>
                        </div>
                    </div>
                </div>
            </section>
        )
    }
    return null
}

export default AdvancedSettings