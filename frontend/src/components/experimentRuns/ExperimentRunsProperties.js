import React from "react";
import {connect} from "react-redux";

import {Table, Typography} from "antd";
const {Title} = Typography;

const mapStateToProps = state => ({
  propertyValuesByID: state.propertyValues.itemsByID,
});

const actionCreators = {};

const ExperimentRunsProperties = ({
  propertyValuesByID,
  propertyIDs,
  protocolName,
}) => {
  let properties = []
  let columns = []
  let data = []

  if ( propertyValuesByID[propertyIDs[0]]) {
    properties = propertyIDs.map((id, i) => propertyValuesByID[id])

    columns = properties.map((propertyValue, i) => {
      return ({
        title: propertyValue.property_name,
        dataIndex: propertyValue.id,
        key: propertyValue.id,
      })
    })

    let row = {key: '1'}

    properties.forEach((propertyValue, i) => {
      if (propertyValue)
        row[propertyValue.id] = propertyValue.value
    })

    data = [row]
  }



  return (
    <>
     <Title level={5} style={{marginTop: "20px"}}> {protocolName} </Title>
     <Table columns={columns} dataSource={data} pagination={false} className="table-min-width"/>
    </>
  );
};

export default connect(mapStateToProps, actionCreators)(ExperimentRunsProperties);
