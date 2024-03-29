import React, { useEffect } from "react";
import { isProcessPropertiesLoaded } from "../../utils/isLoaded";
import { listProperties as listProcessProperties, get as getProcess } from "../../modules/processes/actions";
import ProcessProperties from "./ProcessProperties";
import { connect } from "react-redux";
import { Spin } from "antd";

const mapStateToProps = state => ({
  propertyValuesByID: state.propertyValues.itemsByID,
  protocolsByID: state.protocols.itemsByID,
  processesByID: state.processes.itemsByID,
});

const actionCreators = { listProcessProperties, getProcess };

const AllProcessProperties = ({
  propertyValuesByID,
  protocolsByID,
  processesByID,
  listProcessProperties,
  getProcess,
  id,
}) => {
  const process = processesByID[id] || {};
  const isLoaded = isProcessPropertiesLoaded(processesByID, propertyValuesByID, id);
  const arePropertiesAvailable =
    process?.children_properties?.length > 0 ||
    process?.children_processes?.some((id) => {
      const process = processesByID[id]
      if (process) {
        return process?.children_properties?.length > 0
      } else {
        // hopefully process doesn't stay undefined for too long
        return true;
      }
    })

  useEffect(() => {
    (async () => {
      if (!(id in processesByID)) {
        await getProcess(id);
      }

      if (!isLoaded) {
        await listProcessProperties(id);
      }
    })()
  }, [processesByID, propertyValuesByID, id])

  if (!isLoaded) {
    return <Spin size={"small"} />
  } else if (arePropertiesAvailable) {
    return <>
      {process?.children_properties?.length > 0 &&
        <ProcessProperties
          propertyIDs={process.children_properties}
          protocolName={protocolsByID[process.protocol]?.name}
        />}
      {process?.children_processes?.map((id, i) => {
        const process = processesByID[id]
        return (process &&
          <>
            <ProcessProperties
              propertyIDs={process.children_properties}
              protocolName={protocolsByID[process.protocol]?.name}
            />
          </>
        )
      })
      }
    </>
  } else {
    return <>No shared properties associated with the protocol.</>
  }
}

export default connect(mapStateToProps, actionCreators)(AllProcessProperties);