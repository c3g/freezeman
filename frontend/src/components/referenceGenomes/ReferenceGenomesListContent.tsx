import React, { useEffect, useState } from 'react'
import { getAllItems } from '../../models/frontend_models'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import { useAppSelector } from '../../hooks'
import { selectReferenceGenomesByID, selectTaxonsByID } from '../../selectors'
import { Table } from 'antd'
import AddButton from '../AddButton'
import { getColumnsForReferenceGenome, ObjectWithReferenceGenome } from './ReferenceGenomeTableColumns'


function ReferenceGenomesListContent() {
	const [referenceGenomeColumns, setReferenceGenomeColumns] = useState<ObjectWithReferenceGenome[]>();
	const referenceGenomesByID = useAppSelector(selectReferenceGenomesByID)
	const taxonsByID = useAppSelector(selectTaxonsByID)
	const columns = getColumnsForReferenceGenome(taxonsByID);

	useEffect(() => {
		const referenceGenomes = getAllItems(referenceGenomesByID)
		const refGenomeColumns: ObjectWithReferenceGenome[] = referenceGenomes.map((ref) => {
			return {
				referenceGenome: {
					id: ref.id,
					assembly_name: ref.assembly_name,
					synonym: ref.synonym ?? '',
					genbank_id: ref.genbank_id ?? '',
					refseq_id: ref.refseq_id ?? '',
					size: ref.size,
					taxon_id: ref.taxon_id
				}
			};
		})
		setReferenceGenomeColumns(refGenomeColumns)
	}, [referenceGenomesByID])

	return (
		<>
			<AppPageHeader title='Reference Genomes' extra={[
				<AddButton key='add' url="/genomes/add" />,]} />

			<PageContent>
				<Table
					rowKey={obj => obj.referenceGenome.id}
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