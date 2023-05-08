import { Button, Form, Input, Space } from "antd";
import React, { useCallback, useEffect, useState } from "react";
import { requiredRules } from "../../constants";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectAppInitialzed, selectTaxonsByID } from "../../selectors";
import { useNavigate, useParams } from "react-router-dom";
import { add, list, update } from "../../modules/taxons/actions";
import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import { ObjectWithTaxon } from "../shared/DefinitionsTable/TaxonTableColumns";


export const AddTaxonRoute = () => {
    const appInitialzed = useAppSelector(selectAppInitialzed)
    return appInitialzed ? <EditTaxon /> : null

}
export const EditTaxonRoute = () => {
    const taxons = useAppSelector(selectTaxonsByID)
    const { id } = useParams();
    const appInitialzed = useAppSelector(selectAppInitialzed)
    return (id && taxons[id] && appInitialzed) ? <EditTaxon taxon={{ ...taxons[id] }} /> : null
}

const EditTaxon = ({ taxon }: Partial<ObjectWithTaxon>) => {
    const { Item } = Form
    const [formErrors, setFormErrors] = useState({})
    const [form] = Form.useForm()
    const isAdding = taxon === undefined
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const props = (name: string) =>
        !formErrors[name] ? { name } : {
            name,
            hasFeedback: true,
            help: formErrors[name],
        }
    const onFinish = () => {
        const fieldValues = form.getFieldsValue();
        const new_taxon = { taxon: { id: taxon ? taxon.id : undefined, name: fieldValues['name'], ncbi_id: fieldValues['ncbi_id'] } };
        if (isAdding) {
            dispatch(
                add({ new_taxon })
            ).then(() => {
                navigate('/taxons')
            }).then(() => { dispatch(list()) })
        } else {
            dispatch(
                update(taxon.id, new_taxon)
            ).then(() => {
                navigate('/taxons')
            }).then(() => { dispatch(list()) })
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