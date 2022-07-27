import React from "react";
import {connect} from "react-redux";
import {Navigate, Route} from "react-router-dom";

const PrivateNavigate = ({isAuthenticated, children}) => (
    isAuthenticated
        ? <>{children}</>
        : <Navigate to={"/login"}/>
);

const mapStateToProps = state => ({
    isAuthenticated: !!state.auth.tokens.access,
});

export default connect(mapStateToProps)(PrivateNavigate);
