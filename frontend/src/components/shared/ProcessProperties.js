import { useDispatch, useSelector } from "react-redux"
import React from "react";
import {connect} from "react-redux";

import {Table, Typography} from "antd";
const {Title} = Typography;





const ProcessProperties = ({ propertyIDs, protocolName }) => {
  const propertyValuesByID = useSelector((state) => state.propertyValues.itemsByID)
  const dispatch = useDispatch()

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
        <div/>
      }
    </>
  );
};

export default ProcessProperties;
