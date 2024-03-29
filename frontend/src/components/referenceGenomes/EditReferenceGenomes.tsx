import React, { useCallback, useState } from "react"
import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import { Button, Form, FormItemProps, Input, Select, Space } from "antd";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { add, list, update } from "../../modules/referenceGenomes/actions";
import { requiredRules } from "../../constants";
import { selectAppInitialized, selectAuthState, selectReferenceGenomesByID, selectTaxonsByID, selectUsersByID } from "../../selectors";
import * as Options from "../../utils/options";
import { ReferenceGenome, getAllItems } from "../../models/frontend_models";

interface EditReferenceGenomesProps {
    referenceGenome?: ReferenceGenome
}

export const AddReferenceGenomeRoute = () => {
    const appInitialized = useAppSelector(selectAppInitialized)
    return appInitialized ? <EditReferenceGenomes /> : null
};

export const EditReferenceGenomeRoute = () => {
    const { id } = useParams()
    const referenceGenomes = useAppSelector(selectReferenceGenomesByID)
    const appInitialized = useAppSelector(selectAppInitialized)
    const authState = useAppSelector(selectAuthState)
    const usersByID = useAppSelector(selectUsersByID)
    const hasWritePermission = ((authState.currentUserID && usersByID[authState.currentUserID]) ? usersByID[authState.currentUserID].is_superuser : false);

    if (appInitialized) {
        return (id && referenceGenomes && referenceGenomes[id] && hasWritePermission) ?
            <EditReferenceGenomes referenceGenome={{ ...referenceGenomes[id] }} /> : <Navigate to={"/genomes/list"} />
    } else {
        return null
    }
}


const EditReferenceGenomes = ({ referenceGenome }: EditReferenceGenomesProps) => {
    const { Item } = Form

    const [form] = Form.useForm()
    const [formErrors, setFormErrors] = useState({})

    const isAdding = referenceGenome === undefined
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const taxonsByID = useAppSelector(selectTaxonsByID)
    const taxonOptions = getAllItems(taxonsByID)

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

    const inputDisable = () => {
        return {
            disabled: isAdding ? false : !referenceGenome?.editable
        }
    }

    const onValuesChange = (values) => {
        const key = Object.keys(values)[0];
        if (formErrors && formErrors[key]) {
            const copy = { ...formErrors }
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
            <AppPageHeader title={(isAdding ? `Add Reference Genome` : `Edit Reference Genome ${referenceGenome.assembly_name}`)} />
            <PageContent>
                <Form
                    labelCol={{ span: 4 }}
                    wrapperCol={{ span: 14 }}
                    onFinish={onFinish}
                    onValuesChange={onValuesChange}
                    form={form}
                    initialValues={referenceGenome}>
                    <Item label={"Assembly Name"} {...itemValidation("assembly_name")} rules={requiredRules}>
                        <Input {...inputDisable()} />
                    </Item>
                    <Item label={"Synonym"} {...itemValidation("synonym")}>
                        <Input />
                    </Item>
                    <Item label={"Taxon"} {...itemValidation("taxon_id")} rules={requiredRules}>
                        <Select
                            {...inputDisable()}
                            showSearch
                            allowClear
                            filterOption={(input, option) => (option?.label?.props.children ?? '').toString().toLowerCase().includes(input.toString().toLowerCase())}
                            options={taxonOptions.map(Options.renderTaxon) ?? []}
                        />
                    </Item>
                    <Item label={"Size"} {...itemValidation("size")} rules={requiredRules}>
                        <Input {...inputDisable()} />
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