import React, {useEffect, useState} from "react";
import moment from "moment";
import {connect} from "react-redux";
import {useHistory, useParams, useLocation} from "react-router-dom";
import {Descriptions, List, Collapse, Tag} from "antd";
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

  if (!allIndicesLoaded)
    list({"id__in":indicesValidated.join()})

  results.distances.map((row, i) => {
      for (let j = 0; j < row.length; j++){
        //upper diagonal matrix
        if (j > i){
          const indexName1 = indicesByID[results.header[i]]?.name
          const indexName2 = indicesByID[results.header[j]]?.name
          //if both  are below the threshold then we have a collision
          if (row[j][0] < results.threshold && row[j][1] < results.threshold)
            collisions.push(indexName1 + '  with ' + indexName2 + '. ')
        }
      }
  });

  const title = 'Index Validation Results'

  return (
    <>
      <AppPageHeader
        title={title}
        onBack={() => history.push('/indices/validate')}
      />
      <PageContent>
        <Descriptions column={2} bordered={true}>
            <Descriptions.Item label="Instrument Type">{results.instrument_type}</Descriptions.Item>
            <Descriptions.Item label="Threshold">{results.threshold ? results.threshold : '2'}</Descriptions.Item>
            <Descriptions.Item label="Validation Length 5 Prime">{results.validation_length_3prime}</Descriptions.Item>
            <Descriptions.Item label="Validation Length 5 Prime">{results.validation_length_5prime}</Descriptions.Item>
            <Descriptions.Item label="Validation status">
              {results.is_valid ? <Tag color="green">Passed</Tag> : <Tag color="red">Failed</Tag> }
            </Descriptions.Item>
            <Descriptions.Item label="Validation Length Calculated">{results.validation_length_is_calculated ? "Yes" : "No"} </Descriptions.Item>
            <Descriptions.Item label="Indices with collision (distance < threshold)" span={3} size={'default'}>
            <Collapse >
              <Panel header="Expand list" key="1">
                <List
                  size="small"
                  header={<div>Collisions</div>}
                  bordered
                  dataSource={collisions}
                  renderItem={item => <List.Item>{item}</List.Item>}
                  loading={isFetching}
                />
              </Panel>
            </Collapse>
            </Descriptions.Item>
            <Descriptions.Item label="Detailed distance matrix" span={3} size={'default'}>
              <Collapse>
                <Panel header="Expand matrix" key="1">

                </Panel>
              </Collapse>
            </Descriptions.Item>
        </Descriptions>
      </PageContent>
    </>
  );
}

export default connect(mapStateToProps, actionCreators)(IndicesValidationResult);
