import {ipcRenderer} from "electron"
import React, {useState, useEffect, useRef} from "react"
import {Dropdown, DropdownButton} from "react-bootstrap"
import folderButton from "../assets/folderButton.png"
import searchButton from "../assets/searchButton.png"
import ErrorMessage from "./ErrorMessage"
import folderButtonHover from "../assets/folderButton-hover.png"
import searchButtonHover from "../assets/searchButton-hover.png"
import "../styles/searchbar.less"
import {CrunchyrollEpisode} from "crunchyroll.ts"
import functions from "../structures/functions"

const SearchBar: React.FunctionComponent = (props) => {
    const [id, setID] = useState(1)
    const [directory, setDirectory] = useState("")
    const [folderHover, setFolderHover] = useState(false)
    const [searchHover, setSearchHover] = useState(false)
    const [type, setType] = useState("sub")
    const [language, setLanguage] = useState("enUS")
    const [format, setFormat] = useState("mp4")
    const [quality, setQuality] = useState("1080")
    const searchBoxRef = useRef(null) as React.RefObject<HTMLInputElement>
    
    useEffect(() => {
        ipcRenderer.invoke("get-downloads-folder").then((f) => setDirectory(f))
    }, [])

    useEffect(() => {
        const downloadURL = (event: any, url: string) => {
            if (url) download(url)
        }
        ipcRenderer.on("download-url", downloadURL)
        return () => {
            ipcRenderer.removeListener("download-url", downloadURL)
        }
    })

    const changeDirectory = async () => {
        const dir = await ipcRenderer.invoke("select-directory")
        if (dir) setDirectory(dir)
    }

    const parseAnime = async (url: string) => {
        const cookie = await ipcRenderer.invoke("get-cookie")
        if (url.endsWith("/")) url = url.slice(0, -1)
        const html = await fetch(url, {headers: {cookie}}).then((r) => r.text())
        const match = html.match(/(?<=<div class="show-actions" group_id=")(.*?)(?=")/)?.[0]
        return match ? match : url
    }

    const parseEpisode = async (url: string) => {
        const cookie = await ipcRenderer.invoke("get-cookie")
        if (url.endsWith("/")) url = url.slice(0, -1)
        const html = await fetch(`${url}?skip_wall=1`, {headers: {cookie}}).then((r) => r.text())
        let vilos = null
        try {
            vilos = JSON.parse(html.match(/(?<=vilos.config.media = )(.*?)(?=;)/)?.[0] ?? "")
        } catch {
            return null
        }
        const seasonTitle = html.match(/(?<=<title>)(.*?)(?= Episode)/i)?.[0]
        const episode = {...vilos.metadata, url, name: vilos.metadata.title, collection_name: seasonTitle, screenshot_image: {large_url: vilos.thumbnail.url}, bif_url: vilos.preview.src}
        return episode
    }

    const parseEpisodes = async (url: string) => {
        const cookie = await ipcRenderer.invoke("get-cookie")
        if (url.endsWith("/")) url = url.slice(0, -1)
        const html = await fetch(`${url}?skip_wall=1`, {headers: {cookie}}).then((r) => r.text())
        let urls = html.match(/(episode)(.*?)(?=" title)/gm)
        if (!urls) return ipcRenderer.invoke("download-error", "search")
        urls = urls.map((u) => `${url}/${u}`)
        let episodes = await Promise.all(urls.map((u) => parseEpisode(u)))
        return episodes
    }

    const parsePlaylist = async (url: string, noSub?: boolean) => {
        const cookie = await ipcRenderer.invoke("get-cookie")
        if (url.endsWith("/")) url = url.slice(0, -1)
        const html = await fetch(`${url}?skip_wall=1`, {headers: {cookie}}).then((r) => r.text())
        const vilos = JSON.parse(html.match(/(?<=vilos.config.media = )(.*?)(?=;)/)?.[0] ?? "")
        const hls = vilos?.streams.filter((s: any) => s.format === "adaptive_hls" || s.format === "trailer_hls")
        let audioLang = type === "sub" ? "jaJP" : language
        let subLang = type === "dub" || noSub ? null : language
        let stream = hls?.find((s: any) => s.audio_lang === audioLang && s.hardsub_lang === subLang)
        if (!stream && language === "esLA") stream = hls?.find((s: any) => s.audio_lang === "esES" && s.hardsub_lang === subLang)
        if (!stream && language === "ptBR") stream = hls?.find((s: any) => s.audio_lang === "ptPT" && s.hardsub_lang === subLang)
        if (!stream) return null
        return stream.url
    }

    const parseSubtitles = async (info: {id: number, episode: CrunchyrollEpisode, dest: string, kind: string}, error?: boolean, noDL?: boolean) => {
        const cookie = await ipcRenderer.invoke("get-cookie")
        const html = await fetch(info.episode.url, {headers: {cookie}}).then((r) => r.text())
        const vilos = JSON.parse(html.match(/(?<=vilos.config.media = )(.*?)(?=;)/)?.[0] ?? "")
        let subtitles = vilos?.subtitles.filter((s: any) => s.language === language)
        if (!subtitles && language === "esLA") subtitles = vilos?.subtitles.filter((s: any) => s.language === "esES")
        if (!subtitles && language === "ptBR") subtitles = vilos?.subtitles.filter((s: any) => s.language === "ptPT")
        if (!subtitles) return error ? ipcRenderer.invoke("download-error", "search") : null
        if (!noDL) ipcRenderer.invoke("download-subtitles", {url: subtitles[0].url, dest: info.dest, id: info.id, episode: info.episode, kind: info.kind})
        return subtitles[0].url
    }

    const getKind = () => {
        return `${functions.parseLocale(language)} ${type === "dub" ? "Dub" : "Sub"}`
    }

    const search = () => {
        let searchText = searchBoxRef.current?.value.trim() ?? ""
        searchBoxRef.current!.value = ""
        return download(searchText)
    }
      
    const download = async (searchText: string) => {
        if (!searchText) return
        let opts = {resolution: Number(quality), language} as any
        if (type === "sub") opts.preferSub = true
        if (type === "dub") {
            opts.preferSub = false
            opts.preferDub = true
        }
        if (format === "mp3") opts.audioOnly = true
        if (format === "m3u8") opts.skipConversion = true
        if (format === "png") opts.thumbnails = true
        if (format === "ass") opts.subtitles = true
        if (format === "mkv") opts.softSubs = true
        opts.kind = getKind()
        let episode = await ipcRenderer.invoke("get-episode", searchText, opts)
        if (!episode) {
            let episodes = await ipcRenderer.invoke("get-episodes", searchText, opts)
            if (!episodes) {
                if (/crunchyroll.com/.test(searchText)) {
                    episodes = await parseEpisodes(searchText)
                } else {
                    return ipcRenderer.invoke("download-error", "search")
                }
            }
            let current = id
            let downloaded = false
            for (let i = 0; i < episodes.length; i++) {
                await functions.timeout(100)
                if (opts.subtitles) {
                    const subtitles = await parseSubtitles({id: current, episode: episodes[i], dest: directory.replace(/\\+/g, "/"), kind: opts.kind})
                    if (subtitles) downloaded = true
                } else if (opts.softSubs) {
                    const subtitles = await parseSubtitles({id: current, episode: episodes[i], dest: directory.replace(/\\+/g, "/"), kind: opts.kind}, false, true)
                    const playlist = await parsePlaylist(episodes[i].url, true)
                    if (!playlist || !subtitles) continue
                    downloaded = true
                    ipcRenderer.invoke("download", {id: current, episode: episodes[i], dest: directory.replace(/\\+/g, "/"), playlist, subtitles, ...opts})
                } else {
                    const playlist = await parsePlaylist(episodes[i].url)
                    if (!playlist) continue
                    downloaded = true
                    ipcRenderer.invoke("download", {id: current, episode: episodes[i], dest: directory.replace(/\\+/g, "/"), playlist, ...opts})
                    }
                current += 1
                setID(prev => prev + 1)
            }
            if (!downloaded) return ipcRenderer.invoke("download-error", "search")
        } else {
            if (opts.subtitles) {
                setID((prev) => {
                    parseSubtitles({id: prev, episode, dest: directory.replace(/\\+/g, "/"), kind: opts.kind}, true)
                    return prev + 1
                })
            } else if (opts.softSubs) {
                    const subtitles = await parseSubtitles({id: 0, episode, dest: directory.replace(/\\+/g, "/"), kind: opts.kind}, false, true)
                    const playlist = await parsePlaylist(episode.url, true)
                    if (!playlist || !subtitles) return ipcRenderer.invoke("download-error", "search")
                    setID((prev) => {
                        ipcRenderer.invoke("download", {id: prev, episode, dest: directory.replace(/\\+/g, "/"), playlist, subtitles, ...opts})
                        return prev + 1
                    })
            } else {
                if (!episode.url) episode = await parseEpisode(episode)
                const playlist = await parsePlaylist(episode.url)
                if (!playlist) return ipcRenderer.invoke("download-error", "search")
                setID((prev) => {
                    ipcRenderer.invoke("download", {id: prev, episode, dest: directory.replace(/\\+/g, "/"), playlist, ...opts})
                    return prev + 1
                })
            }
        }
    }

    const enterSearch = (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key === "Enter") search()
    }

    return (
        <section className="search-container">
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
            <div className="dropdown-options">
                <div className="dropdown-container">
                    <p className="dropdown-label">Type: </p>
                    <DropdownButton title={type} drop="down">
                        <Dropdown.Item active={type === "sub"} onClick={() => {setType("sub"); if (language === "jaJP") setLanguage("enUS")}}>sub</Dropdown.Item>
                        <Dropdown.Item active={type === "dub"} onClick={() => {setType("dub"); if (format === "ass") setFormat("mp4")}}>dub</Dropdown.Item>
                    </DropdownButton>
                </div>
                <div className="dropdown-container">
                    <p className="dropdown-label">Language: </p>
                    <DropdownButton title={functions.parseLocale(language)} drop="down">
                        {type === "dub" ? <Dropdown.Item active={language === "jaJP"} onClick={() => setLanguage("jaJP")}>Japanese</Dropdown.Item> : null}
                        <Dropdown.Item active={language === "enUS"} onClick={() => setLanguage("enUS")}>English</Dropdown.Item>
                        <Dropdown.Item active={language === "esLA"} onClick={() => setLanguage("esLA")}>Spanish</Dropdown.Item>
                        <Dropdown.Item active={language === "frFR"} onClick={() => setLanguage("frFR")}>French</Dropdown.Item>
                        <Dropdown.Item active={language === "itIT"} onClick={() => setLanguage("itIT")}>Italian</Dropdown.Item>
                        <Dropdown.Item active={language === "deDE"} onClick={() => setLanguage("deDE")}>German</Dropdown.Item>
                        <Dropdown.Item active={language === "ruRU"} onClick={() => setLanguage("ruRU")}>Russian</Dropdown.Item>
                        <Dropdown.Item active={language === "ptBR"} onClick={() => setLanguage("ptBR")}>Portuguese</Dropdown.Item>
                        <Dropdown.Item active={language === "arME"} onClick={() => setLanguage("arME")}>Arabic</Dropdown.Item>
                    </DropdownButton>
                </div>
                <div className="dropdown-container">
                    <p className="dropdown-label">Format: </p>
                    <DropdownButton title={format} drop="down">
                        <Dropdown.Item active={format === "mp4"} onClick={() => setFormat("mp4")}>mp4</Dropdown.Item>
                        <Dropdown.Item active={format === "mkv"} onClick={() => setFormat("mkv")}>mkv</Dropdown.Item>
                        <Dropdown.Item active={format === "mp3"} onClick={() => setFormat("mp3")}>mp3</Dropdown.Item>
                        <Dropdown.Item active={format === "m3u8"} onClick={() => setFormat("m3u8")}>m3u8</Dropdown.Item>
                        {type === "sub" ? <Dropdown.Item active={format === "ass"} onClick={() => setFormat("ass")}>ass</Dropdown.Item> : null}
                        <Dropdown.Item active={format === "png"} onClick={() => setFormat("png")}>png</Dropdown.Item>
                    </DropdownButton>
                </div>
                <div className="dropdown-container">
                    <p className="dropdown-label">Quality: </p>
                    <DropdownButton title={`${quality}p`} drop="down">
                        <Dropdown.Item active={quality === "1080"} onClick={() => setQuality("1080")}>1080p</Dropdown.Item>
                        <Dropdown.Item active={quality === "720"} onClick={() => setQuality("720")}>720p</Dropdown.Item>
                        <Dropdown.Item active={quality === "480"} onClick={() => setQuality("480")}>480p</Dropdown.Item>
                        <Dropdown.Item active={quality === "360"} onClick={() => setQuality("360")}>360p</Dropdown.Item>
                        <Dropdown.Item active={quality === "240"} onClick={() => setQuality("240")}>240p</Dropdown.Item>
                    </DropdownButton>
                </div>
            </div>
        </section>
    )
}

export default SearchBar