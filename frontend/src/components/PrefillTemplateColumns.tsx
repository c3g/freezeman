import React, { useCallback, useEffect, useState } from 'react'
import { Button, Checkbox, Form, Input, Modal, DatePicker, Typography, FormItemProps, Select, FormProps, SelectProps } from "antd"
import api, { withToken } from '../utils/api'
import { InstrumentType } from '../models/frontend_models'
import { useAppSelector } from '../hooks'
import { useDispatch } from 'react-redux'
import { selectAuthTokenAccess } from '../selectors'

type ColumnType = 'number' | 'date' | 'qc-instrument'

const { Text } = Typography
const { Item } = Form
interface PrefillButtonProps {
    canPrefill: boolean,
    handlePrefillTemplate: (data: { [column: string]: any }) => void,
    data: { [column: string]: ColumnType }
}


interface SelectInstrumentTypeProps extends SelectProps {
    type: string
}
function SelectInstrumentType({ type, ...props }: SelectInstrumentTypeProps) {
    const dispatch = useDispatch()

    const listInstrumentTypesCallback = useCallback(() => dispatch(api.instrumentTypes.list({ platform__name: type })), [dispatch, type])
    
    const [instrumentTypes, setInstrumentTypes] = useState<InstrumentType[]>([])

    const token = useAppSelector(selectAuthTokenAccess)

    useEffect(() => {
        listInstrumentTypesCallback().then((instrumentTypes: InstrumentType[]) => {
            setInstrumentTypes(instrumentTypes)
          })
    }, [listInstrumentTypesCallback, token, type])

    return <Select {...props} options={instrumentTypes.map((instrumentType) => ({ value: instrumentType.id, label: instrumentType.type }))} />
}

const PrefillButton = ({ canPrefill, handlePrefillTemplate, data }: PrefillButtonProps) => {
    const [isPrefillColumnsShown, setIsPrefillColumnsShown] = useState(true);
    const [checkedFields, setCheckedFields] = useState<{ [column: string]: boolean }>({});
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})

    const itemValidation = useCallback((key: string): FormItemProps => {
        if (formErrors && formErrors[key]) {
            return {
                help: formErrors[key],
                validateStatus: 'error',
                name: key
            }
        }
        return { name: key }
    }, [formErrors])
    const showPrefillColumns = useCallback(() => {
        setIsPrefillColumnsShown(true);
    }, [setIsPrefillColumnsShown]);

    const cancelPrefillTemplate = useCallback(() => {
        setIsPrefillColumnsShown(false);
    }, [setIsPrefillColumnsShown]);

    const [form] = Form.useForm()

    const checkFormErrors = useCallback((key: string) => {
        if (formErrors && formErrors[key]) {
            const formErrors_copy = { ...formErrors }
            delete formErrors_copy[key];
            setFormErrors({ ...formErrors_copy })
        }
    }, [formErrors])

    const onValuesChange: NonNullable<FormProps['onValuesChange']> = useCallback((changedValues: any) => {
        const key = Object.keys(changedValues)[0]
        checkFormErrors(key)
    }, [checkFormErrors])

    const returnPrefillData = useCallback(() => {
        const fieldValues = form.getFieldsValue();
        const prefillData: Record<string, string> = {}
        const errorData = {}
        let error = false
        Object.keys(fieldValues).forEach((column) => {
            if (checkedFields[column]) {
                console.debug(column, fieldValues[column])
                if (fieldValues[column] == undefined) {
                    errorData[column] = 'Missing Field'
                    error = true
                } else {
                    if (!column.toLocaleLowerCase().includes("date")) {
                        prefillData[column] = fieldValues[column]
                    } else {
                        prefillData[column] = new Date(fieldValues[column]).toISOString().split('T')[0]
                    }
                }
            }
        })
        if (error) {
            setFormErrors(errorData)
            return null
        }
        return prefillData
    }, [checkedFields, form])

    const onFinish: NonNullable<FormProps['onFinish']> = useCallback(() => {
        const prefillData = returnPrefillData()
        if (prefillData) {
            handlePrefillTemplate(prefillData)
            setIsPrefillColumnsShown(false)
        }
    }, [handlePrefillTemplate, returnPrefillData])

    useEffect(() => {
        const fields = {}
        Object.keys(data).forEach((column) => {
            fields[column] = true;
        })
        setCheckedFields(fields)
    }, [data])

    return (
        <>
            <Button type='primary' disabled={!canPrefill} onClick={showPrefillColumns} title='Download a prefilled template with the selected samples'>Prefill Template</Button>
            <Modal title={"Prefilled Columns"} visible={isPrefillColumnsShown} okText={"Prefill"} onOk={form.submit} onCancel={cancelPrefillTemplate}>

                <Form
                    form={form}
                    labelCol={{ span: 15 }}
                    wrapperCol={{ span: 7 }}
                    onValuesChange={onValuesChange}
                    onFinish={onFinish}
                    layout="horizontal"
                >

                    {
                        data &&
                        Object.keys(data).map((field) => {
                            return (
                                <span key={field} style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                }}>
                                    <Checkbox checked={checkedFields[field]}
                                        onClick={() => {
                                            const fields = { ...checkedFields }
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
                                            flex: 10,
                                        }}
                                    >

                                        {
                                            data[field] == 'date' ?
                                                <DatePicker disabled={!checkedFields[field]} />
                                                :
                                                data[field] == 'qc-instrument' ?
                                                    <SelectInstrumentType type={'Quality Control'}/>
                                                    :
                                                    <Input type={data[field]} disabled={!checkedFields[field]} style={{ textAlign: 'right' }} />
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