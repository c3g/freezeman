import React, { PropsWithChildren } from "react";
import {Navigate} from "react-router-dom";
import { useAppSelector } from "../hooks";
import { selectAuthCurrentUser, selectAuthTokenAccess } from "../selectors";

interface PrivateNavigateProps extends PropsWithChildren {}

const PrivateNavigate = ({children}: PrivateNavigateProps) => {
    const isAuthenticated = useAppSelector((state) => !!selectAuthTokenAccess(state) && !!selectAuthCurrentUser(state))

    return isAuthenticated
        ? <>{children}</>
        : <Navigate to={"/login"}/>
}

export default PrivateNavigate;
