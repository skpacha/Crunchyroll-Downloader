import React from "react"
import ReactDom from "react-dom"
import TitleBar from "./components/TitleBar"
import SearchBar from "./components/SearchBar"
import LogoBar from "./components/LogoBar"
import VersionDialog from "./components/VersionDialog"
import LoginDialog from "./components/LoginDialog"
import EpisodeContainerList from "./components/EpisodeContainerList"
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.less"

const App: React.FunctionComponent = () => {
  return (
    <main className="app">
      <TitleBar/>
      <VersionDialog/>
      <LoginDialog/>
      <LogoBar/>
      <SearchBar/>
      <EpisodeContainerList/>
    </main>
  )
}

ReactDom.render(<App/>, document.getElementById("root"))
