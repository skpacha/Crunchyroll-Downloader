import {ipcRenderer} from "electron"
import React, {useContext, useState} from "react"
import clearAllButtonHover from "../assets/clearAll-hover.png"
import clearAllButton from "../assets/clearAll.png"
import {ClearAllContext} from "../renderer"
import "../styles/groupaction.less"

const GroupAction: React.FunctionComponent = (props) => {
    const {clearAll, setClearAll} = useContext(ClearAllContext)
    const [clearHover, setClearHover] = useState(false)

    const clear = () => {
        ipcRenderer.invoke("clear-all")
        setClearHover(false)
    }

    if (clearAll) {
        return (
            <section className="group-action-container">
                    <img src={clearHover ? clearAllButtonHover : clearAllButton} onClick={clear} className="group-action-button" width="319" height="61" onMouseEnter={() => setClearHover(true)} onMouseLeave={() => setClearHover(false)}/>
            </section>
        )
    }
    return null
}

export default GroupAction