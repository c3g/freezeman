import React from "react";
import {bindActionCreators} from "redux";
import {connect} from "react-redux";
import {Link, useHistory, useParams} from "react-router-dom";
import {Descriptions} from "antd";

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import EditButton from "../EditButton";
import {withIndividual} from "../../utils/withItem";
import {get} from "../../modules/individuals/actions";

const IndividualsDetailContent = ({individualsByID, get}) => {
    const history = useHistory();
    const {id} = useParams();
    const isLoaded = id in individualsByID;
    const individual = individualsByID[id] || {};

    if (!isLoaded)
        get(id);

    const isLoading = !isLoaded || individual.isFetching;
    const title =
        `Individual ${[id, individual ? individual.name : undefined].filter(Boolean).join(' - ')}`;

    return <>
        <AppPageHeader title={title} onBack={() => history.push("/individuals/list")} extra={
            <EditButton url={`/individuals/${id}/update`} />
        }/>
        <PageContent loading={isLoading}>
            <Descriptions bordered={true} size="small">
                <Descriptions.Item label="Name">{individual.name}</Descriptions.Item>
                <Descriptions.Item label="Taxon"><em>{individual.taxon}</em></Descriptions.Item>
                <Descriptions.Item label="Sex">{individual.sex}</Descriptions.Item>
                <Descriptions.Item label="Pedigree">{individual.pedigree}</Descriptions.Item>
                <Descriptions.Item label="Cohort" span={2}>{individual.cohort}</Descriptions.Item>
                <Descriptions.Item label="Mother">
                    {individual.mother ?
                        (
                        <Link to={`/individuals/${individual.mother}`}>
                            {withIndividual(individualsByID, individual.mother, individual => individual.name, "Loading...")}
                        </Link>
                        ) :
                        "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Father">
                    {individual.father ?
                        (
                        <Link to={`/individuals/${individual.father}`}>
                            {withIndividual(individualsByID, individual.father, individual => individual.name, "Loading...")}
                        </Link>
                        ) :
                        "—"}
                </Descriptions.Item>
            </Descriptions>
        </PageContent>
    </>;
};

const mapStateToProps = state => ({
    individualsByID: state.individuals.itemsByID,
});

const mapDispatchToProps = dispatch =>
    bindActionCreators({ get }, dispatch);

export default connect(mapStateToProps, mapDispatchToProps)(IndividualsDetailContent);
