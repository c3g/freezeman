import React, { useCallback, useEffect, useState } from 'react'
import { Button, Checkbox, Form, Input, Modal, DatePicker, Typography, FormItemProps } from "antd"

const { Text } = Typography
const { Item } = Form
interface PrefillButtonProps {
    canPrefill: boolean,
    handlePrefillTemplate: (data: { [column: string]: any }) => void,
    data: any[]
}

const PrefillButton = ({ canPrefill, handlePrefillTemplate, data }: PrefillButtonProps) => {

    const [isPrefillColumnsShown, setIsPrefillColumnsShown] = useState(true);
    const [checkedFields, setCheckedFields] = useState({});
    const [formErrors, setFormErrors] = useState({})

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
    const showPrefillColumns = useCallback(() => {
        setIsPrefillColumnsShown(true);
    }, [setIsPrefillColumnsShown]);

    const cancelPrefillTemplate = useCallback(() => {
        setIsPrefillColumnsShown(false);
    }, [setIsPrefillColumnsShown]);

    const [form] = Form.useForm()

    const checkFormErrors = (key: string) =>{
        if (formErrors && formErrors[key]) {
            const formErrors_copy = { ...formErrors }
            formErrors_copy[key] = undefined;
            setFormErrors({ ...formErrors_copy })
        }
    }

    const onValuesChange = (values) => {
        let key = Object.keys(values)[0]
        checkFormErrors(key)
    }

    const onFinish = () => {
        let prefillData = returnPrefillData()
        if (prefillData)
            handlePrefillTemplate(prefillData)

    }

    const returnPrefillData = () => {
        const fieldValues = form.getFieldsValue();
        const prefillData = {}
        const errorData = {}
        Object.keys(fieldValues).forEach((column) => {
            if (checkedFields[column]) {
                if (fieldValues[column] == undefined) {
                    errorData[column] = 'Missing Field'
                }
                prefillData[column] = fieldValues[column]
            }
        })
        if (errorData) {
            setFormErrors(errorData)
            return null
        }
        return prefillData
    }

    useEffect(() => {
        let fields = {}
        Object.keys(data).forEach((column) => {
            fields[column] = true;
        })
        setCheckedFields(fields)
    }, [data])

    return (
        <>
            <Button type='primary' disabled={!canPrefill} onClick={showPrefillColumns} title='Download a prefilled template with the selected samples'>Prefill Template</Button>
            <Modal title={"Prefilled Columns"} visible={isPrefillColumnsShown} onOk={form.submit} onCancel={cancelPrefillTemplate}>

                <Form
                    form={form}
                    labelCol={{ span: 10 }}
                    wrapperCol={{ span: 8 }}
                    onValuesChange={onValuesChange}
                    onFinish={onFinish}
                    layout="horizontal"
                >

                    {
                        data &&
                        Object.keys(data).map((field: any) => {
                            return (
                                <span key={field} style={{
                                    display: 'flex',
                                    flexDirection: 'row'
                                }}>
                                    <Checkbox checked={checkedFields[field]}
                                        onClick={() => {
                                            let fields = { ...checkedFields }
                                            fields[field] = !checkedFields[field]
                                            setCheckedFields(fields)
                                            checkFormErrors(field)
                                        }}
                                        style={{
                                            flex: 1
                                        }}
                                    />
                                    <Item label={field} {...itemValidation(field)}
                                        style={{
                                            marginBottom: 0,
                                            flex: 3
                                        }}>

                                        {
                                            data[field] == 'date' ?
                                                <DatePicker disabled={!checkedFields[field]} />
                                                :
                                                <Input disabled={!checkedFields[field]} style={{ textAlign: 'right' }} />
                                        }
                                    </Item>
                                </span>
                            )
                        })
                    }
                </Form>

            </Modal>
        </>
    )
}

export default PrefillButton