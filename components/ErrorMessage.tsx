import {ipcRenderer} from "electron"
import React, {useState, useEffect} from "react"
import "../styles/errormessage.less"

const ErrorMessage: React.FunctionComponent = (props) => {
    const [error, setError] = useState(null as "search" | "download" | "subtitles" | "subtitles-dub" | null)
    
    useEffect(() => {
        const downloadError = (event: any, err: any) => {
            setError(err)
        }
        ipcRenderer.on("download-error", downloadError)
        return () => {
            ipcRenderer.removeListener("download-error", downloadError)
        }
    }, [])

    const getMessage = () => {
        if (error === "search") {
            return "Could not find anything for this language. For the highest accuracy, it's recommended to use links."
        } else if (error === "download") {
            return "There was an error downloading this episode, is it premium only?"
        } else if (error === "subtitles-dub") {
            return "Dubs do not have subtitles."
        } else if (error === "subtitles") {
            return "Did not find any subtitles in this language for this episode."
        }
    }

    if (error) {
        setTimeout(() => {setError(null)}, 3000)
        return (
            <section className="error-message">
                <p className="error-message-text">{getMessage()}</p>
            </section>
        )
    }
    return null
}

export default ErrorMessage