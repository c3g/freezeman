import React, { ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Checkbox, Form, Input, Modal, DatePicker, Typography, FormItemProps, Select, FormProps, SelectProps } from "antd"
import api from '../utils/api'
import { InstrumentType } from '../models/frontend_models'
import store from '../store'
import moment from 'moment'
import { useAppDispatch } from '../hooks'
import { FMSInstrumentType } from '../models/fms_api_models'

type ColumnType = 'number' | 'text' | 'date' | 'qc-instrument' | string[]

interface ColumnTypeHandlers {
    input: (type: 'number' | 'text') => ReactNode
    date: () => ReactNode
    qcInstrument: () => ReactNode
    select: (options: string[]) => ReactNode
}

function handleColumnType(columnType: ColumnType, { input, date, qcInstrument, select }: ColumnTypeHandlers): ReactNode {
    if (columnType === 'number' || columnType === 'text') {
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

const { Item } = Form

interface PrefillButtonProps {
    canPrefill: boolean,
    handlePrefillTemplate: (data: { [column: string]: any }) => Promise<void>,
    data: { [column: string]: ColumnType },
    onPrefillOpen: () => void,
}


interface SelectInstrumentTypeProps extends SelectProps {
    type: string
}
function SelectInstrumentType({ type, ...props }: SelectInstrumentTypeProps) {
    const listInstrumentTypesCallback = useCallback(() => store.dispatch(api.instrumentTypes.list({ platform__name: type })), [type])

    const [instrumentTypes, setInstrumentTypes] = useState<InstrumentType[]>([])

    useEffect(() => {
        listInstrumentTypesCallback().then((response) => {
            let results = response.data.results.filter((instrument: FMSInstrumentType) => instrument.is_in_prefiller)
            setInstrumentTypes(results)
        })
    }, [listInstrumentTypesCallback, type])

    return <Select {...props} options={instrumentTypes.map((instrumentType) => ({ value: instrumentType.type, label: instrumentType.type }))} />
}


const PrefillButton = ({ canPrefill, handlePrefillTemplate, data, onPrefillOpen }: PrefillButtonProps) => {
    const dispatch = useAppDispatch()
    const [isPrefillColumnsShown, setIsPrefillColumnsShown] = useState(false);
    const [checkedFields, setCheckedFields] = useState<{ [column: string]: boolean }>({});
    const [formErrors, setFormErrors] = useState<Record<string, string>>({})
    const maxLabelWidth = useMemo(() => Math.max(...Object.keys(data).map((name) => name.length), 10), [data])
    const [isPrefilling, setIsPrefilling] = useState(false)

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
                if (fieldValues[column] == undefined) {
                    errorData[column] = 'Missing Field'
                    error = true
                } else {
                    if (!column.toLocaleLowerCase().includes("date")) {
                        prefillData[column] = fieldValues[column]
                    } else {
                        prefillData[column] = moment(fieldValues[column]).format("YYYY-MM-DD")
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

    const onFinish: NonNullable<FormProps['onFinish']> = useCallback(async () => {
        const prefillData = returnPrefillData()
        if (prefillData) {
            setIsPrefillColumnsShown(false)
            try {
                setIsPrefilling(true)
                await handlePrefillTemplate(prefillData)
            } finally {
                setIsPrefilling(false)
            }
        }
    }, [handlePrefillTemplate, returnPrefillData])

    useEffect(() => {
        const fields = {}
        Object.keys(data).forEach((column) => {
            fields[column] = false;
        })
        setCheckedFields(fields)
    }, [data])

    const ColumnTypeHandlersCallback = useCallback((field: string) => ({
        input: (type) => <Input type={type} disabled={!checkedFields[field]} />,
        date: () => <DatePicker disabled={!checkedFields[field]} />,
        qcInstrument: () => <SelectInstrumentType type={'Quality Control'} disabled={!checkedFields[field]} />,
        select: (options) => <Select options={options.map((o) =>  ({ label: o, value: o }))} disabled={!checkedFields[field]} />
    } as ColumnTypeHandlers), [checkedFields])

    const onButtonClick = useCallback(async ()=>{
        dispatch(onPrefillOpen)
        if(Object.keys(data).length === 0){
            handlePrefillTemplate({})
        }else{
            showPrefillColumns()
        }
    }, [data, dispatch, handlePrefillTemplate, onPrefillOpen, showPrefillColumns])

    return (
        <>
            <Button type='primary' disabled={!canPrefill || isPrefilling} onClick={onButtonClick} title='Download a prefilled template with the selected samples'>{isPrefilling ? "Prefilling..." : "Prefill Template"}</Button>
            <Modal title={"Optional Column Prefilling"} open={isPrefillColumnsShown} okText={"Prefill"} onOk={form.submit} onCancel={cancelPrefillTemplate} width={'30vw'}>
                <Typography.Paragraph>
                    Select the columns you would like to prefill with a value for all samples.
                </Typography.Paragraph>
                <Form
                    form={form}
                    onValuesChange={onValuesChange}
                    onFinish={onFinish}
                    layout="horizontal"
                >

                    {
                        data &&
                        Object.keys(data).map((field) => {
                            return (
                                    <Item
                                        key={field}
                                        label={<>
                                            <Checkbox
                                                checked={checkedFields[field]}
                                                onClick={() => {
                                                    const fields = { ...checkedFields }
                                                    fields[field] = !checkedFields[field]
                                                    setCheckedFields(fields)
                                                    checkFormErrors(field)
                                                }}
                                            />
                                            <Typography.Text style={{ marginLeft: '1rem', width: `${maxLabelWidth*0.6}em`, textAlign: 'left' }}>{field}</Typography.Text>
                                        </>}
                                        colon={false}
                                        {...itemValidation(field)}
                                    >
                                        {
                                            handleColumnType(
                                                data[field],
                                                ColumnTypeHandlersCallback(field)
                                            )
                                        }
                                    </Item>
                            )
                        })
                    }
                </Form>

            </Modal>
        </>
    )
}

export default PrefillButton