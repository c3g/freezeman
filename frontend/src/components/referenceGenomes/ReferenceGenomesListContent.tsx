import React, { useEffect, useState } from 'react'
import { ReferenceGenome, getAllItems } from '../../models/frontend_models'
import PageContainer from '../PageContainer'
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
	let taxonOptions: any = useAppSelector(selectTaxonsByID)
	const columns = getColumnsForReferenceGenome(taxonOptions);
    taxonOptions = Object.keys(taxonOptions).map((id)=> taxonOptions[id])

	useEffect(() => {
		const referenceGenome = referenceGenomes.map((ref) => {
			const referenceGenomeObject: ObjectWithReferenceGenome = {
				referenceGenome: {
					id: ref.id,
					assembly_name: ref.assembly_name,
					synonym: ref.synonym,
					genbank_id: ref.genbank_id,
					refseq_id: ref.refseq_id,
					size: ref.size,
					taxon_id: ref.taxon_id
				}
			};
			return referenceGenomeObject;
		})
		setReferenceGenomeColumns(referenceGenome)
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