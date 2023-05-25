import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Tabs } from 'antd'
import useHashURL from '../../hooks/useHashURL'
import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import EditButton from "../EditButton";
import IndividualOverview from "./IndividualOverview";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectIndividualsDetailsById } from "../../selectors";
import IndividualAssociatedSamples from "./IndividualAssociatedSamples";
import { getIndividualDetails } from "../../modules/individualDetails/actions";
import { Individual, IndividualDetailsState as IndividualsDetailsById } from "../../modules/individualDetails/reducers";
import { FetchedState } from "../../modules/common";
import { Sample, getAllItems } from "../../models/frontend_models";
import { SampleAndLibrary } from "../shared/WorkflowSamplesTable/ColumnSets";

const IndividualsDetailContent = () => {
    const { id } = useParams();
    const dispatch = useAppDispatch()
    const individualDetailsById: IndividualsDetailsById = useAppSelector(selectIndividualsDetailsById)

    const [activeKey, setActiveKey] = useHashURL('overview')
    const [individual, setIndividual] = useState<FetchedState<Individual>>()

    useEffect(() => {
        dispatch(getIndividualDetails(Number(id)));
    }, [id, dispatch])

    useEffect(() => {
        if (individualDetailsById[Number(id)]) {
            const individualInstance: FetchedState<Individual> = {
                ...individualDetailsById[Number(id)]
            }
            if (individualInstance) {
                setIndividual(individualInstance)
            }
        }
    }, [individualDetailsById])

    const tabsStyle = {
        marginTop: 8,
    }

    const tabPaneStyle = {
        padding: '0 24px 24px 24px',
        overflow: 'auto',
        height: '100%',
    }

    const samples = individual?.data?.samplesByIndividual.items.reduce((acc, sampleID) => {
        const sample = individual?.data?.samplesByIndividual.itemsByID[sampleID]
        if (sample) {
            acc.push({ sample: sample as Sample })
        }
        return acc
    }, [] as SampleAndLibrary[])
    
    const title =
        `Individual ${[id, (individual && individual.data?.individual) ? individual.data.individual.name : undefined].filter(Boolean).join(' - ')}`;

    return <>
        <AppPageHeader title={title} extra={
            <EditButton url={`/individuals/${id}/update`} />
        } />
        <PageContent loading={(individual && individual.isFetching)}>
            <Tabs activeKey={activeKey} onChange={setActiveKey} size="large" type="card" style={tabsStyle}>
                <Tabs.TabPane tab="Overview" key="overview" style={tabPaneStyle}>
                    <IndividualOverview individual={individual && individual.data ? individual.data?.individual : {}} />
                </Tabs.TabPane>
                <Tabs.TabPane tab="Associated Samples" key="samples" style={tabPaneStyle}>
                    {
                        individual && individual.data &&
                        <IndividualAssociatedSamples samples={samples ?? []} individual={individual.data} />
                    }
                </Tabs.TabPane>
            </Tabs>
        </PageContent>
    </>;


};

export default IndividualsDetailContent;
