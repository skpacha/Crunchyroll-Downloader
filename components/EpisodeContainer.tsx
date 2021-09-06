import {CrunchyrollEpisode, FFmpegProgress} from "crunchyroll.ts"
import {ipcRenderer, remote} from "electron"
import functions from "../structures/functions"
import React, {useState, useEffect, useRef, useReducer} from "react"
import mp4Label from "../assets/mp4Label.png"
import {ProgressBar} from "react-bootstrap"
import mp3Label from "../assets/mp3Label.png"
import m3u8Label from "../assets/m3u8Label.png"
import pngLabel from "../assets/pngLabel.png"
import assLabel from "../assets/assLabel.png"
import mkvLabel from "../assets/mkvLabel.png"
import closeContainer from "../assets/closeContainer.png"
import pauseButton from "../assets/pauseButton.png"
import playButton from "../assets/playButton.png"
import stopButton from "../assets/stopButton.png"
import locationButton from "../assets/locationButton.png"
import trashButton from "../assets/trashButton.png"
import closeContainerHover from "../assets/closeContainer-hover.png"
import pauseButtonHover from "../assets/pauseButton-hover.png"
import playButtonHover from "../assets/playButton-hover.png"
import stopButtonHover from "../assets/stopButton-hover.png"
import locationButtonHover from "../assets/locationButton-hover.png"
import trashButtonHover from "../assets/trashButton-hover.png"
import playVideo from "../assets/playVideo.png"
import playVideoHover from "../assets/playVideo-hover.png"
import pSBC from "shade-blend-color"
import "../styles/episodecontainer.less"

export interface EpisodeContainerProps {
    id: number
    episode: CrunchyrollEpisode
    format: string
    progress: FFmpegProgress
    remove: (id: number) => void
    kind: string
}

