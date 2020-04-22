import React from "react";
import {connect} from "react-redux";
import {Link, useHistory, useParams} from "react-router-dom";

import {Descriptions, Tag} from "antd";
import "antd/es/descriptions/style/css";
import "antd/es/tag/style/css";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";

const SamplesDetailContent = ({samplesByID}) => {
    const history = useHistory();
    const {id} = useParams();
    const sample = samplesByID[id];

    if (!sample) return null;

    const volume = parseFloat(sample.volume_history[sample.volume_history.length - 1].volume_value)
        .toFixed(3);

    const experimentalGroups = sample.experimental_group || [];

    const extractedFrom = sample.extracted_from === null ? null : samplesByID[sample.extracted_from];
    const volumeUsed = extractedFrom ? parseFloat(sample.volume_used).toFixed(3) : null;

    return <>
        <AppPageHeader title={sample.name} onBack={() => history.goBack()} extra={[
            <div key="kind" style={{display: "inline-block", verticalAlign: "top", marginTop: "4px"}}>
                <Tag>{sample.biospecimen_type}</Tag>
            </div>,
        ]} />
        <PageContent>
            <Descriptions bordered={true} size="small" title="Overview">
                <Descriptions.Item label="Name">{sample.name}</Descriptions.Item>
                <Descriptions.Item label="Alias">{sample.alias}</Descriptions.Item>
                <Descriptions.Item label="Biospecimen Type">{sample.biospecimen_type}</Descriptions.Item>
                <Descriptions.Item label="Volume">{volume} µL</Descriptions.Item>
                <Descriptions.Item label="Concentration">{sample.concentration} ng/µL</Descriptions.Item>
                <Descriptions.Item label="Depleted">{sample.depleted ? "Yes" : "No"}</Descriptions.Item>
            </Descriptions>
            <Descriptions bordered={true} size="small" style={{marginTop: "24px"}}>
                <Descriptions.Item label="Individual">{sample.individual}</Descriptions.Item>
                <Descriptions.Item label="Collection Site">{sample.collection_site}</Descriptions.Item>
                <Descriptions.Item label="Tissue Source">{sample.tissue_source}</Descriptions.Item>
                <Descriptions.Item label="Experimental Groups" span={2}>
                    {experimentalGroups.map((g, i) =>
                        <span key={g}>{g}{i === experimentalGroups.length - 1 ? "" : ", "}</span>)}
                </Descriptions.Item>
                <Descriptions.Item label="Phenotype">{sample.phenotype}</Descriptions.Item>
                <Descriptions.Item label="Reception Date">{sample.reception_date}</Descriptions.Item>
                <Descriptions.Item label="Container">
                    <Link to={`/containers/${sample.container}`}>{sample.container}</Link>
                </Descriptions.Item>
                <Descriptions.Item label="Coordinates">{sample.coordinates || "—"}</Descriptions.Item>
                <Descriptions.Item label="Comment" span={3}>{sample.comment}</Descriptions.Item>

                {/*TODO: Extracted from*/}
            </Descriptions>

            {extractedFrom ? (
                <Descriptions bordered={true} size="small" title="Extraction Details" style={{marginTop: "24px"}}>
                    <Descriptions.Item label="Extracted From">
                        <Link to={`/samples/${extractedFrom.id}`}>
                            {extractedFrom.name} ({extractedFrom.container}{extractedFrom.coordinates
                                ? ` at ${extractedFrom.coordinates}` : ""})
                        </Link>
                    </Descriptions.Item>
                    <Descriptions.Item label="Volume Used">{volumeUsed}</Descriptions.Item>
                </Descriptions>
            ) : null}
        </PageContent>
    </>;
};

const mapStateToProps = state => ({
    samplesByID: state.samples.itemsByID,
});

export default connect(mapStateToProps)(SamplesDetailContent);
