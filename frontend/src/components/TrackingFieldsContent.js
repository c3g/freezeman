import { useDispatch, useSelector } from "react-redux"
import React from "react";
import {Descriptions} from "antd";
import {withUser} from "../utils/withItem";
import {connect} from "react-redux";





const displayUser = (user) => `${user.first_name} ${user.last_name} (${user.username})`

const TrackingFieldsContent = ({ entity }) => {
    const usersByID = useSelector((state) => state.users.itemsByID)
    const dispatch = useDispatch()

    return <>
        <Descriptions bordered={true} size="small" title="Tracking Details" style={{marginTop: "24px"}}>
          <Descriptions.Item label="Item created by">
              {withUser(usersByID, entity.created_by, user => displayUser(user), "Loading...")}
          </Descriptions.Item>
          <Descriptions.Item label="Last modification by">
              {withUser(usersByID, entity.updated_by, user => displayUser(user), "Loading...")}
          </Descriptions.Item>
        </Descriptions>
    </>;
};

export default TrackingFieldsContent;