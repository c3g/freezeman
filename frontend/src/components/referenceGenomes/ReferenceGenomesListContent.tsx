import React, { useEffect, useState } from 'react'
import { getAllItems } from '../../models/frontend_models'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import { useAppSelector } from '../../hooks'
import { selectReferenceGenomesByID, selectTaxonsByID } from '../../selectors'
import { Table } from 'antd'
import AddButton from '../AddButton'
import { getColumnsForReferenceGenome } from './ReferenceGenomeTableColumns'
import { ReferenceGenome } from '../../models/frontend_models'


function ReferenceGenomesListContent() {
	const [referenceGenomeColumns, setReferenceGenomeColumns] = useState<ReferenceGenome[]>();
	const referenceGenomesByID = useAppSelector(selectReferenceGenomesByID)
	const taxonsByID = useAppSelector(selectTaxonsByID)
	const columns = getColumnsForReferenceGenome(taxonsByID);

	useEffect(() => {
		const referenceGenomes = getAllItems(referenceGenomesByID)
		const refGenomeColumns: ReferenceGenome[] = referenceGenomes.map((ref) => { return { ...ref } })
		setReferenceGenomeColumns(refGenomeColumns)
	}, [referenceGenomesByID])

	return (
		<>
			<AppPageHeader title='Reference Genomes' extra={[
				<AddButton key='add' url="/genomes/add" />,]} />

			<PageContent>
				<Table
					rowKey={obj => obj.id}
					bordered={true}
					dataSource={referenceGenomeColumns}
					columns={columns}
					style={{ overflowX: 'auto' }}>
				</Table>
			</PageContent>
		</>
	)
}

export default ReferenceGenomesListContent