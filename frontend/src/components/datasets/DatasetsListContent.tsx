import React from "react"
import AppPageHeader from "../AppPageHeader"
import DatasetTable from "./DatasetTable";
import ListPageContent from "../ListPageContent";

const DatasetsListContent = () => {
    return <>
        <AppPageHeader title="Datasets"/>
        <ListPageContent>
            <DatasetTable />
        </ListPageContent>
    </>;
    }

export default DatasetsListContent;