import { Descriptions } from 'antd'
import React from 'react'
import { ReferenceGenome, Taxon } from '../../models/frontend_models'

const { Item } = Descriptions


interface ReferenceGenomeDescriptionProps {
    referenceGenome: ReferenceGenome
    taxon?: Taxon
}

const ReferenceGenomeDescription = ({referenceGenome, taxon} : ReferenceGenomeDescriptionProps) => {
    return (
        <Descriptions bordered={true} size='small' column={6}>
            <Item label='Assembly Name' span={2}>{referenceGenome.assembly_name}</Item>
            <Item label='Synonym' span={2}>{referenceGenome.synonym}</Item>
            <Item label='GenBank ID' span={2}>{referenceGenome.genbank_id}</Item>
            <Item label='RefSeq ID' span={2}>{referenceGenome.refseq_id}</Item>
            <Item label='Taxon' span={2}>{taxon?.name}</Item>
            <Item label='NCBI ID' span={2}>{taxon?.ncbi_id}</Item>
            <Item label='Size (bp)' span={2}>{referenceGenome.size}</Item>
        </Descriptions>
    )
}

export default ReferenceGenomeDescription