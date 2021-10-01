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
import ProjectsAssociatedSamples from "./ProjectsAssociatedSamples";
import {withSample} from "../../utils/withItem";
import {get} from "../../modules/projects/actions";

const mapStateToProps = state => ({
    isFetching: state.projects.isFetching,
    projectsByID: state.projects.itemsByID,
    samplesByID: state.samples.itemsByID,
});

const mapDispatchToProps = dispatch =>
    bindActionCreators({ get }, dispatch);

const ProjectsDetailedContent = ({projectsByID, samplesByID, isFetching, get}) => {
    const history = useHistory();
    const {id} = useParams();
    const isLoaded = id in projectsByID;
    const project = projectsByID[id] || {};

    if (!isLoaded)
        get(id);

    const isLoading = !isLoaded;
    const title =
        `Project ${project.name}`;

    return <>
        <AppPageHeader title={title} onBack={() => history.push("/projects/list")} extra={ <EditButton url={`/projects/${id}/update`}/> }/>
        <PageContent loading={isLoading}>
            <Title level={2}>Overview</Title>
            <Descriptions bordered={true} size="small" column={4}>
                <Descriptions.Item label="Project" span={4}>{project.name}</Descriptions.Item>
                <Descriptions.Item label="Principal Investigator" span={2}>{project.principal_investigator}</Descriptions.Item>
                <Descriptions.Item label="Status" span={2}>{project.status}</Descriptions.Item>
                <Descriptions.Item label="Requestor Name" span={2}>{project.requestor_name}</Descriptions.Item>
                <Descriptions.Item label="Requestor Email" span={2}>{project.requestor_email}</Descriptions.Item>
                <Descriptions.Item label="Targeted End Date" span={2}>{project.targeted_end_date}</Descriptions.Item>
                <Descriptions.Item label="Comment" span={4}>{project.comment}</Descriptions.Item>
            </Descriptions>
            <TrackingFieldsContent entity={project}/>
            <Title level={4} style={{marginTop: '2rem'}}> Associated Samples </Title>
            <ProjectsAssociatedSamples projectID={project.id} />
        </PageContent>
    </>;
};

export default connect(mapStateToProps, mapDispatchToProps)(ProjectsDetailedContent);
