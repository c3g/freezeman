import React, {useEffect} from "react";
import {connect} from "react-redux";
import {useHistory} from "react-router-dom";
import {Card, Button, Form, Input} from "antd";
import {LoginOutlined} from "@ant-design/icons";

import {performAuth} from "../modules/auth/actions";

const layout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 16 },
};

const tailLayout = {
  wrapperCol: { offset: 8, span: 16 },
};

const cardStyle = {
  boxSizing: "border-box",
  position: "absolute",
  top: "40%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  maxWidth: "396px",
  width: "100%",
  boxShadow: "1px 1px 6px rgba(0,0,0,0.2)",
};

const SignInForm = ({isFetching, isAuthenticated, onFinish}) => {
  const history = useHistory();

  useEffect(() => {
    if (isAuthenticated) {
      history.push("/dashboard");
    }
  });

  return (
    <Card style={cardStyle} bodyStyle={{paddingBottom: undefined}}>
      <Form {...layout} size="large" name="sign-in" onFinish={onFinish}>
        <Form.Item label="Username" name="username" rules={[{required: true}]}>
          <Input autoComplete="username" />
        </Form.Item>
        <Form.Item label="Password" name="password" rules={[{required: true}]}>
          <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item {...tailLayout}>
          <Button type="primary" htmlType="submit" loading={isFetching}><LoginOutlined /> Sign In</Button>
        </Form.Item>
      </Form>
    </Card>
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

export default connect(mapStateToProps, mapDispatchToProps)(SignInForm);
