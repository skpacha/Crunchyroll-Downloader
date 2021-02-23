import {ipcRenderer} from "electron"
import React, {useContext, useState} from "react"
import clearAllButtonHover from "../assets/clearAll-hover.png"
import clearAllButton from "../assets/clearAll.png"
import deleteAllButton from "../assets/deleteAll.png"
import deleteAllButtonHover from "../assets/deleteAll-hover.png"
import stopAllButton from "../assets/stopAll.png"
import stopAllButtonHover from "../assets/stopAll-hover.png"
import {ClearAllContext} from "../renderer"
import "../styles/groupaction.less"

const GroupAction: React.FunctionComponent = (props) => {
    const {clearAll} = useContext(ClearAllContext)
    const [clearHover, setClearHover] = useState(false)
    const [deleteHover, setDeleteHover] = useState(false)
    const [stopHover, setStopHover] = useState(false)

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

    if (clearAll) {
        return (
            <section className="group-action-container">
                    <img src={clearHover ? clearAllButtonHover : clearAllButton} onClick={clear} className="group-action-button" width="319" height="61" onMouseEnter={() => setClearHover(true)} onMouseLeave={() => setClearHover(false)}/>
                    <img src={stopHover ? stopAllButtonHover : stopAllButton} onClick={stop} className="group-action-button" width="319" height="61" onMouseEnter={() => setStopHover(true)} onMouseLeave={() => setStopHover(false)}/>
                    <img src={deleteHover ? deleteAllButtonHover : deleteAllButton} onClick={del} className="group-action-button" width="319" height="61" onMouseEnter={() => setDeleteHover(true)} onMouseLeave={() => setDeleteHover(false)}/>
            </section>
        )
    }
    return null
}

export default GroupAction