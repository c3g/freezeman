import React from "react"
import AppPageHeader from "../AppPageHeader"
import PageContent from "../PageContent"
import { useAppSelector } from "../../hooks";
import { selectReadsetsTable } from "../../selectors";


const ReadsetsListContent = () =>{
    const readsetState = useAppSelector(selectReadsetsTable)
    return <>
        <AppPageHeader title="Datasets"/>
        <PageContent>
            
        </PageContent>
    </>;
}
export default ReadsetsListContent