import React, { PropsWithChildren } from "react";
import {Navigate} from "react-router-dom";
import { useAppSelector } from "../hooks";
import { isUserLoggedIn } from "../modules/auth/isLoggedIn"

interface PrivateNavigateProps extends PropsWithChildren {}

const PrivateNavigate = ({children}: PrivateNavigateProps) => {
    const isAuthenticated = useAppSelector(state => isUserLoggedIn(state))

    return isAuthenticated
        ? <>{children}</>
        : <Navigate to={"/login"}/>
}

export default PrivateNavigate;
