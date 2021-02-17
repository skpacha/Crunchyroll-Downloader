import React, {useEffect} from "react"
import ReactDom from "react-dom"
import BrowserTitleBar from "./components/BrowserTitleBar"
import "./crunchyroll.less"

const App: React.FunctionComponent = () => {
    return (
        <main className="app">
        <BrowserTitleBar/>
        <webview id="webview" src="https://www.crunchyroll.com/"></webview>
        </main>
    )
}

ReactDom.render(<App/>, document.getElementById("root"))
