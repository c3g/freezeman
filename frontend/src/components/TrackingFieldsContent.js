import {Descriptions} from "antd";
import {Link} from "react-router-dom";
import {withUser} from "../utils/withItem";
import React from "react";


export const TrackingFieldsContent = ({usersByID, entity}) => {
    return <>
        <Descriptions bordered={true} size="small" title="Tracking Details" style={{marginTop: "24px"}}>
          <Descriptions.Item label="Created by">
              {entity.created_by_id &&
                  withUser(usersByID, entity.created_by_id, user => user.username, "Loading...")
              }
          </Descriptions.Item>
          <Descriptions.Item label="Last modification by">
              {entity.updated_by_id &&
                  withUser(usersByID, entity.updated_by_id, user => user.username, "Loading...")
              }
          </Descriptions.Item>
        </Descriptions>

    </>;
};