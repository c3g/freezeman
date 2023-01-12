import React, { useEffect, useState } from "react";
import {Descriptions} from "antd";
import {withUser} from "../utils/withItem";
import {useSelector} from "react-redux";
import { selectUsersByID } from "../selectors";

const TrackingFieldsContent = ({entity}) => {

    const usersByID = useSelector(selectUsersByID)

    const [createdBy, setCreatedBy] = useState('')
    const [updatedBy, setUpdatedBy] = useState('')

    useEffect(() => {
      const displayUser = (user) => `${user.first_name} ${user.last_name} (${user.username})`
      if (entity) {
        setCreatedBy(withUser(usersByID, entity.created_by, user => displayUser(user), "Loading..."))
        setUpdatedBy(withUser(usersByID, entity.updated_by, user => displayUser(user), "Loading..."))
      }
    }, [usersByID, entity])

    return <>
        <Descriptions bordered={true} size="small" title="Tracking Details" style={{marginTop: "24px"}}>
          <Descriptions.Item label="Item created by">
              {createdBy}
          </Descriptions.Item>
          <Descriptions.Item label="Last modification by">
              {updatedBy}
          </Descriptions.Item>
        </Descriptions>
    </>;
};

export default TrackingFieldsContent
