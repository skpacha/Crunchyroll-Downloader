import React from "react"
import ReactDom from "react-dom"
import TitleBar from "./components/TitleBar"
import SearchBar from "./components/SearchBar"
import LogoBar from "./components/LogoBar"
import EpisodeContainerList from "./components/EpisodeContainerList"
import "bootstrap/dist/css/bootstrap.min.css";
import "./index.less"

const App: React.FunctionComponent = () => {
  return (
    <main className="app">
      <TitleBar/>
      <LogoBar/>
      <SearchBar/>
      <EpisodeContainerList/>
    </main>
  )
}

ReactDom.render(<App/>, document.getElementById("root"))
