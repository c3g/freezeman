import React from "react"
import AppPageHeader from "../AppPageHeader"
import PageContent from "../PageContent"
import DatasetTable from "./DatasetTable";

const DatasetsListContent = () => {
    return <>
        <AppPageHeader title="Datasets"/>
        <PageContent>
            <DatasetTable />
        </PageContent>
    </>;
    }

export default DatasetsListContent;