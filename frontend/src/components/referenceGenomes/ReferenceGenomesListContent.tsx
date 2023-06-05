import React, { useEffect, useState } from 'react'
import { getAllItems } from '../../models/frontend_models'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import { useAppSelector } from '../../hooks'
import { selectAuthState, selectReferenceGenomesByID, selectTaxonsByID, selectUsersByID } from '../../selectors'
import { Table } from 'antd'
import AddButton from '../AddButton'
import { getColumnsForReferenceGenome } from './ReferenceGenomeTableColumns'
import { ReferenceGenome } from '../../models/frontend_models'


function ReferenceGenomesListContent() {
	const [referenceGenomes, setReferenceGenomes] = useState<ReferenceGenome[]>();
	const referenceGenomesByID = useAppSelector(selectReferenceGenomesByID)
	const taxonsByID = useAppSelector(selectTaxonsByID)
	const authState = useAppSelector(selectAuthState)
	const usersByID = useAppSelector(selectUsersByID)
	const hasWritePermission = ((authState.currentUserID && usersByID[authState.currentUserID]) ? usersByID[authState.currentUserID].is_superuser : false)
	const columns = getColumnsForReferenceGenome(taxonsByID, hasWritePermission);

	useEffect(() => {
		const refGenomesByID = getAllItems(referenceGenomesByID)
		const refGenomeColumns: ReferenceGenome[] = refGenomesByID.map((ref) => { return { ...ref } })
		setReferenceGenomes(refGenomeColumns)
	}, [referenceGenomesByID])

	return (
		<>
			<AppPageHeader title='Reference Genomes' extra={[
				<AddButton key='add' url="/genomes/add" />,]} />

			<PageContent>
				<Table
					loading={columns.length == 0}
					rowKey={obj => obj.id}
					bordered={true}
					dataSource={referenceGenomes}
					columns={columns}
					style={{ overflowX: 'auto' }}>
				</Table>
			</PageContent>
		</>
	)
}

export default ReferenceGenomesListContent