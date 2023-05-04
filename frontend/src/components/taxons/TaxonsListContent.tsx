import React, { useEffect, useState } from 'react'
import { Taxon, getAllItems } from '../../models/frontend_models'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import AddButton from '../AddButton'
import { Table } from 'antd'
import { ObjectWithTaxon, getColumnsForTaxon } from '../shared/DefinitionsTable/TaxonTableColumns'
import { IdentifiedTableColumnType } from '../shared/WorkflowSamplesTable/SampleTableColumns'
import { useAppSelector } from '../../hooks'
import { selectTaxonsByID } from '../../selectors'

export interface TaxonsListContentProps {
	taxons: Taxon[],
}

function TaxonsListContent() {
	const taxonsState = useAppSelector(selectTaxonsByID)
	const taxons: Taxon[] = getAllItems(taxonsState)
	const [taxonColumns, setTaxonColumnss] = useState<ObjectWithTaxon[]>();
	const columns: IdentifiedTableColumnType<ObjectWithTaxon>[] = getColumnsForTaxon()

	useEffect(() => {
		const tax = (taxons).map((taxon) => {
			const taxonObject: ObjectWithTaxon = {
				taxon: {
					id: taxon.id,
					name: taxon.name,
					ncbi_id: taxon.ncbi_id
				}
			};
			return taxonObject;
		})
		setTaxonColumnss(tax)
	}, [taxons])

	return (
		<>
			<AppPageHeader title="Taxons" extra={[
				<AddButton key='add' url="/taxons/add"/>,]} />
			<PageContent>
				<Table
					bordered={true}
					dataSource={taxonColumns}
					columns={columns}
					style={{ overflowX: 'auto' }}>
				</Table>
			</PageContent>
		</>
	);
}

export default TaxonsListContent