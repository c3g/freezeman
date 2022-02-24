import React, {useEffect, useState} from "react";
import moment from "moment";
import {connect} from "react-redux";
import {useHistory, useParams, useLocation} from "react-router-dom";
import {Descriptions, List, Collapse, Tag, Table, Typography, Alert} from "antd";
const { Title, Text } = Typography;
const { Panel } = Collapse;

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import api, {withToken} from "../../utils/api";
import {list} from "../../modules/indices/actions";


const mapStateToProps = state => ({
  token: state.auth.tokens.access,
  indicesTotalCount: state.indices.totalCount,
  indicesByID: state.indices.itemsByID,
  indices: state.indices.items,
  isFetching: state.indices.isFetching,
});

const actionCreators = {list};

const IndicesValidationResult = ({token, indicesTotalCount, indicesByID, indices, isFetching, list}) => {
  const history = useHistory();
  const { state } = useLocation();

  const {results, validation_errors, warnings} = state.response
  const indicesValidated = results.header
  const allIndicesLoaded = indicesValidated?.every(index => index in indicesByID)
  const collisions = []

  //TODO: get it from Redux Store
  if (!allIndicesLoaded)
    list({"id__in":indicesValidated.join()})

  const columns = [
    {
      title: 'Name',
      width: 100,
      dataIndex: 'name',
      key: 'name',
      fixed: 'left'
    },
    ...results.header.map((i) => {
      return {
        title: indicesByID[i]?.name,
        width: 100,
        dataIndex: indicesByID[i]?.name,
        key: indicesByID[i]?.name,
        render: distances => (
          <span>
            {
              distances?.map(distance => {
                if (distance < results.threshold)
                  return <Tag color="red"> {distance} </Tag>
                else
                  return <Tag color="green"> {distance} </Tag>
              })
            }
          </span>
    ),
      }
    })
  ]

  const data = [
    ...results.distances.map((row, i) => {
      const indexName1 = indicesByID[results.header[i]]?.name
      let indexData = {
        name: indexName1,
        key: i,
      }
      for (let j = 0; j < row.length; j++){
        const indexName2 = indicesByID[results.header[j]]?.name
        if (j > i){
          indexData[indexName2] = [row[j][0], row[j][0]]
          //if both  are below the threshold then we have a collision
          if (row[j][0] < results.threshold && row[j][1] < results.threshold)
              collisions.push(indexName1 + '  with ' + indexName2 + '. ')
        }
        else
          indexData[indexName2] = [0, 0]
      }
      return indexData
    })
  ]

  const title = 'Index Validation Results'

  return (
    <>
      <AppPageHeader
        title={title}
        onBack={() => history.push('/indices/validate')}
      />
      <PageContent>
        <Title level={3}> Validation Summary </Title>
        <Descriptions column={2} bordered={true}>
            <Descriptions.Item label="Instrument Type">{results.instrument_type}</Descriptions.Item>
            <Descriptions.Item label="Threshold">{results.threshold ? results.threshold : '2'}</Descriptions.Item>
            <Descriptions.Item label="Validation Length 3 Prime">{results.validation_length_3prime}</Descriptions.Item>
            <Descriptions.Item label="Validation Length 5 Prime">{results.validation_length_5prime}</Descriptions.Item>
            <Descriptions.Item label="Validation status">
              {results.is_valid ? <Tag color="green">Passed</Tag> : <Tag color="red">Failed</Tag> }
            </Descriptions.Item>
            <Descriptions.Item label="Validation Length Calculated">{results.validation_length_is_calculated ? "Yes" : "No"} </Descriptions.Item>
            <Descriptions.Item label="Indices with collision (distance < threshold)" span={3} size={'default'}>
            <Collapse >
              <Panel header="Expand collision list" key="1">
                <List
                  size="small"
                  bordered
                  dataSource={collisions}
                  renderItem={item => <List.Item>{item}</List.Item>}
                  loading={isFetching}
                />
              </Panel>
            </Collapse>
            </Descriptions.Item>
        </Descriptions>
        <Collapse>
          <Panel header="Expand detailed distance matrix" key="1">
            <Table
              columns={columns}
              dataSource={data}
              pagination={false}
              scroll={{ x: 1500, y: 300 }}
              title={() => {
                return (
                  <div>
                    Distance for both indices (3 prime and 5 prime) are shown together for each pair of indices.
                    <div>
                      <Tag color="green"> If greater than threshold</Tag>
                      <Tag color="red"> If smaller than threshold </Tag>
                    </div>
                  </div>
                )
              }}
            />
          </Panel>
        </Collapse>
        { validation_errors.length > 0 ? <Title level={3} style={{ marginTop: '1em' }}> Validation Errors </Title>  : null }
        {
          validation_errors.map(error => {
            return <Alert message={error} type="error" />
          })
        }
        { warnings.length > 0 ? <Title level={3} style={{ marginTop: '1em' }}> Validation Warnings </Title> : null }
        {
          warnings.map(warning => {
            return <Alert message={warning} type="warning" />
          })
        }
      </PageContent>
    </>
  );
}

export default connect(mapStateToProps, actionCreators)(IndicesValidationResult);
