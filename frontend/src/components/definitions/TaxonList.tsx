import React, { useEffect, useMemo, useState } from 'react';
import { useAppSelector } from '../../hooks';
import { selectTaxonsByID } from '../../selectors';
import { Table } from 'antd';
import { IdentifiedTableColumnType } from '../shared/WorkflowSamplesTable/SampleTableColumns';
import { ObjectWithTaxon, getColumnsForTaxon } from '../shared/DefinitionsTable/TaxonTableColumns';
import AppPageHeader from '../AppPageHeader';
import AddButton from '../AddButton';
const DefinitionPage = () => {

    const [taxons, setTaxons] = useState<ObjectWithTaxon[]>();
    const taxonsByID = useAppSelector(selectTaxonsByID)
    const columns: IdentifiedTableColumnType<ObjectWithTaxon>[] = getColumnsForTaxon()

    useEffect(() => {
        const tax = Object.keys(taxonsByID).map((key) => {
            const taxonObject: ObjectWithTaxon = {
                taxon: {
                    id: Number(key),
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
            <AppPageHeader title="Taxons" extra={[
                <AddButton key='add' url="/taxons/add" />,]} />
            <Table
                dataSource={taxons}
                columns={columns}>
            </Table>
        </>
    );
}
export default DefinitionPage