import { Button, Form, Input, Space } from "antd";
import React, { useCallback, useState } from "react";
import { requiredRules } from "../../constants";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectAppInitialzed, selectTaxonsByID } from "../../selectors";
import { useNavigate, useParams } from "react-router-dom";
import { add, update } from "../../modules/taxons/actions";
import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";

export interface Taxon {
    id?: number | null
    ncbi_id: string
    name: string
}
export interface EditTaxonProps {
    taxon: Taxon
}

export const AddTaxonRoute = () => {
    const emptyTaxon = { ncbi_id: "", name: "" }
    const appInitialzed = useAppSelector(selectAppInitialzed)

    return appInitialzed ? <EditTaxon taxon={emptyTaxon} /> : null

}
export const EditTaxonRoute = () => {
    const taxons = useAppSelector(selectTaxonsByID)
    const { id } = useParams();
    const appInitialzed = useAppSelector(selectAppInitialzed)

    return appInitialzed ? <EditTaxon taxon={taxons[id ?? -1]} /> : null

}

const EditTaxon = ({ taxon }: EditTaxonProps) => {
    const { Item } = Form
    const [formErrors, setFormErrors] = useState({})
    const [form] = Form.useForm()
    const isAdding = taxon.id === undefined
    const navigate = useNavigate();
    const dispatch = useAppDispatch()

    const props = (name: string) =>
        !formErrors[name] ? { name } : {
            name,
            hasFeedback: true,
            // validateStatus: "error", 
            help: formErrors[name],
        }
    const onFinish = () => {
        const new_taxon: Taxon = taxon;
        const fieldValues = form.getFieldsValue();
        Object.keys(fieldValues).forEach((fieldName: string) => {
            new_taxon[fieldName] = fieldValues[fieldName]
        })
        if (isAdding) {
            dispatch(
                add({ new_taxon })
            )
            .then(() => {
                navigate('/taxons')
            })
        } else {
            dispatch(
                update(new_taxon.id, new_taxon)
            ).then(() => {
                navigate('/taxons')
            })
        }
    }
    const onCancel = useCallback(() => {
        navigate(-1)
      }, [navigate])

    return (
        <>
            <AppPageHeader
                title={isAdding ? "Add" : "Edit"}
            />
            <PageContent>

                <Form
                    labelCol={{ span: 4 }}
                    wrapperCol={{ span: 14 }}
                    layout="horizontal"
                    onFinish={onFinish}
                    form={form}
                    initialValues={taxon}>
                    <Item label={"ncbi_id"} {...props("ncbi_id")} rules={requiredRules}>
                        <Input />
                    </Item>
                    <Item label={"name"} {...props("name")} rules={requiredRules}>
                        <Input />
                    </Item>
                    <Item>
                        <Space>
                            <Button type="primary" htmlType="submit">
                                Submit
                            </Button>
                            <Button onClick={onCancel}>Cancel</Button>
                        </Space>
                    </Item>
                </Form>
            </PageContent>
        </>
    );
}
export default EditTaxon;