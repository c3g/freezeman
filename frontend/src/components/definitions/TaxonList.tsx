import React, { useEffect, useMemo, useState } from 'react';
import { useAppSelector } from '../../hooks';
import { selectTaxonsByID } from '../../selectors';
import { Table } from 'antd';
import { IdentifiedTableColumnType } from '../shared/WorkflowSamplesTable/SampleTableColumns';
import { ObjectWithDefinition } from '../shared/DefinitionsTable/DefinitionTableColumns';
import { getColumnsForDefinition } from '../shared/DefinitionsTable/ColumnSets';

const DefinitionPage = () => {

    const [taxons, setTaxons] = useState<ObjectWithDefinition[]>();
    const taxonsByID = useAppSelector(selectTaxonsByID)
    const columns: IdentifiedTableColumnType<ObjectWithDefinition>[] = getColumnsForDefinition("Taxon")

    useEffect(() => {
        const tax = Object.keys(taxonsByID).map((key) => {
            const taxonObject: ObjectWithDefinition = {
                definition: {
                    id: key,
                    name: taxonsByID[key].name,
                    ncbi_id: taxonsByID[key].ncbi_id
                }
            };
            return taxonObject;
        })
        setTaxons(tax)
    }, [taxonsByID])

    return (
        <>
            <Table
                dataSource={taxons}
                columns={columns}>
            </Table>
        </>
    );
}
export default DefinitionPage