import React, { useEffect, useState } from 'react'
import { Taxon, getAllItems } from '../../models/frontend_models'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import AddButton from '../AddButton'
import { Table } from 'antd'
import { getColumnsForTaxon } from './TaxonTableColumns'
import { useAppSelector } from '../../hooks'
import { selectAuthState, selectTaxonsByID, selectUsersByID } from '../../selectors'

export interface TaxonsListContentProps {
	taxons: Taxon[],
}

function TaxonsListContent() {
	const taxonsByID = useAppSelector(selectTaxonsByID)
	const [taxonsData, setTaxonsData] = useState<Taxon[]>();
	const authState = useAppSelector(selectAuthState)
	const usersByID = useAppSelector(selectUsersByID)
	const hasWritePermission = ((authState.currentUserID && usersByID[authState.currentUserID]) ? usersByID[authState.currentUserID].is_superuser : false)
	const columns = getColumnsForTaxon(hasWritePermission)

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
					loading={columns.length == 0}
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