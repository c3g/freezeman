import React from "react";
import {connect} from "react-redux";
import {Link, useHistory, useParams} from "react-router-dom";

import {Descriptions} from "antd";
import "antd/es/descriptions/style/css";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";

const IndividualsDetailContent = ({individualsByName}) => {
    const history = useHistory();
    const {name} = useParams();
    const individual = individualsByName[name];

    if (!individual) return null;

    return <>
        <AppPageHeader title={individual.name} onBack={() => history.goBack()} />
        <PageContent>
            <Descriptions bordered={true} size="small">
                <Descriptions.Item label="Name">{individual.name}</Descriptions.Item>
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
    individualsByName: state.individuals.itemsByName,
});

export default connect(mapStateToProps)(IndividualsDetailContent);
