import { Card } from "antd"
import React, { useCallback, useEffect } from "react"
import { Route, Routes, useNavigate } from "react-router-dom"

import { useAppDispatch, useAppSelector } from '../../hooks'
import { performAuth } from "../../modules/auth/actions"
import { isUserLoggedIn } from "../../modules/auth/isLoggedIn"
import { selectAuthState } from "../../selectors"
import LoginForm from "./LoginForm"
import ResetPasswordForm from "./ResetPasswordForm"

const containerStyle = {
  width: "100%",
  height: "100%",
  backgroundColor: "#001529"
}

const cardStyle: React.CSSProperties = {
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

const LoginPage = () => {
  const history = useNavigate();
  const isAuthenticated = useAppSelector(isUserLoggedIn)
  const authState = useAppSelector(selectAuthState)
  const isFetching = authState.isFetching

  const dispatch = useAppDispatch()
  
  const login = useCallback((values) => {
    dispatch(performAuth(values.username, values.password))
  }, [dispatch])

  useEffect(() => {
    if (isAuthenticated) {
      history("/dashboard");
    }
  }, [history, isAuthenticated]);

  return (
    <div style={containerStyle}>
      <Card style={cardStyle}>
        <Routes>
          <Route path="/" element={<LoginForm login={login} isFetching={isFetching} />}/>
          <Route path="/forgot-password" element={<ResetPasswordForm />}/>
        </Routes>
      </Card>
    </div>
  );
};

export default LoginPage
