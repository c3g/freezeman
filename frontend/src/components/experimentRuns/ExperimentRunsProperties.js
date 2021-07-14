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

  const propertiesAreLoaded = propertyValuesByID[propertyIDs[0]]

  if (propertiesAreLoaded) {
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
      {propertiesAreLoaded ?
        <Table columns={columns} dataSource={data} pagination={false} className="table-min-width"/>
          :
        <div>Loading...</div>
      }
    </>
  );
};

export default connect(mapStateToProps, actionCreators)(ExperimentRunsProperties);
