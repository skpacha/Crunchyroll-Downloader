import React, {useState} from "react"
import logo from "../assets/logobar.png"
import "../styles/logobar.less"

const LogoBar: React.FunctionComponent = (props) => {
    return (
        <section className="logo-bar">
            <div className="logo-bar-drag">
                <img src={logo} className="logo" width="487" height="77"/>
            </div>
        </section>
    )
}

export default LogoBar