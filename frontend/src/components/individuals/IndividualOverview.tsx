import { Descriptions } from 'antd'
import React from 'react'
import { Link } from 'react-router-dom'
import TrackingFieldsContent from '../TrackingFieldsContent'
import { WithIndividualRenderComponent, WithReferenceGenomeRenderComponent, WithTaxonRenderComponent } from '../shared/WithItemRenderComponent'



const IndividualOverview = ({ individual }) => {

    return (
        individual ?
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
                                    <WithIndividualRenderComponent
                                        objectID={individual.father}
                                        render={(individual) => <span>{individual.mother}</span>}
                                    />
                                </Link>
                            ) :
                            "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Father" span={3}>
                        {individual.father ?
                            (
                                <Link to={`/individuals/${individual.father}`}>
                                    <WithIndividualRenderComponent
                                        objectID={individual.father}
                                        render={(individual) => <span>{individual.father}</span>}
                                    />
                                </Link>
                            ) :
                            "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Taxon"><em>{individual.taxon &&
                        <WithTaxonRenderComponent
                            objectID={individual.taxon}
                            render={(taxon) => <span>{taxon.name}</span>}
                        />

                    }</em></Descriptions.Item>
                    <Descriptions.Item label="Reference Genome">{individual.reference_genome &&
                        <WithReferenceGenomeRenderComponent
                            objectID={individual.reference_genome}
                            render={(ref) => <span>{ref.assembly_name}</span>}
                        />
                    }</Descriptions.Item>
                </Descriptions>
                <TrackingFieldsContent entity={individual} />
            </>
            : null
    )
}
export default IndividualOverview