import React, {useEffect} from "react";
import {connect} from "react-redux";
import {useHistory, Link} from "react-router-dom";
import {Card, Button, Form, Input} from "antd";
import {
  LockOutlined,
  UserOutlined,
} from "@ant-design/icons";

import {performAuth} from "../modules/auth/actions";

const layout = {
  wrapperCol: { span: 24 },
}

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

const buttonStyle = {
  width: "100%",
}

const forgotStyle = {
  marginTop: '0.5em',
}

const SignIn = ({isFetching, isAuthenticated, onFinish}) => {
  const history = useHistory();

  useEffect(() => {
    if (isAuthenticated) {
      history.push("/dashboard");
    }
  });

  return (
    <div style={containerStyle}>
      <Card style={cardStyle}>
        <Form {...layout} size="large" name="sign-in" onFinish={onFinish}>
          <Form.Item name="username" rules={[{required: true}]}>
            <Input
              prefix={<UserOutlined className="site-form-item-icon" />}
              autoComplete="username"
              placeholder="Username"
            />
          </Form.Item>
          <Form.Item name="password" rules={[{required: true}]}>
            <Input.Password
              prefix={<LockOutlined className="site-form-item-icon" />}
              autoComplete="current-password"
              placeholder="Password"
            />
          </Form.Item>
          <Form.Item {...layout}>
            <Button type="primary" htmlType="submit" loading={isFetching} style={buttonStyle}>
              Login
            </Button>
            <div className='flex-row' style={forgotStyle}>
              <div className='flex-fill' />
              <Link to="/forgot-password">
                Forgot password?
              </Link>
            </div>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

const mapStateToProps = state => ({
  isFetching: state.auth.isFetching,
  isAuthenticated: !!(state.auth.tokens.access && !state.auth.isFetching && !state.auth.didInvalidate),
});

// noinspection JSUnusedGlobalSymbols
const mapDispatchToProps = dispatch => ({
  onFinish: values => dispatch(performAuth(values.username, values.password)),
});

export default connect(mapStateToProps, mapDispatchToProps)(SignIn);
