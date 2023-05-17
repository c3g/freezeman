import { Descriptions } from 'antd'
import React from 'react'
import { withIndividual, withReferenceGenome, withTaxon } from '../../utils/withItem'
import { Link } from 'react-router-dom'
import TrackingFieldsContent from '../TrackingFieldsContent'
import { useAppSelector } from '../../hooks'
import { selectIndividualsByID, selectReferenceGenomesByID, selectTaxonsByID } from '../../selectors'



const IndividualOverview = ({ individual }) => {
    const taxonsByID = useAppSelector(selectTaxonsByID)
    const individualsByID = useAppSelector(selectIndividualsByID)
    const referenceGenomesByID = useAppSelector(selectReferenceGenomesByID)
    return (
        <>
            <Descriptions bordered={true} size="small" column={3}>
                <Descriptions.Item label="ID">{individual.id}</Descriptions.Item>
                <Descriptions.Item label="Name">{individual.name}</Descriptions.Item>
                <Descriptions.Item label="Alias">{individual.alias}</Descriptions.Item>
                <Descriptions.Item label="Sex">{individual.sex}</Descriptions.Item>
                <Descriptions.Item label="Cohort">{individual.cohort}</Descriptions.Item>
                <Descriptions.Item label="Pedigree">{individual.pedigree}</Descriptions.Item>
                <Descriptions.Item label="Mother" span={3}>
                    {individual.mother ?
                        (
                            <Link to={`/individuals/${individual.mother}`}>
                                {withIndividual(individualsByID, individual.mother, individual => individual.name, "Loading...")}
                            </Link>
                        ) :
                        "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Father" span={3}>
                    {individual.father ?
                        (
                            <Link to={`/individuals/${individual.father}`}>
                                {withIndividual(individualsByID, individual.father, individual => individual.name, "Loading...")}
                            </Link>
                        ) :
                        "—"}
                </Descriptions.Item>
                <Descriptions.Item label="Taxon"><em>{individual.taxon && withTaxon(taxonsByID, individual.taxon, taxon => taxon.name, "Loading...")}</em></Descriptions.Item>
                <Descriptions.Item label="Reference Genome">{individual.reference_genome && withReferenceGenome(referenceGenomesByID, individual.reference_genome, reference_genome => reference_genome.assembly_name, "Loading...")}</Descriptions.Item>
            </Descriptions>
            <TrackingFieldsContent entity={individual} />
        </>
    )
}
export default IndividualOverview