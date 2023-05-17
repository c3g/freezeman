import React, { useEffect, useState } from "react";
// import { bindActionCreators } from "redux";
// import { connect } from "react-redux";
import { useParams } from "react-router-dom";
import { Tabs } from 'antd'
import useHashURL from '../../hooks/useHashURL'
import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import EditButton from "../EditButton";
import IndividualOverview from "./IndividualOverview";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectIndividualsByID, selectIndividualsDetailsById } from "../../selectors";
// import { get } from "../../modules/individuals/actions";
import IndividualAssociatedSamples from "./IndividualAssociatedSamples";
import { getIndividualDetails } from "../../modules/individualDetails/actions";
import { IndividualsDetailsById } from "../../modules/individualDetails/reducers";
import { get } from "../../modules/individuals/actions";

const IndividualsDetailContent = () => {
    const { id } = useParams();
    const dispatch = useAppDispatch()
    const individualsByID = useAppSelector(selectIndividualsByID)
    const isLoaded = id && individualsByID[id];
    const individual = id && individualsByID[id] || {};
    const [activeKey, setActiveKey] = useHashURL('overview')

    if (!isLoaded) {
        get(Number(id))
        dispatch(getIndividualDetails(Number(id)));
    }

    const isLoading = !isLoaded || individual.isFetching;
    const title =
        `Individual ${[id, individual ? individual.name : undefined].filter(Boolean).join(' - ')}`;

    const tabsStyle = {
        marginTop: 8,
    }

    const tabPaneStyle = {
        padding: '0 24px 24px 24px',
        overflow: 'auto',
        height: '100%',
    }

    // useEffect(() => {
    //     const individualDetails = (useAppSelector(selectIndividualsDetailsById))
    //     setIndividual(individualDetails[Number(id)])
    // }, [])

    return <>
        <AppPageHeader title={title} extra={
            <EditButton url={`/individuals/${id}/update`} />
        } />
        <PageContent loading={isLoading}>
            <Tabs activeKey={activeKey} onChange={setActiveKey} size="large" type="card" style={tabsStyle}>
                <Tabs.TabPane tab="Overview" key="overview" style={tabPaneStyle}>
                    <IndividualOverview individual={individual} />
                </Tabs.TabPane>
                <Tabs.TabPane tab="Associated Samples" key="samples" style={tabPaneStyle}>
                    <IndividualAssociatedSamples />
                </Tabs.TabPane>
            </Tabs>
        </PageContent>
    </>;
};

export default IndividualsDetailContent;
