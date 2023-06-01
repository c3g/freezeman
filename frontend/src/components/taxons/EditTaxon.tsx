import { Button, Form, FormItemProps, Input, Space } from "antd";
import React, { useCallback, useState } from "react";
import { requiredRules } from "../../constants";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectAppInitialzed, selectAuthState, selectTaxonsByID, selectUsersByID } from "../../selectors";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { add, list, update } from "../../modules/taxons/actions";
import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import { Taxon } from "../../models/frontend_models";
import { } from 'react-router-dom'

export interface EditTaxonProps {
    taxon: Taxon,
}
export const AddTaxonRoute = () => {
    const appInitialzed = useAppSelector(selectAppInitialzed)
    return appInitialzed ? <EditTaxon /> : null

}
export const EditTaxonRoute = () => {
    const taxons = useAppSelector(selectTaxonsByID)
    const { id } = useParams();
    const appInitialzed = useAppSelector(selectAppInitialzed)
    const authState = useAppSelector(selectAuthState)
    const users = useAppSelector(selectUsersByID)
    const hasWritePermission = (authState.currentUserID ? users[authState.currentUserID].is_superuser : false);
    return (id && taxons[id] && appInitialzed && hasWritePermission) ? <EditTaxon taxon={{ ...taxons[id] }} /> :
        <Navigate to={"/taxons/list"} />
}

const EditTaxon = ({ taxon }: Partial<EditTaxonProps>) => {
    const { Item } = Form

    const [formErrors, setFormErrors] = useState({})
    const [form] = Form.useForm()

    const isAdding = taxon === undefined
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

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
            const formErrors_copy = { ...formErrors }
            formErrors_copy[key] = undefined;
            setFormErrors({ ...formErrors_copy })
        }
    }

    const onFinish = () => {
        const fieldValues = form.getFieldsValue();
        const new_taxon = {
            id: taxon ? taxon.id : undefined,
            name: fieldValues['name'],
            ncbi_id: fieldValues['ncbi_id']
        };
        if (isAdding) {
            dispatch(
                add({ ...new_taxon })
            )
                .then(() => {
                    navigate('/taxons')
                })
                .then(() => { dispatch(list()) })
                .catch(err => setFormErrors({ ...err.data }))
        } else {
            dispatch(
                update(taxon.id, { ...new_taxon })
            )
                .then(() => {
                    navigate('/taxons')
                })
                .then(() => { dispatch(list()) })
                .catch(err => setFormErrors({ ...err.data }))
        }
    }
    const onCancel = useCallback(() => {
        navigate(-1)
    }, [navigate])

    return (
        <>
            <AppPageHeader
                title={(isAdding ? `Add Taxon` : `Edit Taxon ${taxon.ncbi_id}`)}
            />
            <PageContent>

                <Form
                    labelCol={{ span: 4 }}
                    wrapperCol={{ span: 14 }}
                    layout="horizontal"
                    onFinish={onFinish}
                    onValuesChange={onValuesChange}
                    form={form}
                    initialValues={taxon}>
                    <Item label={"ncbi_id"} {...itemValidation("ncbi_id")} rules={requiredRules}>
                        <Input disabled={!taxon?.editable} />
                    </Item>
                    <Item label={"name"} {...itemValidation("name")} rules={requiredRules}>
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