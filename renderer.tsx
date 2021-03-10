import React, {useEffect, useState} from "react"
import ReactDom from "react-dom"
import TitleBar from "./components/TitleBar"
import SearchBar from "./components/SearchBar"
import LogoBar from "./components/LogoBar"
import {ipcRenderer} from "electron"
import GroupAction from "./components/GroupAction"
import VersionDialog from "./components/VersionDialog"
import LoginDialog from "./components/LoginDialog"
import AdvancedSettings from "./components/AdvancedSettings"
import EpisodeContainerList from "./components/EpisodeContainerList"
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.less"
import functions from "./structures/functions"

export const ClearAllContext = React.createContext<any>(null)
export const DeleteAllContext = React.createContext<any>(null)
export const StopAllContext = React.createContext<any>(null)


export const VideoQualityContext = React.createContext<any>(null)
export const TemplateContext = React.createContext<any>(null)

const App: React.FunctionComponent = () => {
  const [clearAll, setClearAll] = useState(false)
  const [deleteAll, setDeleteAll] = useState(false)
  const [stopAll, setStopAll] = useState(false)
  const [videoQuality, setVideoQuality] = useState(16)
  const [template, setTemplate] = useState("{seasonTitle} {episodeNumber}")

  useEffect(() => {
    ipcRenderer.on("debug", console.log)
    window.addEventListener("mousemove", functions.autoScroll)
    return () => {
      ipcRenderer.removeListener("debug", console.log)
      window.removeEventListener("mousemove", functions.autoScroll)
    }
  }, [])

  return (
    <VideoQualityContext.Provider value={{videoQuality, setVideoQuality}}>
    <TemplateContext.Provider value={{template, setTemplate}}>
    <StopAllContext.Provider value={{stopAll, setStopAll}}>
    <DeleteAllContext.Provider value={{deleteAll, setDeleteAll}}>
    <ClearAllContext.Provider value={{clearAll, setClearAll}}>
    <main className="app">
      <TitleBar/>
      <VersionDialog/>
      <LoginDialog/>
      <AdvancedSettings/>
      <LogoBar/>
      <SearchBar/>
      <GroupAction/>
      <EpisodeContainerList/>
    </main>
    </ClearAllContext.Provider>
    </DeleteAllContext.Provider>
    </StopAllContext.Provider>
    </TemplateContext.Provider>
    </VideoQualityContext.Provider>
  )
}

ReactDom.render(<App/>, document.getElementById("root"))
