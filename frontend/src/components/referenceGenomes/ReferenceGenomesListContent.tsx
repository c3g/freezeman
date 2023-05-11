import React, { useEffect, useState } from 'react'
import { getAllItems } from '../../models/frontend_models'
import AppPageHeader from '../AppPageHeader'
import PageContent from '../PageContent'
import { useAppSelector } from '../../hooks'
import { selectReferenceGenomesByID, selectTaxonsByID } from '../../selectors'
import { Table } from 'antd'
import AddButton from '../AddButton'
import { ObjectWithReferenceGenome, getColumnsForReferenceGenome } from '../shared/DefinitionsTable/ReferenceGenomeTableColumns'


function ReferenceGenomesListContent() {
	const referenceGenomesState = useAppSelector(selectReferenceGenomesByID)
	const referenceGenomes = getAllItems(referenceGenomesState)
	const [referenceGenomeColumns, setReferenceGenomeColumns] = useState<ObjectWithReferenceGenome[]>();
	const taxonsByID: any = useAppSelector(selectTaxonsByID)
	const columns = getColumnsForReferenceGenome(taxonsByID);

	useEffect(() => {
		const refGenomeColumns = referenceGenomes.map((ref): ObjectWithReferenceGenome => {
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
	}, [referenceGenomes])

	return (
		<>
			<AppPageHeader title='Reference Genomes' extra={[
				<AddButton key='add' url="/genomes/add" />,]} />

			<PageContent>
				<Table
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