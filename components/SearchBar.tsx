import {ipcRenderer} from "electron"
import React, {useState, useEffect, useRef} from "react"
import folderButton from "../assets/folderButton.png"
import searchButton from "../assets/searchButton.png"
import ErrorMessage from "./ErrorMessage"
import folderButtonHover from "../assets/folderButton-hover.png"
import searchButtonHover from "../assets/searchButton-hover.png"
import "../styles/searchbar.less"
import Store from "electron-store"
import { CrunchyrollEpisode } from "crunchyroll.ts"

const SearchBar: React.FunctionComponent = (props) => {
    const [id, setID] = useState(1)
    const [directory, setDirectory] = useState("")
    const [folderHover, setFolderHover] = useState(false)
    const [searchHover, setSearchHover] = useState(false)
    const [language, setLanguage] = useState("sub")
    const [format, setFormat] = useState("mp4")
    const [quality, setQuality] = useState("1080")
    const searchBoxRef = useRef(null) as React.RefObject<HTMLInputElement>
    
    useEffect(() => {
        ipcRenderer.invoke("get-downloads-folder").then((f) => setDirectory(f))
    }, [])

    const changeDirectory = async () => {
        const dir = await ipcRenderer.invoke("select-directory")
        if (dir) setDirectory(dir)
    }

    const parseAnime = async (link: string) => {
        const html = await fetch(link).then((r) => r.text())
        const match = html.match(/(?<=<div class="show-actions" group_id=")(.*?)(?=")/)?.[0]
        return match ? match : link
    }

    const parseSubtitles = async (info: {id: number, episode: CrunchyrollEpisode, dest: string}) => {
        const html = await fetch(info.episode.url).then((r) => r.text())
        const vilos = JSON.parse(html.match(/(?<=vilos.config.media = )(.*?)(?=;)/)?.[0] ?? "")
        const subtitles = vilos?.subtitles.filter((s: any) => s.language === "enUS")
        if (!subtitles) return ipcRenderer.invoke("download-error", "subtitles")
        ipcRenderer.invoke("download-subtitles", {url: subtitles[0].url, dest: info.dest, id: info.id, episode: info.episode})
    }
      
    const search = async () => {
        let searchText = searchBoxRef.current?.value.trim() ?? ""
        searchBoxRef.current!.value = ""
        if (!searchText) return
        if (searchText.startsWith("http") && !/\d{5,}/.test(searchText)) searchText = await parseAnime(searchText)
        let opts = {resolution: Number(quality)} as any
        if (language === "sub") opts.preferSub = true
        if (language === "dub") opts.preferDub = true
        if (format === "mp3") opts.audioOnly = true
        if (format === "m3u8") opts.skipConversion = true
        if (format === "png") opts.thumbnails = true
        if (format === "txt") opts.subtitles = true
        const episode = await ipcRenderer.invoke("get-episode", searchText, opts)
        if (!episode) {
            const episodes = await ipcRenderer.invoke("get-episodes", searchText, opts)
            if (!episodes) return
            let current = id
            for (let i = 0; i < episodes.length; i++) {
                if (opts.subtitles) {
                    parseSubtitles({id: current, episode: episodes[i], dest: directory.replace(/\\+/g, "/")})
                } else {
                    ipcRenderer.invoke("download", {id: current, episode: episodes[i], dest: directory.replace(/\\+/g, "/"), ...opts})
                }
            current += 1
            setID(prev => prev + 1)
            }
        } else {
            if (opts.subtitles) {
                parseSubtitles({id, episode, dest: directory.replace(/\\+/g, "/")})
            } else {
                ipcRenderer.invoke("download", {id, episode, dest: directory.replace(/\\+/g, "/"), ...opts})
            }
            setID(prev => prev + 1)
        }
    }

    const processCheckbox = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value 
        if (value === "sub") setLanguage("sub")
        if (value === "dub") setLanguage("dub")
        if (value === "mp4") setFormat("mp4")
        if (value === "mp3") setFormat("mp3")
        if (value === "m3u8") setFormat("m3u8")
        if (value === "png") setFormat("png")
        if (value === "txt") setFormat("txt")
        if (value === "1080") setQuality("1080")
        if (value === "720") setQuality("720")
        if (value === "480") setQuality("480")
    }

    const enterSearch = (event: React.KeyboardEvent<HTMLElement>) => {
        event.stopPropagation()
        if (event.key === "Enter") search()
    }

    return (
        <section className="search-container" onKeyDown={enterSearch}>
            <div className="search-location">
                <div className="search-bar">
                    <input className="search-box" type="search" ref={searchBoxRef} spellCheck="false" placeholder="Crunchyroll link or anime name..." onKeyDown={enterSearch}/>
                    <button className="search-button" type="submit" id="submit" onClick={search}>
                        <img className="search-button-img" src={searchHover ? searchButtonHover : searchButton} onMouseEnter={() => setSearchHover(true)} onMouseLeave={() => setSearchHover(false)}/>
                    </button>
                </div>
            </div>
            <ErrorMessage/>
            <div className="download-location" onKeyDown={enterSearch}>
                <img className="download-location-img" width="25" height="25" src={folderHover ? folderButtonHover : folderButton} onMouseEnter={() => setFolderHover(true)} onMouseLeave={() => setFolderHover(false)} onClick={changeDirectory}/>
                <p><span className="download-location-text">{directory}</span></p>
            </div>
            <div className="dropdown-options" onKeyDown={enterSearch}>
                <div>
                    <input className="dropdown-checkbox" type="checkbox" checked={language === "sub"} value="sub" onChange={processCheckbox}/>
                    <label className="dropdown-label" onClick={() => setLanguage("sub")}>sub</label>
                </div>
                <div>
                    <input className="dropdown-checkbox" type="checkbox" checked={language === "dub"} value="dub" onChange={processCheckbox}/>
                    <label className="dropdown-label" onClick={() => setLanguage("dub")}>dub</label>
                </div>
                <div>
                    <input className="dropdown-checkbox" type="checkbox" checked={format === "mp4"} value="mp4" onChange={processCheckbox}/>
                    <label className="dropdown-label" onClick={() => setFormat("mp4")}>mp4</label>
                </div>
                <div>
                    <input className="dropdown-checkbox" type="checkbox" checked={format === "mp3"} value="mp3" onChange={processCheckbox}/>
                    <label className="dropdown-label" onClick={() => setFormat("mp3")}>mp3</label>
                </div>
                <div>
                    <input className="dropdown-checkbox" type="checkbox" checked={format === "m3u8"} value="m3u8" onChange={processCheckbox}/>
                    <label className="dropdown-label" onClick={() => setFormat("m3u8")}>m3u8</label>
                </div>
                <div>
                    <input className="dropdown-checkbox" type="checkbox" checked={format === "txt"} value="txt" onChange={processCheckbox}/>
                    <label className="dropdown-label" onClick={() => setFormat("txt")}>txt</label>
                </div>
                <div>
                    <input className="dropdown-checkbox" type="checkbox" checked={format === "png"} value="png" onChange={processCheckbox}/>
                    <label className="dropdown-label" onClick={() => setFormat("png")}>png</label>
                </div>
                <div>
                    <input className="dropdown-checkbox" type="checkbox" checked={quality === "1080"} value="1080" onChange={processCheckbox}/>
                    <label className="dropdown-label" onClick={() => setQuality("1080")}>1080p</label>
                </div>
                <div>
                    <input className="dropdown-checkbox" type="checkbox" checked={quality === "720"} value="720" onChange={processCheckbox}/>
                    <label className="dropdown-label" onClick={() => setQuality("720")}>720p</label>
                </div>
                <div>
                    <input className="dropdown-checkbox" type="checkbox" checked={quality === "480"} value="480" onChange={processCheckbox}/>
                    <label className="dropdown-label" onClick={() => setQuality("480")}>480p</label>
                </div>
            </div>
        </section>
    )
}

export default SearchBar