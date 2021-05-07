import React, {useEffect} from "react";
import {connect} from "react-redux";
import {useHistory, Link} from "react-router-dom";
import {Card, Button, Form, Input} from "antd";

import {performAuth} from "../../modules/auth/actions";
import LoginForm from "./LoginForm";

const containerStyle = {
  width: "100%",
  height: "100%",
  backgroundColor: "#001529"
}

const cardStyle = {
  boxSizing: "border-box",
  position: "absolute",
  top: "40%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  maxWidth: "396px",
  width: "100%",
  backgroundColor: "#e6e6e6",
  boxShadow: "rgb(53 138 254) 1px 1px 17px 1px",
  borderRadius: 10,
}

const mapStateToProps = state => ({
  isFetching: state.auth.isFetching,
  isAuthenticated: !!(state.auth.tokens.access && !state.auth.isFetching && !state.auth.didInvalidate),
});

const mapDispatchToProps = dispatch => ({
  login: values => dispatch(performAuth(values.username, values.password)),
});

const LoginPage = ({isFetching, isAuthenticated, login}) => {
  const history = useHistory();

  useEffect(() => {
    if (isAuthenticated) {
      history.push("/dashboard");
    }
  });

  return (
    <div style={containerStyle}>
      <Card style={cardStyle}>
        <LoginForm login={login} isFetching={isFetching} />
      </Card>
    </div>
  );
};

export default connect(mapStateToProps, mapDispatchToProps)(LoginPage);