const EpisodeContainer: React.FunctionComponent<EpisodeContainerProps> = (props: EpisodeContainerProps) => {
    const [resolution, setResolution] = useState(0)
    const [paused, setPaused] = useState(false)
    const [deleted, setDeleted] = useState(false)
    const [stopped, setStopped] = useState(false)
    const [progress, setProgress] = useState(props.progress.percent) 
    const [time, setTime] = useState("")
    const [output, setOutput] = useState("")
    const [hover, setHover] = useState(false)
    const [hoverClose, setHoverClose] = useState(false)
    const [hoverPause, setHoverPause] = useState(false)
    const [hoverPlay, setHoverPlay] = useState(false)
    const [hoverStop, setHoverStop] = useState(false)
    const [hoverLocation, setHoverLocation] = useState(false)
    const [hoverTrash, setHoverTrash] = useState(false)
    const [hoverVideo, setHoverVideo] = useState(false)
    const [progressColor, setProgressColor] = useState("")
    const [backgroundColor, setBackgroundColor] = useState("")
    const [clearSignal, setClearSignal] = useState(false)
    const [stopSignal, setStopSignal] = useState(false)
    const [deleteSignal, setDeleteSignal] = useState(false)
    const [skipped, setSkipped] = useState(false)
    const [started, setStarted] = useState(false) 
    const [ignored, forceUpdate] = useReducer(x => x + 1, 0)
    const progressBarRef = useRef(null) as React.RefObject<HTMLDivElement>
    const episodeContainerRef = useRef(null) as React.RefObject<HTMLElement>
    
    useEffect(() => {
        const downloadProgress = (event: any, info: {id: number, progress: FFmpegProgress}) => {
            if (info.id === props.id) {
                if (resolution !== info.progress.resolution) setResolution(info.progress.resolution)
                setProgress(info.progress.percent)
                setTime(`${functions.formatMS(info.progress.time)} / ${functions.formatMS(info.progress.duration)}`)
            }
        }
        const downloadStarted = (event: any, info: {id: number, kind: string, episode: CrunchyrollEpisode, format: string}) => {
            if (info.id === props.id) {
                setStarted(true)
            }
        }
        const downloadEnded = (event: any, info: {id: number, output: string, skipped?: boolean}) => {
            if (info.id === props.id) {
                setOutput(info.output)
                if (info.skipped) setSkipped(true)
            }
        }
        const clearAll = () => {
            setClearSignal(true)
        }
        const stopAll = () => {
            setStopSignal(true)
        }
        const deleteAll = () => {
            setDeleteSignal(true)
        }
        ipcRenderer.on("download-progress", downloadProgress)
        ipcRenderer.on("download-started", downloadStarted)
        ipcRenderer.on("download-ended", downloadEnded)
        ipcRenderer.on("clear-all", clearAll)
        ipcRenderer.on("stop-all", stopAll)
        ipcRenderer.on("delete-all", deleteAll)
        ipcRenderer.on("update-color", forceUpdate)
        return () => {
            ipcRenderer.removeListener("download-progress", downloadProgress)
            ipcRenderer.removeListener("download-started", downloadStarted)
            ipcRenderer.removeListener("download-ended", downloadEnded)
            ipcRenderer.removeListener("clear-all", clearAll)
            ipcRenderer.removeListener("stop-all", stopAll)
            ipcRenderer.removeListener("delete-all", deleteAll)
            ipcRenderer.removeListener("update-color", forceUpdate)
        }
    }, [])

    useEffect(() => {
        updateProgressColor()
        updateBackgroundColor()
        if (clearSignal) {
            if (output || skipped) closeDownload()
            setClearSignal(false)
        }
        if (stopSignal) stopDownload()
        if (deleteSignal) deleteDownload()
    })

    const deleteDownload = async () => {
        if (deleted) return
        setDeleteSignal(false)
        ipcRenderer.invoke("move-queue")
        const success = await ipcRenderer.invoke("delete-download", props.id)
        if (success) setDeleted(true)
    }

    const closeDownload = async () => {
        ipcRenderer.invoke("move-queue")
        if (!output) ipcRenderer.invoke("delete-download", props.id)
        props.remove(props.id)
    }
    
    const stopDownload = async () => {
        if (stopped) return
        setStopSignal(false)
        ipcRenderer.invoke("move-queue")
        if (progress < 0 || progress >= 99) return
        const success = await ipcRenderer.invoke("stop-download", props.id)
        if (success) setStopped(true)
    }

    const handlePause = async () => {
        if (paused) {
            ipcRenderer.invoke("resume-download", props.id)
            setPaused(false)
        } else {
            ipcRenderer.invoke("pause-download", props.id)
            setPaused(true)
        }
    }

    const openLocation = async () => {
        ipcRenderer.invoke("open-location", output)
    }

    const prettyProgress = () => {
        let str = ""
        if (progress < 0 || progress > 100) {
            str = `${parseInt(String(progress))}%`
        }
        str = `${progress.toFixed(2)}%`
        return paused ? `${str} (Paused)` : str
    }

    const updateBackgroundColor = async () => {
        const colors = ["#f6642c", "#f6432c", "#f62c55", "#2c79f6", "#f62c98", "#f62c4a", "#2c69f6"]
        const container = episodeContainerRef.current?.querySelector(".episode-container") as HTMLElement
        if (!container) return
        if (!backgroundColor) {
            const color = colors[Math.floor(Math.random() * colors.length)]
            setBackgroundColor(color)
        }
        const theme = await ipcRenderer.invoke("get-theme")
        if (theme === "light") {
            const text = episodeContainerRef.current?.querySelectorAll(".ep-text, .ep-text-alt") as NodeListOf<HTMLElement>
            text.forEach((t) => {
                t.style.color = "black"
            })
            container.style.backgroundColor = backgroundColor
            container.style.border = `2px solid ${pSBC(0.4, backgroundColor)}`
        } else {
            const text = episodeContainerRef.current?.querySelectorAll(".ep-text, .ep-text-alt") as NodeListOf<HTMLElement>
            text.forEach((t) => {
                t.style.color = backgroundColor
            })
            container.style.backgroundColor = "#090409"
            container.style.border = `2px solid #090409`
        }
    }

    const updateProgressColor = () => {
        const colors = ["#214dff", "#ff2ba7", "#ff2942", "#ff2994", "#c229ff", "#5b29ff", "#29b1ff", "#ff8d29"]
        const progressBar = progressBarRef.current?.querySelector(".progress-bar") as HTMLElement
        if (progress < 0 && !output) {
             setProgressColor("#573dff")
        } else {
            if (progressColor === "#573dff") setProgressColor(colors[Math.floor(Math.random() * colors.length)])
            if (output) setProgressColor("#2bff64")
            if (skipped) setProgressColor("#ff40d9")
            if (stopped) setProgressColor("#ff2441")
            if (deleted) setProgressColor("#8c21ff")
        }
        progressBar.style.backgroundColor = progressColor
    }

    const generateProgressBar = () => {
        let jsx = <p className="ep-text-progress">{prettyProgress()}</p>
        let progressJSX = <ProgressBar ref={progressBarRef} animated now={progress}/>
        if (progress < 0 && !output) {
            jsx = <p className="ep-text-progress black">Waiting...</p>
            progressJSX = <ProgressBar ref={progressBarRef} animated now={100}/>
        } else {
            if (output) {
                jsx = <p className="ep-text-progress black">Finished</p>
                progressJSX = <ProgressBar ref={progressBarRef} animated now={100}/>
            }
            if (skipped) {
                jsx = <p className="ep-text-progress black">Skipped</p>
                progressJSX = <ProgressBar ref={progressBarRef} animated now={100}/>
            }
            if (stopped) {
                jsx = <p className="ep-text-progress black">Stopped</p>
                progressJSX = <ProgressBar ref={progressBarRef} animated now={100}/>
            }
            if (deleted) {
                jsx = <p className="ep-text-progress black">Deleted</p>
                progressJSX = <ProgressBar ref={progressBarRef} animated now={100}/>
            }
        }
        return (
            <>
            <div className="ep-text-progress-container">{jsx}</div>
            {progressJSX}
            </>
        )
    }

    const resolutionInfo = () => {
        return resolution ? `${props.kind} ${resolution}p` : props.kind
    }

    const mouseEnter = () => {
        document.documentElement.style.setProperty("--selection-color", pSBC(0.5, backgroundColor))
    }

    const mouseLeave = () => {
        setHover(false)
        document.documentElement.style.setProperty("--selection-color", "#ff9270")
    }

    const getLabel = () => {
        if (props.format === "mp4") return mp4Label
        if (props.format === "mkv") return mkvLabel
        if (props.format === "mp3") return mp3Label
        if (props.format === "m3u8") return m3u8Label
        if (props.format === "ass") return assLabel
        if (props.format === "png") return pngLabel
    }

    const videoButton = () => {
        if (output) remote.shell.openExternal(output)
    }

    const openAnime = async (url: string) => {
        let anime = ""
        if (/beta/.test(url)) {
            const html = await fetch(url).then((r) => r.text())
            const id = html.match(/(?<="series_id":")(.*)(?=","series_title":)/gm)?.[0]
            anime = `https://beta.crunchyroll.com/series/${id}`
        } else {
            anime = url.match(/(.*?)(?=\/e)/)![0]
        }
        ipcRenderer.invoke("open-url", anime)
    }

    return (
        <section ref={episodeContainerRef} className="episode-wrap-container" onMouseOver={() => setHover(true)} onMouseEnter={mouseEnter} onMouseLeave={mouseLeave}>
            <div className="episode-container" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
            <div className="ep-img">
                <img src={props.episode.screenshot_image.large_url}/>
            </div>
            <div className="ep-middle">
                <div className="ep-name">
                    <p className="ep-text hover" onMouseDown={(event) => event.stopPropagation()}><span onClick={() => ipcRenderer.invoke("open-url", props.episode.url)}>{props.episode.name}</span></p>
                    <img className="ep-label" src={getLabel()}/>
                    {output ? <img className="ep-video" width="30" height="30" src={hoverVideo ? playVideoHover : playVideo} onClick={videoButton} onMouseEnter={() => setHoverVideo(true)} onMouseLeave={() => setHoverVideo(false)} onMouseDown={(event) => event.stopPropagation()}/> : null}
                </div>
                <div className="ep-info">
                    <div className="ep-info-col">
                        <p className="ep-text hover" onMouseDown={(event) => event.stopPropagation()}><span onClick={() => openAnime(props.episode.url)}>Anime: {props.episode.collection_name?.replace(/-/g, " ")}</span></p>
                        <p className="ep-text" onMouseDown={(event) => event.stopPropagation()}>Episode: {props.episode.episode_number}</p>
                    </div>
                    <div className="ep-info-col">
                        <p className="ep-text-alt" onMouseDown={(event) => event.stopPropagation()}>{resolutionInfo()}</p>
                        <p className="ep-text-alt" onMouseDown={(event) => event.stopPropagation()}>{time}</p>
                    </div>
                </div>
                <div className="ep-progress">
                    {generateProgressBar()}
                </div>
            </div>
            <div className="ep-buttons">
                {hover ? <img className="ep-button close-container" width="28" height="28" onMouseDown={(event) => event.stopPropagation()} src={hoverClose ? closeContainerHover : closeContainer} onClick={closeDownload} onMouseEnter={() => setHoverClose(true)} onMouseLeave={() => setHoverClose(false)}/> : null}
                <div className="ep-button-row">
                    <img className="ep-button" width="50" height="50" onMouseDown={(event) => event.stopPropagation()} src={paused ? (hoverPlay ? playButtonHover : playButton) : (hoverPause ? pauseButtonHover : pauseButton)} onClick={handlePause} onMouseEnter={() => {setHoverPlay(true); setHoverPause(true)}} onMouseLeave={() => {setHoverPlay(false); setHoverPause(false)}}/>
                    <img className="ep-button" width="50" height="50" onMouseDown={(event) => event.stopPropagation()} src={hoverStop ? stopButtonHover : stopButton} onClick={stopDownload} onMouseEnter={() => setHoverStop(true)} onMouseLeave={() => setHoverStop(false)}/>
                </div>
                <div className="ep-button-row">
                    {output ? <img className="ep-button" width="50" height="50" onMouseDown={(event) => event.stopPropagation()} src={hoverLocation ? locationButtonHover : locationButton} onClick={openLocation} onMouseEnter={() => setHoverLocation(true)} onMouseLeave={() => setHoverLocation(false)}/> : null}
                    {output ? <img className="ep-button" width="50" height="50" onMouseDown={(event) => event.stopPropagation()} src={hoverTrash ? trashButtonHover : trashButton} onClick={deleteDownload} onMouseEnter={() => setHoverTrash(true)} onMouseLeave={() => setHoverTrash(false)}/> : null}    
                </div>
            </div>
            </div>
        </section>
    )
}

export default EpisodeContainer