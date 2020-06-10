import React from "react";
import {connect} from "react-redux";
import {Link, useHistory, useParams} from "react-router-dom";

import {Descriptions} from "antd";
import "antd/es/descriptions/style/css";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";

const IndividualsDetailContent = ({individualsByID}) => {
    const history = useHistory();
    const {name} = useParams();
    const individual = individualsByID[name];

    if (!individual) return null;

    return <>
        <AppPageHeader title={individual.id} onBack={() => history.goBack()} />
        <PageContent>
            <Descriptions bordered={true} size="small">
                <Descriptions.Item label="Name">{individual.id}</Descriptions.Item>
                <Descriptions.Item label="Taxon"><em>{individual.taxon}</em></Descriptions.Item>
                <Descriptions.Item label="Sex">{individual.sex}</Descriptions.Item>
                <Descriptions.Item label="Pedigree">{individual.pedigree}</Descriptions.Item>
                <Descriptions.Item label="Cohort" span={2}>{individual.cohort}</Descriptions.Item>
                <Descriptions.Item label="Mother">
                    {individual.mother
                        ? (<Link to={`/individuals/${individual.mother}`}>{individual.mother}</Link>)
                        : "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Father">
                    {individual.father
                        ? (<Link to={`/individuals/${individual.father}`}>{individual.father}</Link>)
                        : "—"}
                </Descriptions.Item>
            </Descriptions>
        </PageContent>
    </>;
};

const mapStateToProps = state => ({
    individualsByID: state.individuals.itemsByID,
});

export default connect(mapStateToProps)(IndividualsDetailContent);
