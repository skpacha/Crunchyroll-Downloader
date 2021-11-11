import {ipcRenderer} from "electron"
import React, {useContext, useEffect, useState} from "react"
import clearAllButtonHover from "../assets/clearFinished-hover.png"
import clearAllButton from "../assets/clearFinished.png"
import deleteAllButton from "../assets/deleteAll.png"
import deleteAllButtonHover from "../assets/deleteAll-hover.png"
import stopAllButton from "../assets/stopAll.png"
import stopAllButtonHover from "../assets/stopAll-hover.png"
import clearAllButtonDarkHover from "../assets/clearFinished-dark-hover.png"
import clearAllButtonDark from "../assets/clearFinished-dark.png"
import deleteAllButtonDark from "../assets/deleteAll-dark.png"
import deleteAllButtonDarkHover from "../assets/deleteAll-dark-hover.png"
import stopAllButtonDark from "../assets/stopAll-dark.png"
import stopAllButtonDarkHover from "../assets/stopAll-dark-hover.png"
import {ClearAllContext} from "../renderer"
import "../styles/groupaction.less"

const GroupAction: React.FunctionComponent = (props) => {
    const {clearAll} = useContext(ClearAllContext)
    const [clearHover, setClearHover] = useState(false)
    const [deleteHover, setDeleteHover] = useState(false)
    const [stopHover, setStopHover] = useState(false)
    const [color, setColor] = useState("light")

    useEffect(() => {
        const updateColor = (event: any, color: string) => {
            setColor(color)
        }
        ipcRenderer.on("update-color", updateColor)
        return () => {
            ipcRenderer.removeListener("update-color", updateColor)
        }
    }, [])

    const clear = () => {
        ipcRenderer.invoke("clear-all")
        setClearHover(false)
    }

    const del = () => {
        ipcRenderer.invoke("delete-all")
    }

    const stop = () => {
        ipcRenderer.invoke("stop-all")
    }

    const getImage = (type: string) => {
        if (type === "clear") {
            if (color === "light") {
                if (clearHover) {
                    return clearAllButtonHover
                } else {
                    return clearAllButton
                }
            } else {
                if (clearHover) {
                    return clearAllButtonDarkHover
                } else {
                    return clearAllButtonDark
                }
            }
        } else if (type === "stop") {
            if (color === "light") {
                if (stopHover) {
                    return stopAllButtonHover
                } else {
                    return stopAllButton
                }
            } else {
                if (stopHover) {
                    return stopAllButtonDarkHover
                } else {
                    return stopAllButtonDark
                }
            }
        } else if (type === "delete") {
            if (color === "light") {
                if (deleteHover) {
                    return deleteAllButtonHover
                } else {
                    return deleteAllButton
                }
            } else {
                if (deleteHover) {
                    return deleteAllButtonDarkHover
                } else {
                    return deleteAllButtonDark
                }
            }
        }
    }

    if (clearAll) {
        return (
            <section className="group-action-container">
                    <img src={getImage("clear")} onClick={clear} className="group-action-button" width="436" height="61" onMouseEnter={() => setClearHover(true)} onMouseLeave={() => setClearHover(false)}/>
                    <img src={getImage("stop")} onClick={stop} className="group-action-button" width="319" height="61" onMouseEnter={() => setStopHover(true)} onMouseLeave={() => setStopHover(false)}/>
                    <img src={getImage("delete")} onClick={del} className="group-action-button" width="319" height="61" onMouseEnter={() => setDeleteHover(true)} onMouseLeave={() => setDeleteHover(false)}/>
            </section>
        )
    }
    return null
}

export default GroupAction