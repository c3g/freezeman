import React, { ReactNode, useCallback, useEffect, useState } from 'react'
import { Button, Checkbox, Form, Input, Modal, DatePicker, Typography, FormItemProps, Select, FormProps, SelectProps } from "antd"
import api, { withToken } from '../utils/api'
import { InstrumentType } from '../models/frontend_models'
import { useAppSelector } from '../hooks'
import { selectAuthTokenAccess } from '../selectors'
import store from '../store'

type ColumnType = 'number' | 'date' | 'qc-instrument' | string[]

interface ColumnTypeHandlers {
    input: (type: 'number') => ReactNode
    date: () => ReactNode
    qcInstrument: () => ReactNode
    select: (options: string[]) => ReactNode
}

function handleColumnType(columnType: ColumnType, { input, date, qcInstrument, select }: ColumnTypeHandlers): ReactNode {
    if (columnType === 'number') {
        return input(columnType)
    }
    if (columnType === 'date') {
        return date()
    }
    if (columnType === 'qc-instrument') {
        return qcInstrument()
    }
    if (Array.isArray(columnType)) {
        return select(columnType)
    }
    return <></>
}

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
    const listInstrumentTypesCallback = useCallback(() => store.dispatch(api.instrumentTypes.list({ platform__name: type })), [type])
    
    const [instrumentTypes, setInstrumentTypes] = useState<InstrumentType[]>([])

    const token = useAppSelector(selectAuthTokenAccess)

    useEffect(() => {
        listInstrumentTypesCallback().then((response) => {
            setInstrumentTypes(response.data.results)
        })
    }, [listInstrumentTypesCallback, token, type])

    return <Select {...props} options={instrumentTypes.map((instrumentType) => ({ value: instrumentType.type, label: instrumentType.type }))} />
}

const PrefillButton = ({ canPrefill, handlePrefillTemplate, data }: PrefillButtonProps) => {
    const [isPrefillColumnsShown, setIsPrefillColumnsShown] = useState(false);
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

    const ColumnTypeHandlersCallback: (field: string) => ColumnTypeHandlers = useCallback((field: string) => ({
        input: (type) => <Input type={type} disabled={!checkedFields[field]} style={{ textAlign: 'right' }} />,
        date: () => <DatePicker disabled={!checkedFields[field]} />,
        qcInstrument: () => <SelectInstrumentType type={'Quality Control'} disabled={!checkedFields[field]} style={{ textAlign: 'left' }} />,
        select: (options) => <Select options={options.map((o) =>  ({ label: o, value: o }))} disabled={!checkedFields[field]} style={{ textAlign: 'left' }}/>
    }), [checkedFields])

    return (
        <>
            <Button type='primary' disabled={!canPrefill} onClick={Object.keys(data).length === 0 ? () => handlePrefillTemplate({}) : showPrefillColumns} title='Download a prefilled template with the selected samples'>Prefill Template</Button>
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
                                            handleColumnType(
                                                data[field],
                                                ColumnTypeHandlersCallback(field)
                                            )
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