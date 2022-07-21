import React, { useEffect } from "react";
import { isProcessPropertiesLoaded } from "../../utils/actionsWait";
import { listProperties as listProcessProperties, get as getProcess } from "../../modules/processes/actions";
import ProcessProperties from "./ProcessProperties";
import { connect } from "react-redux";
const mapStateToProps = state => ({
  propertyValuesByID: state.propertyValues.itemsByID,
  protocolsByID: state.protocols.itemsByID,
  processesByID: state.processes.itemsByID,
});

const actionCreators = { listProcessProperties, getProcess };

const AllProcessProperties = ({
  id,
  depth = 1,
  propertyValuesByID,
  protocolsByID,
  processesByID,
  listProcessProperties,
  getProcess,
}) => {
  const process = processesByID[id] || {};

  useEffect(() => {
    (async () => {
      if (!(id in processesByID)) {
        await getProcess(id);
      }

      if (!isProcessPropertiesLoaded(processesByID, propertyValuesByID, id)) {
        await listProcessProperties(id);
      }
    })()
  }, [processesByID, propertyValuesByID, id])


  return <>
    {process?.children_properties?.length > 0 &&
      <ProcessProperties
        propertyIDs={process.children_properties}
        protocolName={protocolsByID[process.protocol]?.name}
      />}
    {depth && process?.children_processes?.map((id, i) => {
      const child_process = processesByID[id]
      return (child_process &&
        // recursion ;)
        <AllProcessProperties
          depth={depth - 1}
          id={id}
        />
      )
    })}
  </>
}

export default connect(mapStateToProps, actionCreators)(AllProcessProperties);