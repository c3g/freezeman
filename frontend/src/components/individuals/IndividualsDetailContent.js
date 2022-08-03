import React from "react";
import {bindActionCreators} from "redux";
import {connect} from "react-redux";
import {Link, useHistory, useParams} from "react-router-dom";
import {Descriptions, Typography} from "antd";
const {Title} = Typography;

import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import EditButton from "../EditButton";
import TrackingFieldsContent from "../TrackingFieldsContent";
import {withIndividual, withTaxon} from "../../utils/withItem";
import {get} from "../../modules/individuals/actions";

const mapStateToProps = state => ({
    individualsByID: state.individuals.itemsByID,
    taxonsByID: state.taxons.itemsByID,
});

const mapDispatchToProps = dispatch =>
    bindActionCreators({ get }, dispatch);

const IndividualsDetailContent = ({individualsByID, taxonsByID, get}) => {
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
        <AppPageHeader title={title} extra={
            <EditButton url={`/individuals/${id}/update`} />
        }/>
        <PageContent loading={isLoading}>
            <Title level={2}>Overview</Title>
            <Descriptions bordered={true} size="small" column={3}>
                <Descriptions.Item label="ID">{individual.id}</Descriptions.Item>
                <Descriptions.Item label="Name">{individual.name}</Descriptions.Item>
                <Descriptions.Item label="Alias">{individual.alias}</Descriptions.Item>
                <Descriptions.Item label="Taxon"><em>{individual.taxon && withTaxon(taxonsByID, individual.taxon, taxon => taxon.name, "Loading...")}</em></Descriptions.Item>
                <Descriptions.Item label="Sex">{individual.sex}</Descriptions.Item>
                <Descriptions.Item label="Cohort">{individual.cohort}</Descriptions.Item>
                <Descriptions.Item label="Pedigree">{individual.pedigree}</Descriptions.Item>
                <Descriptions.Item label="Mother" span={3}>
                    {individual.mother ?
                        (
                        <Link to={`/individuals/${individual.mother}`}>
                            {withIndividual(individualsByID, individual.mother, individual => individual.name, "Loading...")}
                        </Link>
                        ) :
                        "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Father" span={3}>
                    {individual.father ?
                        (
                        <Link to={`/individuals/${individual.father}`}>
                            {withIndividual(individualsByID, individual.father, individual => individual.name, "Loading...")}
                        </Link>
                        ) :
                        "—"}
                </Descriptions.Item>
            </Descriptions>
            <TrackingFieldsContent entity={individual}/>
        </PageContent>
    </>;
};

export default connect(mapStateToProps, mapDispatchToProps)(IndividualsDetailContent);
