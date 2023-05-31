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
import { listTable } from "../../modules/individualDetails/actions";
import { IndividualDetails, IndividualDetailsById } from "../../modules/individualDetails/reducers";
import { Sample } from "../../models/frontend_models";
import { SampleAndLibrary } from "../shared/WorkflowSamplesTable/ColumnSets";

const IndividualsDetailContent = () => {
    const { id } = useParams();
    const dispatch = useAppDispatch()
    const individualDetailsById: IndividualDetailsById = useAppSelector(selectIndividualsDetailsById)

    const [activeKey, setActiveKey] = useHashURL('overview')
    const [individual, setIndividual] = useState<IndividualDetails>()

    useEffect(() => {
        dispatch(listTable(Number(id)));
    }, [id, dispatch])

    useEffect(() => {
        if (individualDetailsById[Number(id)]) {
            const individualInstance: IndividualDetails = {
                ...individualDetailsById[Number(id)]
            }
            if (individualInstance) {
                setIndividual(individualInstance)
            }
        }
    }, [individualDetailsById])

    const samples = individual?.samplesByIndividual.items.reduce((acc, sampleID) => {
        const sample = individual?.samplesByIndividual.itemsByID[sampleID]
        if (sample) {
            acc.push({ sample: sample as Sample })
        }
        return acc
    }, [] as SampleAndLibrary[])

    const title =
        `Individual ${[id, (individual && individual.individual) ? individual.individual.name : undefined].filter(Boolean).join(' - ')}`;

    return <>
        <AppPageHeader title={title} extra={<EditButton url={`/individuals/${id}/update`} />} />
        <PageContent loading={(individual && individual.individual?.isFetching)}>
            <Tabs activeKey={activeKey} onChange={setActiveKey} size="large" type="card">
                <Tabs.TabPane tab="Overview" key="overview">
                    <IndividualOverview individual={individual && individual ? individual.individual : {}} />
                </Tabs.TabPane>
                <Tabs.TabPane tab="Associated Samples" key="samples">
                    {
                        individual &&
                        <IndividualAssociatedSamples samples={samples ?? []} individual={individual} />
                    }
                </Tabs.TabPane>
            </Tabs>
        </PageContent>
    </>;


};

export default IndividualsDetailContent;
