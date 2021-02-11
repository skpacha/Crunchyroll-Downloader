import {ipcRenderer} from "electron"
import React, {useState, useEffect, useRef} from "react"
import EpisodeContainer from "./EpisodeContainer"
import Reorder from "react-reorder"
import {CrunchyrollEpisode, FFmpegProgress} from "crunchyroll.ts"
import "../styles/episodecontainerlist.less"

const EpisodeContainerList: React.FunctionComponent = (props) => {
    const [containers, setContainers] = useState([] as  Array<{id: number, jsx: any}>)
    useEffect(() => {
        const downloadStarted = (event: any, info: {id: number, episode: CrunchyrollEpisode, format: string}) => {
            const progress = {percent: -1} as FFmpegProgress
            setContainers(prev => {
                let newState = [...prev]
                const index = newState.findIndex((c) => c.id === info.id)
                if (index === -1) newState = [...newState, {id: info.id, jsx: <EpisodeContainer key={info.id} id={info.id} format={info.format} episode={info.episode} progress={progress} remove={removeContainer}/>}]
                return newState
            })
        }
        ipcRenderer.on("download-started", downloadStarted)
        return () => {
            ipcRenderer.removeListener("download-started", downloadStarted)
        }
    }, [])

    const removeContainer = (id: number) => {
        setContainers(prev => {
            const newState = [...prev]
            const index = newState.findIndex((c) => c.id === id)
            if  (index !== -1) newState.splice(index, 1)
            return newState
        })
    }

    const reorder = (event: React.MouseEvent, from: number, to: number) => {
        setContainers(prev => {
            const newState = [...prev]
            newState.splice(to, 0, newState.splice(from, 1)[0])
            return newState
        })
    }

    return (
        <Reorder reorderId="episode-containers" component="ul" holdTime={50} onReorder={reorder}>{
            containers.map((c) => (
                <li key={c.id}>
                    {c.jsx}
                </li>
            ))
        }</Reorder>
    )
}

export default EpisodeContainerList