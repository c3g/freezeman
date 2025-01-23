import React from "react"
import DatasetTable, { DatasetTableProps } from "./DatasetTable"
import AppPageHeader from "../AppPageHeader"
import PageContent from "../PageContent"

export interface DatasetsListContentProps extends DatasetTableProps {}
function DatasetsListContent({ ...datasetTableProps }: DatasetsListContentProps) {
	return(
		<>
			<AppPageHeader title="Datasets"/>
			<PageContent>
				<DatasetTable {...datasetTableProps}/>
			</PageContent>
		</>
	)
}

export default DatasetsListContent
