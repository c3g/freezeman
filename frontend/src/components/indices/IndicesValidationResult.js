import React, {useEffect, useState} from "react";
import moment from "moment";
import {connect} from "react-redux";
import {useHistory, useParams, useLocation} from "react-router-dom";
import {
  Descriptions,
  List,
  Collapse,
  Tag,
  Table,
  Typography,
  Alert,
  Tooltip,
  Button,
} from "antd";
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

const IndicesValidationResult = ({
  token, indicesTotalCount,
  indicesByID,
  indices,
  isFetching,
  validationResult,
  list
}) => {

  const history = useHistory();
  const { state } = useLocation();

  const {results, validation_errors, warnings} = validationResult
  const indicesValidated = results?.header
  const allIndicesLoaded = indicesValidated?.every(index => index in indicesByID)
  const collisions = []

  //TODO: get it from Redux Store
  if (!allIndicesLoaded)
    list({"id__in":indicesValidated?.join()})

  const columns = [
    {
      title: 'ID',
      width: 100,
      dataIndex: 'id',
      key: 'id',
      fixed: 'left',
      render: id => {
        return (
          <Tooltip placement="right" title={indicesByID[id]?.name}>
          <Tag>{id}</Tag>
          </Tooltip>
        )
      }
    },
    ...results?.header.map((i) => {
      return {
        title: () => {
          return (
            <Tooltip placement="bottom" title={indicesByID[i]?.name}>
            <Tag>{i}</Tag>
            </Tooltip>
          )
        },
        width: 120,
        dataIndex: i,
        key: i,
        render: distances => (
          <span>
          {
            distances?.map(distance => {
              if ( distance < 0 )
              return <Tag color="gray"></Tag>
              else if (distance <= results.threshold )
              return <Tag color="red"> {distance} </Tag>
              else
              return <Tag color="green"> {distance} </Tag>
            })
          }
          </span>
        ),
      }
    }),
  ]

  const data = [
    ...results?.distances.map((row, i) => {
      const index1ID = results.header[i]
      const index1Name = indicesByID[index1ID]?.name
      let indexData = {
        id: index1ID,
        key: i,
      }
      for (let j = 0; j < row.length; j++){
        const index2ID = results.header[j]
        const index2Name = indicesByID[index2ID]?.name
        //lower triangle
        if (row[j]){
          indexData[index2ID] = [row[j][0], row[j][1]]
          //if both are below or equal the threshold then we have a collision
          if (row[j][0] <= results.threshold  && row[j][1] <= results.threshold)
              collisions.push({
                key: index2ID,
                value: `${index1Name} with ${index2Name}. `
              })
        }
        //upper triangle (ignore)
        else
          indexData[index2ID] = [-1, -1]
      }
      return indexData
    })
  ]

  const title = 'Index Validation Results'

  return (
    <>
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
        <Descriptions.Item label="Indices with collision (distance <= threshold)" span={3} size={'default'}>
          <Collapse>
            <Panel header="Expand collision list" key="1">
              <List
                size="small"
                bordered
                dataSource={collisions}
                renderItem={item => <List.Item>{item.value}</List.Item>}
                loading={isFetching}
              />
            </Panel>
          </Collapse>
        </Descriptions.Item>
        </Descriptions>
        <Title level={4} style={{marginTop:'1rem'}}> Distance Matrix </Title>
        <Table
          loading={isFetching}
          columns={columns}
          dataSource={data}
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
        { validation_errors.length > 0 ?
          <Alert
             message="Validation Errors"
             style={{ marginTop: '1rem', whiteSpace: 'pre-wrap' }}
             description={validation_errors.join(".\n")}
             type="error"
           /> : null
        }
        { warnings.length > 0 ?
          <Alert
             message="Validation Warnings"
             style={{ marginTop: '1rem', whiteSpace: 'pre-wrap' }}
             description={warnings.join("\n")}
             type="warning"
           /> : null
        }
    </>
  );
}

export default connect(mapStateToProps, actionCreators)(IndicesValidationResult);
