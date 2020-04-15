import React, {useEffect, useState} from "react";
import {connect} from "react-redux";
import {useHistory} from "react-router-dom";

import {Button, Form, Input} from "antd";
import "antd/es/button/style/css";
import "antd/es/form/style/css";
import "antd/es/input/style/css";

import {performAuth} from "../modules/auth/actions";

const SignInForm = ({isFetching, isAuthenticated, onFinish}) => {
    const from = useState("/dashboard")[0];
    const history = useHistory();

    useEffect(() => {
        if (from && isAuthenticated) {
            history.push(from);
        }
    });

    return <Form layout="vertical" name="sign-in" onFinish={onFinish}>
        <Form.Item label="Username" name="username" rules={[{required: true}]}>
            <Input/>
        </Form.Item>
        <Form.Item label="Password" name="password" rules={[{required: true}]}>
            <Input.Password autoComplete="current-password" />
        </Form.Item>
        <Form.Item>
            <Button type="primary" htmlType="submit" loading={isFetching}>Sign In</Button>
        </Form.Item>
    </Form>
};

const mapStateToProps = state => ({
    isFetching: state.auth.isFetching,
    isAuthenticated: !!(state.auth.tokens.access && !state.auth.isFetching && !state.auth.didInvalidate),
});

// noinspection JSUnusedGlobalSymbols
const mapDispatchToProps = dispatch => ({
    onFinish: async values => await dispatch(performAuth(values.username, values.password)),
});

export default connect(mapStateToProps, mapDispatchToProps)(SignInForm);
