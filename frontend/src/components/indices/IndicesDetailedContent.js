import React from "react";
import {bindActionCreators} from "redux";
import {connect} from "react-redux";
import {Link, useHistory, useParams} from "react-router-dom";
import {Descriptions, Typography, Spin} from "antd";
const {Title} = Typography;

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import EditButton from "../EditButton";
import TrackingFieldsContent from "../TrackingFieldsContent";
import {withSample} from "../../utils/withItem";
import {get} from "../../modules/indices/actions";

const mapStateToProps = state => ({
    isFetching: state.indices.isFetching,
    indicesByID: state.indices.itemsByID,
});

const mapDispatchToProps = dispatch =>
    bindActionCreators({ get }, dispatch);

const IndicesDetailedContent = ({indicesByID, isFetching, get}) => {
    const history = useHistory();
    const {id} = useParams();
    const isLoaded = id in indicesByID;
    const index = indicesByID[id] || {};

    if (!isLoaded)
        get(id);

    const isLoading = !isLoaded;
    const title =
        `Index ${index.name}`;

    return <>
        <AppPageHeader title={title} onBack={() => history.push("/indices/list")}/>
        <PageContent loading={isLoading}>
            <Title level={2}>Overview</Title>
            <Descriptions bordered={true} size="small" column={4}>
                <Descriptions.Item label="Index name" span={4}>{index.name}</Descriptions.Item>
                <Descriptions.Item label="Index Set" span={4}>{index.index_set}</Descriptions.Item>
                <Descriptions.Item label="Index Structure" span={4}>{index.index_structure}</Descriptions.Item>
            </Descriptions>
            <TrackingFieldsContent entity={index}/>
        </PageContent>
    </>;
};

export default connect(mapStateToProps, mapDispatchToProps)(IndicesDetailedContent);
