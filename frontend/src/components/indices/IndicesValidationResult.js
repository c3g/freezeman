import React, {useEffect, useState} from "react";
import moment from "moment";
import {connect} from "react-redux";
import {useHistory, useParams, useLocation} from "react-router-dom";
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  Cascader,
} from "antd";
const {Option} = Select
const {TextArea} = Input

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import api, {withToken} from "../../utils/api";


const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  indicesTotalCount: state.indices.totalCount,
});

const IndicesValidationResult = ({token, indicesTotalCount}) => {
  const history = useHistory();
  const { state } = useLocation();

  console.log(state)

  const title = 'Index Validation Results'

  function filter(inputValue, path) {
    return path.some(option => option.label.toLowerCase().indexOf(inputValue.toLowerCase()) > -1);
  }

  return (
    <>
      <AppPageHeader
        title={title}
        onBack={() => history.push('/indices/validate')}
      />
      <PageContent>
      </PageContent>
    </>
  );
}

export default connect(mapStateToProps)(IndicesValidationResult);
