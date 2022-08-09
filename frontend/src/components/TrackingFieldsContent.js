import React from "react";
import {Descriptions} from "antd";
import {withUser} from "../utils/withItem";
import {connect} from "react-redux";
import { WithUserComponent } from "./shared/WithItemComponent";

const mapStateToProps = state => ({
  usersByID: state.users.itemsByID,
});

const actionCreators = {};

const displayUser = (user) => `${user.first_name} ${user.last_name} (${user.username})`

const TrackingFieldsContent = ({usersByID, entity}) => {
    return <>
        <Descriptions bordered={true} size="small" title="Tracking Details" style={{marginTop: "24px"}}>
          <Descriptions.Item label="Item created by">
              {WithUserComponent(usersByID, entity.created_by, user => displayUser(user), "Loading...")}
          </Descriptions.Item>
          <Descriptions.Item label="Last modification by">
              {WithUserComponent(usersByID, entity.updated_by, user => displayUser(user), "Loading...")}
          </Descriptions.Item>
        </Descriptions>
    </>;
};

export default connect(mapStateToProps, actionCreators)(TrackingFieldsContent);