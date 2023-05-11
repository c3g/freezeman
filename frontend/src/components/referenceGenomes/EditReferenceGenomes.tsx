import React, { ReactNode, useCallback, useEffect, useState } from "react"
import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import { Alert, Button, Form, FormItemProps, Input, Select, Space } from "antd";
import { ObjectWithReferenceGenome } from "../shared/DefinitionsTable/ReferenceGenomeTableColumns";
import { useNavigate, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { add, list, update } from "../../modules/referenceGenomes/actions";
import { requiredRules } from "../../constants";
import { selectAppInitialzed, selectReferenceGenomesByID, selectTaxonsByID } from "../../selectors";
import * as Options from "../../utils/options";

export const AddReferenceGenomeRoute = () => {
    const appInitialized = useAppSelector(selectAppInitialzed)
    return appInitialized ? <EditReferenceGenomes /> : null
};

export const EditReferenceGenomeRoute = () => {
    const referenceGenomes = useAppSelector(selectReferenceGenomesByID)
    const { id } = useParams()
    const appInitialized = useAppSelector(selectAppInitialzed)
    return (id && referenceGenomes[id] && appInitialized) ? <EditReferenceGenomes referenceGenome={{ ...referenceGenomes[id] }} /> : null
}


const EditReferenceGenomes = ({ referenceGenome }: Partial<ObjectWithReferenceGenome>) => {
    const { Item } = Form
    const [form] = Form.useForm()
    const isAdding = referenceGenome === undefined
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [formErrors, setFormErrors] = useState({})

    let taxonOptions: any = useAppSelector(selectTaxonsByID)
    taxonOptions = Object.keys(taxonOptions).map((id) => taxonOptions[id])

    const itemValidation = (key: string): FormItemProps => {
        if (formErrors && formErrors[key]) {
            return {
                help: formErrors[key],
                validateStatus: 'error',
                name: key
            }
        }
        return { name: key }
    }

    const onValuesChange = (values) => {
        const key = Object.keys(values)[0];
        if (formErrors && formErrors[key]) {
            let copy = { ...formErrors }
            copy[key] = undefined;
            setFormErrors({ ...copy })
        }
    }

    const onFinish = () => {
        const newValues = form.getFieldsValue();
        const newReferenceGenome = {
            id: referenceGenome ? referenceGenome.id : undefined,
            assembly_name: newValues["assembly_name"],
            synonym: newValues["synonym"] ?? null,
            taxon_id: newValues["taxon_id"],
            size: newValues["size"],
            genbank_id: newValues["genbank_id"] ?? null,
            refseq_id: newValues["refseq_id"] ?? null
        }

        if (isAdding) {
            dispatch(
                add({ ...newReferenceGenome })
            ).then(() => {
                navigate('/genomes')
            }).then(() => dispatch(list()))
                .catch(err => setFormErrors({ ...err.data }))
        } else {
            dispatch(
                update(referenceGenome.id, { ...newReferenceGenome })
            ).then(() => {
                navigate('/genomes')
            }).then(() => dispatch(list()))
                .catch(err => setFormErrors({ ...err.data }))
        }
    }
    const onCancel = useCallback(() => {
        navigate(-1)
    }, [navigate])

    return (
        <>
            <AppPageHeader title={(isAdding ? "Add" : "Edit") + " Reference Genome"} />
            <PageContent>
                <Form
                    labelCol={{ span: 4 }}
                    wrapperCol={{ span: 14 }}
                    onFinish={onFinish}
                    onValuesChange={onValuesChange}
                    form={form}
                    initialValues={referenceGenome}>
                    <Item label={"Assembly Name"} {...itemValidation("assembly_name")} rules={requiredRules}>
                        <Input />
                    </Item>
                    <Item label={"Synonym"} {...itemValidation("synonym")}>
                        <Input />
                    </Item>
                    <Item label={"Taxon"} {...itemValidation("taxon_id")} rules={requiredRules}>
                        <Select
                            showSearch
                            allowClear
                            filterOption={false}
                            options={taxonOptions.map(Options.renderTaxon) ?? []}
                            onSearch={() => { }}
                            onFocus={() => { }}
                        />
                    </Item>
                    <Item label={"Size"} {...itemValidation("size")} rules={requiredRules}>
                        <Input />
                    </Item>
                    <Item label={"Genbank ID"} {...itemValidation("genbank_id")}>
                        <Input />
                    </Item>
                    <Item label={"RefSeq ID"} {...itemValidation("refseq_id")} >
                        <Input />
                    </Item>
                    <Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                {
                                    isAdding ? 'Add' : 'Update'
                                }
                            </Button>
                            <Button onClick={onCancel}>Cancel</Button>
                        </Space>
                    </Item>
                </Form>
            </PageContent>
        </>
    );


}
export default EditReferenceGenomes;