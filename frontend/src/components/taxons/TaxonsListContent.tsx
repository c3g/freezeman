import React, { useEffect, useState } from 'react'
import { Taxon, getAllItems } from '../../models/frontend_models'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import AddButton from '../AddButton'
import { Table } from 'antd'
import { getColumnsForTaxon } from './TaxonTableColumns'
import { useAppSelector } from '../../hooks'
import { selectTaxonsByID } from '../../selectors'

export interface TaxonsListContentProps {
	taxons: Taxon[],
}

function TaxonsListContent() {
	const taxonsByID = useAppSelector(selectTaxonsByID)
	const [taxonsData, setTaxonsData] = useState<Taxon[]>();
	const columns = getColumnsForTaxon()

	useEffect(() => {
		const taxons: Taxon[] = getAllItems(taxonsByID)
		const tax = (taxons).map((taxon) => {
			return { ...taxon };
		})
		setTaxonsData(tax)
	}, [taxonsByID])

	return (
		<>
			<AppPageHeader title="Taxons" extra={[
				<AddButton key='add' url="/taxons/add" />,]} />
			<PageContent>
				<Table
					rowKey={taxon => taxon.id}
					bordered={true}
					dataSource={taxonsData}
					columns={columns}
					style={{ overflowX: 'auto' }}>
				</Table>
			</PageContent>
		</>
	);
}

export default TaxonsListContent