import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { Instrument } from "../../models/frontend_models";
import { selectAppInitialized, selectAuthState, selectInstrumentsByID, selectUsersByID } from "../../selectors";
import React, { useCallback, useState } from "react";
import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import { Button, Form, FormItemProps, Input, Space } from "antd";
import { requiredRules } from "../../constants";
import InstrumentsTableActions from "../../modules/instrumentsTable/actions";
import { addInstrument, listInstruments, updateInstrument } from "../../modules/experimentRuns/actions";

interface EditInstrumentProps {
    instrument?: Instrument
}

export const AddInstrumentRoute = () => {
    const appInitialized = useAppSelector(selectAppInitialized)
    return appInitialized ? <EditInstrument /> : null

}
export const EditInstrumentRoute = () => {
    const instruments = useAppSelector(selectInstrumentsByID)
    const { id } = useParams();

    const appInitialized = useAppSelector(selectAppInitialized)
    const authState = useAppSelector(selectAuthState)
    const usersByID = useAppSelector(selectUsersByID)

    const hasWritePermission = ((authState.currentUserID && usersByID[authState.currentUserID]) ? usersByID[authState.currentUserID].is_superuser : false);

    if (appInitialized) {
        return (id && instruments && instruments[id] && hasWritePermission) ?
            <EditInstrument instrument={{ ...instruments[id] }} /> : <Navigate to={"/instruments/list"} />
    } else {
        return null
    }
}

const EditInstrument = ({ instrument }: EditInstrumentProps) => {
    const [formErrors, setFormErrors] = useState({})
    const [form] = Form.useForm()
    const { Item } = Form
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const isAdding = instrument === undefined
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
        const new_instrument = {
            id: instrument ? instrument.id : undefined,
            name: fieldValues['name'],
            type: fieldValues['type'],
            serial_id: fieldValues['serial_id']
        };
        
        if (isAdding) {
            dispatch(
                addInstrument({ ...new_instrument })
            )
                .then(() => {
                    navigate('/instruments')
                })
                .then(() => { dispatch(listInstruments()) })
                .then(() => { dispatch(InstrumentsTableActions.setStale(true)) })
                .catch(err => setFormErrors({ ...err.data }))
        } else {
            dispatch(
                updateInstrument(new_instrument)
            )
                .then(() => {
                    navigate('/instruments')
                })
                .then(() => { dispatch(listInstruments()) })
                .then(() => { dispatch(InstrumentsTableActions.setStale(true)) })
                .catch(err => setFormErrors({ ...err.data }))
        }
    }

    const onCancel = useCallback(() => {
        navigate(-1)
    }, [navigate])

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
    
    return (
        <>
            <AppPageHeader
                title={(isAdding ? `Add Instrument` : `Edit Instrument ${instrument?.id}`)}
            />
            <PageContent>

                <Form
                    labelCol={{ span: 4 }}
                    wrapperCol={{ span: 14 }}
                    layout="horizontal"
                    onFinish={onFinish}
                    onValuesChange={onValuesChange}
                    form={form}
                    initialValues={instrument}>
                    <Item label={"Name"} {...itemValidation("name")} rules={requiredRules}>
                        <Input />
                    </Item>
                    <Item label={"Serial ID"} {...itemValidation("serial_id")} rules={requiredRules}>
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
    )
}

export default EditInstrument

