import { Form, Input } from "antd";
import React, { useState } from "react";
import { requiredRules } from "../../constants";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectAppInitialzed, selectTaxonsByID } from "../../selectors";
import { useNavigate } from "react-router-dom";
import { useIDParam } from "../../hooks/useIDParams";
import { add, update } from "../../modules/taxons/actions";

export interface Taxon {
    id: number
    ncbi_id: number
    name: string
}
interface EditTaxonProps {
    taxon: Taxon
}

export const AddTaxonRoute = () => {
    const emptyTaxon = { id: -1, ncbi_id: -1, name: "" }
    const appInitialzed = useAppSelector(selectAppInitialzed)

    return (appInitialzed && <EditTaxon taxon={emptyTaxon} />)
}
export const EditConstRoute = () => {
    const taxons = useAppSelector(selectTaxonsByID)
    const taxonID = useIDParam("id");
    const appInitialzed = useAppSelector(selectAppInitialzed)

    return (appInitialzed && <EditTaxon taxon={taxons[taxonID ?? -1]} />)
}

const EditTaxon = ({ taxon }: EditTaxonProps) => {
    const { Item } = Form
    const [formErrors, setFormErrors] = useState({})
    const [form] = Form.useForm()
    const isAdding = taxon.id === -1
    const navigate = useNavigate();
    const dispatch = useAppDispatch()

    const props = (name: string) =>
        !formErrors[name] ? { name } : {
            name,
            hasFeedback: true,
            // validateStatus: "error", 
            help: formErrors[name],
        }
    const onFinish = async () => {
        const new_taxon: Taxon = taxon;
        const fieldValues = form.getFieldsValue();
        fieldValues.forEach((fieldName: string) => {
            new_taxon[fieldName] = fieldValues[fieldName]
        })
        if (isAdding) {
            await dispatch(
                add({ new_taxon })
            ).then(() => {
                navigate('/taxonList')
            })
        } else {
            await dispatch(
                update(new_taxon.id, new_taxon)
            ).then(() => {
                navigate('/ taxonList')
            })
        }
    }

    return (
        <>
            <Form
                onFinish={onFinish}
                form={form}
                initialValues={taxon}>
                <Item label={"ncbi_id"} {...props("ncbi_id")} rules={requiredRules}>
                    <Input />
                </Item>
                <Item label={"name"} {...props("name")} rules={requiredRules}>
                    <Input />
                </Item>
            </Form>
        </>
    );
}
export default EditTaxon;