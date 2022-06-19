import React from "react";
import {connect} from "react-redux";
import {Navigate, Route} from "react-router-dom";

const PrivateRoute = ({isAuthenticated, children, ...rest}) => (
    <Route {...rest} render={({location}) => isAuthenticated
        ? children
        : <Navigate to={{pathname: "/login", state: {from: location}}}/>
    } />
);

const mapStateToProps = state => ({
    isAuthenticated: !!state.auth.tokens.access,
});

export default connect(mapStateToProps)(PrivateRoute);
