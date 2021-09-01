import React from "react";
import {bindActionCreators} from "redux";
import {connect} from "react-redux";
import {Link, useHistory, useParams} from "react-router-dom";
import {Descriptions, Typography, Spin} from "antd";
const {Title} = Typography;

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import TrackingFieldsContent from "../TrackingFieldsContent";
import {withSample} from "../../utils/withItem";
import {get} from "../../modules/projects/actions";

const mapStateToProps = state => ({
    projects: state.projects.items,
    isFetching: state.projects.isFetching,
    projectsByID: state.projects.itemsByID,
    samplesByID: state.samples.itemsByID,
});

const mapDispatchToProps = dispatch =>
    bindActionCreators({ get }, dispatch);

const ProjectsDetailedContent = ({projects, projectsByID, samplesByID, isFetching, get}) => {
    const history = useHistory();
    const {id} = useParams();
    const isLoaded = id in projectsByID;
    const project = projectsByID[id] || {};
    const isSamplesEmpty = project.samples && project.samples.length === 0;
    let samples = []

    if (isLoaded && !isSamplesEmpty) {
      project.samples && project.samples.forEach((id, i) => {
        withSample(samplesByID, id, sample => sample.id);
        samples.push(samplesByID[id]);
      })
    }

    if (!isLoaded)
        get(id);

    const isLoading = !isLoaded || isFetching;
    const title =
        `Project ${project.name}`;

    return <>
        <AppPageHeader title={title} onBack={() => history.push("/projects/list")}/>
        <PageContent loading={isLoading}>
            <Title level={2}>Overview</Title>
            <Descriptions bordered={true} size="small" column={4}>
                <Descriptions.Item label="Project" span={4}>{project.name}</Descriptions.Item>
                <Descriptions.Item label="Principal Investigator" span={2}>{project.principal_investigator}</Descriptions.Item>
                <Descriptions.Item label="Status" span={2}>{project.status}</Descriptions.Item>
                <Descriptions.Item label="Requestor Name" span={2}>{project.requestor_name}</Descriptions.Item>
                <Descriptions.Item label="Requestor Email" span={2}>{project.requestor_email}</Descriptions.Item>
                <Descriptions.Item label="Targeted End Date" span={2}>{project.targeted_end_date}</Descriptions.Item>
                <Descriptions.Item label="Comments" span={4}>{project.comments}</Descriptions.Item>
            </Descriptions>
            <Descriptions bordered={true} size="small" title="Associated Samples" style={{marginTop: "24px"}}>
              {
                samples.length !== 0 && samples.map(sample => {
                  if (sample)
                    return (<Descriptions.Item> <Link to={`/samples/${sample.id}`}>  {sample.name} </Link> </Descriptions.Item>);
                })
              }
            </Descriptions>
            <TrackingFieldsContent entity={project}/>
        </PageContent>
    </>;
};

export default connect(mapStateToProps, mapDispatchToProps)(ProjectsDetailedContent);
