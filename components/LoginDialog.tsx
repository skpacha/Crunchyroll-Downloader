import {ipcRenderer} from "electron"
import React, {useState, useEffect, useRef} from "react"
import "../styles/logindialog.less"

const LoginDialog: React.FunctionComponent = (props) => {
    let [visible, setVisible] = useState(false)
    let [loginError, setLoginError] = useState(null as null | "rate limit" | "input")
    let [loggedIn, setLoggedIn] = useState(false)
    let [username, setUsername] = useState("")
    const passwordRef = useRef(null) as React.RefObject<HTMLInputElement>
    const usernameRef = useRef(null) as React.RefObject<HTMLInputElement>
    
    useEffect(() => {
        const showLoginDialog = async (event: any, update: any) => {
            setVisible((prev) => !prev)
            if (!visible) setLoginError(null)
        }
        const closeAllDialogs = async (event: any, ignore: any) => {
            if (ignore !== "login") setVisible(false)
        }
        ipcRenderer.on("show-login-dialog", showLoginDialog)
        ipcRenderer.on("close-all-dialogs", closeAllDialogs)
        initLogin()
        return () => {
            ipcRenderer.removeListener("show-login-dialog", showLoginDialog)
            ipcRenderer.removeListener("close-all-dialogs", closeAllDialogs)
        }
    }, [])

    const initLogin = async () => {
        const username = await ipcRenderer.invoke("init-login")
        if (username) {
            setUsername(username)
            setLoggedIn(true)
        }
    }

    const showPassword = () => {
        if (passwordRef.current?.type === "password") {
            passwordRef.current.type = "text"
        } else {
            passwordRef.current!.type = "password"
        }
    }

    const login = async (button: "accept" | "reject") => {
        if (button === "accept") {
            const username = await ipcRenderer.invoke("login", usernameRef.current?.value, passwordRef.current?.value)
            if (username === "rate limited") {
                setLoginError("rate limit")
            } else if (username) {
                setUsername(username)
                setLoggedIn(true)
            } else {
                setLoginError("input")
            }
            return
        }
        setLoginError(null)
        setVisible(false)
    }

    const logout = async (button: "accept" | "reject") => {
        if (button === "accept") {
            await ipcRenderer.invoke("logout")
            setLoggedIn(false)
            return
        }
        setVisible(false)
    }

    if (visible && loggedIn) return (
        <section className="login-dialog">
            <div className="logout-dialog-box">
                <div className="login-container">
                    <div className="logout-info">
                            <p className="logout-text">Logged in as:</p>
                            <p className="logout-text-alt">{username}</p>
                        </div>
                    <div className="login-button-container">
                        <button onClick={() => logout("reject")} className="ok-button">Ok</button>
                        <button onClick={() => logout("accept")} className="logout-button">Logout</button>
                    </div>
                </div>
            </div>
        </section>
    )

    if (visible) return (
        <section className="login-dialog">
            <div className="login-dialog-box">
                <div className="login-container">
                    <div className="login-input">
                        <div className="login-username">
                            <p className="login-text">Email/Username:</p>
                            <input ref={usernameRef} spellCheck="false" type="text" className="login-box"/>
                        </div>
                        <div className="login-password">
                            <p className="login-text">Password:</p>
                            <input ref={passwordRef} spellCheck="false" type="password" className="login-box"/>
                        </div>
                        <div className="show-password">
                            <input type="checkbox" onChange={showPassword} className="login-checkbox"/>
                            <p className="login-text">Show Password</p>
                        </div>
                    </div>
                    {loginError ? <p className="login-error"><span>{loginError === "rate limit" ? "Error: Too many requests." : "Error: Could not login."}</span></p> : null}
                    <div className="login-button-container">
                        <button onClick={() => login("reject")} className="cancel-button">Cancel</button>
                        <button onClick={() => login("accept")} className="login-button">Login</button>
                    </div>
                </div>
            </div>
        </section>
    )
    return null
}

export default LoginDialog