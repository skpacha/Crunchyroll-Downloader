import {ipcRenderer, clipboard} from "electron"
import React, {useState, useEffect, useRef, useContext} from "react"
import {Dropdown, DropdownButton} from "react-bootstrap"
import folderButton from "../assets/folderButton.png"
import searchButton from "../assets/searchButton.png"
import ErrorMessage from "./ErrorMessage"
import folderButtonHover from "../assets/folderButton-hover.png"
import searchButtonHover from "../assets/searchButton-hover.png"
import "../styles/searchbar.less"
import {CrunchyrollEpisode} from "crunchyroll.ts"
import functions from "../structures/functions"
import {TypeContext, QualityContext, FormatContext, LanguageContext, TemplateContext, VideoQualityContext} from "../renderer"

const SearchBar: React.FunctionComponent = (props) => {
    const {template} = useContext(TemplateContext)
    const {videoQuality} = useContext(VideoQualityContext)
    const {type, setType} = useContext(TypeContext)
    const {language, setLanguage} = useContext(LanguageContext)
    const {format, setFormat} = useContext(FormatContext)
    const {quality, setQuality} = useContext(QualityContext)
    const [id, setID] = useState(1)
    const [directory, setDirectory] = useState("")
    const [folderHover, setFolderHover] = useState(false)
    const [searchHover, setSearchHover] = useState(false)
    const searchBoxRef = useRef(null) as React.RefObject<HTMLInputElement>
    
    useEffect(() => {
        ipcRenderer.invoke("get-downloads-folder").then((f) => setDirectory(f))
        initSettings()
        const triggerPaste = () => {
            const text = clipboard.readText()
            searchBoxRef.current!.value += text
        }
        ipcRenderer.on("trigger-paste", triggerPaste)
        return () => {
            ipcRenderer.removeListener("trigger-paste", triggerPaste)
        }
    }, [])

    useEffect(() => {
        const downloadURL = (event: any, url: string, html: string) => {
            if (url) download(url, html)
        }
        ipcRenderer.on("download-url", downloadURL)
        ipcRenderer.invoke("store-settings", {type, language, quality, format})
        return () => {
            ipcRenderer.removeListener("download-url", downloadURL)
        }
    })

    
    const initSettings = async () => {
        const settings = await ipcRenderer.invoke("init-settings")
        if (settings.type) setType(settings.type)
        if (settings.language) setLanguage(settings.language)
        if (settings.quality) setQuality(settings.quality)
        if (settings.format) setFormat(settings.format)
    }

    const changeDirectory = async () => {
        const dir = await ipcRenderer.invoke("select-directory")
        if (dir) setDirectory(dir)
    }

    const parseEpisode = async (url: string) => {
        const cookie = await ipcRenderer.invoke("get-cookie")
        if (url.endsWith("/")) url = url.slice(0, -1)
        const html = await fetch(functions.skipWall(url), {headers: {cookie}}).then((r) => r.text())
        let vilos = null
        try {
            vilos = JSON.parse(html.match(/(?<=vilos.config.media = )(.*)}(?=;)/)?.[0]!)
        } catch {
            return parseEpisodeBeta(url)
        }
        let seasonTitle = functions.epRegex(html)
        const seriesTitle = html.match(/(?<=type="application\/rss\+xml" title=")(.*?)(?= Episodes)/)?.[0]
        if (!seasonTitle) seasonTitle = seriesTitle
        const episode = {...vilos.metadata, url, name: vilos.metadata.title, series_name: seriesTitle, collection_name: seasonTitle, screenshot_image: {large_url: vilos.thumbnail.url}, bif_url: vilos.preview.src}
        return episode
    }

    const parseEpisodeBeta = async (url: string) => {
        const cookie = await ipcRenderer.invoke("get-cookie")
        if (/series/.test(url)) return null
        const html = await fetch(url, {headers: {cookie}}).then((r) => r.text())
        const id = html.match(/(?<=watch\/)(.*?)(?=\/)/)?.[0] ?? ""
        let json = null
        try {
            json = JSON.parse(html.match(/(?<=window\.__INITIAL_STATE__ = ){.*}/gm)?.[0]!)
        } catch {
            return null
        }
        const meta = json.content.byId[id]
        const streamsUrl = await ipcRenderer.invoke("get-streams")
        const streamsJSON = await fetch(streamsUrl, {headers: {cookie}}).then((r) => r.json())
        const episode = {...meta, episode_number: meta.episode_metadata.episode_number, duration: meta.episode_metadata.duration_ms, url,
        name: meta.title, series_name: meta.episode_metadata.series_title, collection_name: meta.episode_metadata.season_title, screenshot_image: {large_url: meta.images.thumbnail[0][0].source}, bif_url: streamsJSON.bifs[0]}
        return episode
    }

    const parseEpisodes = async (url: string, html?: string) => {
        const cookie = await ipcRenderer.invoke("get-cookie")
        if (url.endsWith("/")) url = url.slice(0, -1)
        if (!html) html = await fetch(functions.skipWall(url), {headers: {cookie}}).then((r) => r.text())
        let urls = html?.match(/(episode)(.*?)(?=" title)/gm)
        if (!urls) return ipcRenderer.invoke("download-error", "search")
        urls = urls.map((u) => `${url}/${u}`)
        let episodes = await Promise.all(urls.map((u) => parseEpisode(u)))
        return episodes.sort((a, b) => Number(a.episode_number) > Number(b.episode_number) ? 1 : -1)
    }

    const parseEpisodesBeta = async (url: string, html?: string) => {
        const cookie = await ipcRenderer.invoke("get-cookie")
        if (!html) html = await fetch(url, {headers: {cookie}}).then((r) => r.text())
        let urls = html?.match(/(?<=href="\/)watch\/(.*?)(?=")/gm) as string[]
        urls = functions.removeDuplicates(urls?.map((u) => `https://beta.crunchyroll.com/${u}`))
        if (!urls?.length) return ipcRenderer.invoke("download-error", "search")
        let episodes = await Promise.all(urls.map((u) => parseEpisodeBeta(u)))
        return episodes.sort((a, b) => Number(a.episode_number) > Number(b.episode_number) ? 1 : -1)
    }

    const parsePlaylist = async (url: string, noSub?: boolean) => {
        const cookie = await ipcRenderer.invoke("get-cookie")
        if (url.endsWith("/")) url = url.slice(0, -1)
        const html = await fetch(functions.skipWall(url), {headers: {cookie}}).then((r) => r.text())
        let vilos = null
        try {
            vilos = JSON.parse(html.match(/(?<=vilos.config.media = )(.*)}(?=;)/)?.[0] ?? "")
        } catch {
            return parsePlaylistBeta(url, noSub)
        }
        const hls = vilos?.streams.filter((s: any) => s.format === "adaptive_hls" || s.format === "trailer_hls")
        let audioLang = type === "sub" ? "jaJP" : language
        let subLang = type === "dub" || noSub ? null : language
        let stream = hls?.find((s: any) => s.audio_lang === audioLang && s.hardsub_lang === subLang)
        if (!stream && language === "esLA") stream = hls?.find((s: any) => s.audio_lang === "esES" && s.hardsub_lang === subLang)
        if (!stream && language === "ptBR") stream = hls?.find((s: any) => s.audio_lang === "ptPT" && s.hardsub_lang === subLang)
        if (!stream) return null
        return stream.url
    }

    const parsePlaylistBeta = async (url: string, noSub?: boolean) => {
        const cookie = await ipcRenderer.invoke("get-cookie")
        const html = await fetch(url, {headers: {cookie}}).then((r) => r.text())
        const id = html.match(/(?<=watch\/)(.*?)(?=\/)/)?.[0] ?? ""
        let json = null
        try {
            json = JSON.parse(html.match(/(?<=window\.__INITIAL_STATE__ = ){.*}/gm)?.[0]!)
        } catch {
            return null
        }
        let playback = json.content.byId[id].playback
        if (!playback) {
            const objectUrl = await ipcRenderer.invoke("get-object")
            json = await fetch(objectUrl, {headers: {cookie}}).then((r) => r.json())
            playback = json.items[0].playback
        }
        const vilos = await fetch(playback, {headers: {cookie}}).then((r) => r.json())
        let audioLang = type === "sub" ? "ja-JP" : functions.dashLocale(language)
        if (vilos.audio_locale !== audioLang) return null
        let subLang = type === "dub" || noSub ? "" : functions.dashLocale(language)
        let stream = vilos.streams.adaptive_hls[subLang].url
        if (!stream && language === "esLA") stream = vilos.streams.adaptive_hls["es-ES"].url
        if (!stream && language === "ptBR") stream = vilos.streams.adaptive_hls["pt-PT"].url
        if (!stream) stream = vilos.streams.trailer_hls[subLang].url
        if (!stream) return null
        return stream
    }

    const parseSubtitles = async (info: {id: number, episode: CrunchyrollEpisode, dest: string, kind: string}, error?: boolean, noDL?: boolean) => {
        const cookie = await ipcRenderer.invoke("get-cookie")
        const html = await fetch(info.episode.url, {headers: {cookie}}).then((r) => r.text())
        let vilos = null
        try {
            vilos = JSON.parse(html.match(/(?<=vilos.config.media = )(.*)}(?=;)/)?.[0] ?? "")
        } catch {
            return parseSubtitlesBeta(info, error, noDL)
        }
        let subtitles = vilos?.subtitles.filter((s: any) => s.language === language)
        if (!subtitles && language === "esLA") subtitles = vilos?.subtitles.filter((s: any) => s.language === "esES")
        if (!subtitles && language === "ptBR") subtitles = vilos?.subtitles.filter((s: any) => s.language === "ptPT")
        if (!subtitles?.[0]) return error ? ipcRenderer.invoke("download-error", "search") : null
        if (!noDL) ipcRenderer.invoke("download-subtitles", {url: subtitles[0].url, dest: info.dest, id: info.id, episode: info.episode, kind: info.kind, template, language})
        return subtitles[0].url
    }

    const parseSubtitlesBeta = async (info: {id: number, episode: CrunchyrollEpisode, dest: string, kind: string}, error?: boolean, noDL?: boolean) => {
        const cookie = await ipcRenderer.invoke("get-cookie")
        const html = await fetch(info.episode.url, {headers: {cookie}}).then((r) => r.text())
        const id = html.match(/(?<=watch\/)(.*?)(?=\/)/)?.[0] ?? ""
        let json = null
        try {
            json = JSON.parse(html.match(/(?<=window\.__INITIAL_STATE__ = ){.*}/gm)?.[0]!)
        } catch {
            return null
        }
        const vilos = await fetch(json.content.byId[id].playback, {headers: {cookie}}).then((r) => r.json())
        let subLang = functions.dashLocale(language)
        const subtitles = vilos.subtitles[subLang].url
        if (!subtitles?.[0]) return error ? ipcRenderer.invoke("download-error", "search") : null
        if (!noDL) ipcRenderer.invoke("download-subtitles", {url: subtitles, dest: info.dest, id: info.id, episode: info.episode, kind: info.kind, template, language})
        return subtitles
    }

    const getKind = () => {
        return `${functions.parseLocale(language)} ${type === "dub" ? "Dub" : "Sub"}`
    }

    const search = () => {
        let searchText = searchBoxRef.current?.value.trim() ?? ""
        searchBoxRef.current!.value = ""
        return download(searchText)
    }
      
    const download = async (searchText: string, html?: string) => {
        if (!searchText) return
        let opts = {resolution: Number(quality), quality: videoQuality, language, template} as any
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
        searchText = functions.stripLocale(searchText)
        let episode = await ipcRenderer.invoke("get-episode", searchText, opts)
        if (/beta/.test(searchText)) episode = await parseEpisodeBeta(searchText)
        if (!episode) {
            let episodes = await ipcRenderer.invoke("get-episodes", searchText, opts)
            if (!episodes) {
                if (/crunchyroll.com/.test(searchText)) {
                    let start = null as any
                    let end = null as any
                    if (/\d *- *\d/.test(searchText)) {
                        let part = searchText.match(/(?<= )\d(.*?)(?=$)/)?.[0] ?? ""
                        start = Number(part.split("-")[0]) - 1
                        end = Number(part.split("-")[1])
                        searchText = searchText.replace(part, "").trim()
                    } else if (/ \d+/.test(searchText)) {
                        start = Number(searchText.match(/ \d+/)?.[0]) - 1
                        searchText = searchText.replace(String(start + 1), "").trim()
                    }
                    console.log(start)
                    console.log(end)
                    console.log(searchText)
                    episodes = /beta/.test(searchText) ?  await parseEpisodesBeta(searchText, html) : await parseEpisodes(searchText, html)
                    if (start !== null && end !== null) {
                        episodes = episodes.slice(start, end)
                    } else if (start !== null) {
                        episodes = [episodes[start]]
                    }
                } else {
                    return ipcRenderer.invoke("download-error", "search")
                }
            }
            let current = id
            let downloaded = false
            for (let i = 0; i < episodes.length; i++) {
                await functions.timeout(100)
                if (opts.subtitles) {
                    const subtitles = /beta/.test(episodes[i].url) ? await parseSubtitlesBeta({id: current, episode: episodes[i], dest: directory.replace(/\\+/g, "/"), kind: opts.kind}) : await parseSubtitles({id: current, episode: episodes[i], dest: directory.replace(/\\+/g, "/"), kind: opts.kind})
                    if (subtitles) downloaded = true
                } else if (opts.softSubs) {
                    const subtitles = /beta/.test(episodes[i].url) ? await parseSubtitlesBeta({id: current, episode: episodes[i], dest: directory.replace(/\\+/g, "/"), kind: opts.kind}, false, true) : await parseSubtitles({id: current, episode: episodes[i], dest: directory.replace(/\\+/g, "/"), kind: opts.kind}, false, true)
                    const playlist = /beta/.test(episodes[i].url) ? await parsePlaylistBeta(episodes[i].url, true) : await parsePlaylist(episodes[i].url, true)
                    if (!playlist || !subtitles) continue
                    downloaded = true
                    ipcRenderer.invoke("download", {id: current, episode: episodes[i], dest: directory.replace(/\\+/g, "/"), playlist, subtitles, ...opts})
                } else {
                    const playlist = /beta/.test(episodes[i].url) ? await parsePlaylistBeta(episodes[i].url) : await parsePlaylist(episodes[i].url)
                    if (!playlist) continue
                    downloaded = true
                    ipcRenderer.invoke("download", {id: current, episode: episodes[i], dest: directory.replace(/\\+/g, "/"), playlist, ...opts})
                    }
                current += 1
                setID(prev => prev + 1)
            }
            if (!downloaded) return ipcRenderer.invoke("download-error", "search")
        } else {
            if (!episode.url) episode = /beta/.test(episode) ? await parseEpisodeBeta(episode) : await parseEpisode(episode)
            if (opts.subtitles) {
                setID((prev) => {
                    /beta/.test(episode.url) ? parseSubtitlesBeta({id: prev, episode, dest: directory.replace(/\\+/g, "/"), kind: opts.kind}, true) : parseSubtitles({id: prev, episode, dest: directory.replace(/\\+/g, "/"), kind: opts.kind}, true)
                    return prev + 1
                })
            } else if (opts.softSubs) {
                    const subtitles = /beta/.test(episode.url) ? await parseSubtitlesBeta({id: 0, episode, dest: directory.replace(/\\+/g, "/"), kind: opts.kind}, false, true) : await parseSubtitles({id: 0, episode, dest: directory.replace(/\\+/g, "/"), kind: opts.kind}, false, true)
                    const playlist = /beta/.test(episode.url) ? await parsePlaylistBeta(episode.url, true) : await parsePlaylist(episode.url, true)
                    if (!playlist) return ipcRenderer.invoke("download-error", "search")
                    setID((prev) => {
                        ipcRenderer.invoke("download", {id: prev, episode, dest: directory.replace(/\\+/g, "/"), playlist, subtitles, ...opts})
                        return prev + 1
                    })
            } else {
                const playlist = /beta/.test(episode.url) ? await parsePlaylistBeta(episode.url) : await parsePlaylist(episode.url)
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