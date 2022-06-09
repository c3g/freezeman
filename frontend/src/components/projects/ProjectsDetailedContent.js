import React, { useEffect, useState } from "react";
import {bindActionCreators} from "redux";
import {connect} from "react-redux";
import {Link, useHistory, useParams} from "react-router-dom";
import {Descriptions, Typography, Spin, Row, Col, Card, Statistic} from "antd";
const {Title} = Typography;

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import EditButton from "../EditButton";
import TrackingFieldsContent from "../TrackingFieldsContent";
import ProjectsAssociatedSamples from "./ProjectsAssociatedSamples";
import {withSample} from "../../utils/withItem";
import {get} from "../../modules/projects/actions";
import api, { withToken } from "../../utils/api";
import { Pie } from '@ant-design/plots';

const mapStateToProps = state => ({
    isFetching: state.projects.isFetching,
    projectsByID: state.projects.itemsByID,
    samplesByID: state.samples.itemsByID,
    token: state.auth.tokens.access,
});

const mapDispatchToProps = dispatch =>
    bindActionCreators({ get }, dispatch);

const ProjectsDetailedContent = ({projectsByID, samplesByID, isFetching, get, token}) => {
    const history = useHistory();
    const {id} = useParams();
    const isLoaded = id in projectsByID;
    const project = projectsByID[id] || {};
    
    const [summary, setSummary] = useState(null)

    if (!isLoaded)
        get(id);

    const isLoading = !isLoaded;
    const title =
        `Project ${project.name}`;

    useEffect(() => {
        withToken(token, api.report.summary)(id).then(({data}) => {
            console.log(JSON.stringify(data))
            setSummary(data)
        })
    }, [id])

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
                <Descriptions.Item label="External ID" span={2}>{project.external_id}</Descriptions.Item>
                <Descriptions.Item label="External Name" span={2}>{project.external_name}</Descriptions.Item>
                <Descriptions.Item label="Targeted End Date" span={2}>{project.targeted_end_date}</Descriptions.Item>
                <Descriptions.Item label="Comment" span={4}>{project.comment}</Descriptions.Item>
            </Descriptions>
            <TrackingFieldsContent entity={project}/>
            {
                summary == undefined
                    ? <Spin size={"large"} />
                    : Object.entries(summary).map(([type, data]) => (
                        <Card title={type}>
                            <Statistic title="Total" value={data.total} />
                            <Statistic title="Failed QC" value={data.qc.failed} />
                            <Statistic title="Passed QC" value={data.qc.passed} />
                            <SampleKindChart kinds={data.kinds} />
                        </Card>
                    ))
            }
            <Title level={4} style={{ marginTop: '2rem' }}> Associated Samples </Title>
            <ProjectsAssociatedSamples projectID={project.id} />
        </PageContent>
    </>;
};

function SampleKindChart({kinds}) {
    const data = Object.entries(kinds).map(([kind, count]) => ({
        type: kind,
        value: count
    }))
    const config = {
        appendPadding: 10,
        data,
        angleField: 'value',
        colorField: 'type',
        radius: 0.75,
        label: {
          type: 'spider',
          labelHeight: 28,
          content: '{value} {name}\n{percentage}',
        },
        interactions: [
          {
            type: 'element-selected',
          },
          {
            type: 'element-active',
          },
        ],
      };
    
    return <Pie {...config} />
}

export default connect(mapStateToProps, mapDispatchToProps)(ProjectsDetailedContent);
