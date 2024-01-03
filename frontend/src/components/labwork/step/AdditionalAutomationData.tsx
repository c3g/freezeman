import React, { useCallback, useMemo, useState } from 'react'
import { Button, Form, Input, Modal, Typography, FormItemProps,  FormProps } from "antd"
import { SyncOutlined } from '@ant-design/icons'
import { useAppDispatch, useAppSelector } from '../../../hooks'
import { FMSId, FMSStep } from '../../../models/fms_api_models'
import { selectSamplesByID, selectContainersByID } from '../../../selectors'

const STEP_AXIOM_CREATE_FOLDERS = "Axiom Create Folders"

interface ExecuteAutomationButtonProps {
  canExecute: boolean
  waitResponse: boolean
  handleExecuteAutomation: (additionalData: { [field: string]: string }) => void
  step: FMSStep
  data: FMSId[]
}

const ExecuteAutomationButton = ({canExecute, waitResponse, handleExecuteAutomation, step, data}: ExecuteAutomationButtonProps) => {
  const dispatch = useAppDispatch()
  const samplesByID = useAppSelector(selectSamplesByID)
  const containersByID = useAppSelector(selectContainersByID)
  const [openAdditionalDataForm, setOpenAdditionalDataForm] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const FormatData = (ids: FMSId[]) => {
    let formatedData = {}
    switch(step.name){
      case STEP_AXIOM_CREATE_FOLDERS:
        ids.forEach((id) => {
          const sample = samplesByID[id]
          if (sample){
            const container = containersByID[sample.container]
            if (container){
              formatedData[container.name] = ""
            }
          }
        });
        break;
      default:
        break;
    }
    return formatedData
  }

  const formatedData = useMemo(() => FormatData(data), [data])
  const maxLabelWidth = useMemo(() => Math.max(...Object.keys(formatedData).map((name) => name.length), 10), [formatedData])

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

  const returnFormData = useCallback(() => {
    const fieldValues = form.getFieldsValue();
    const formData: Record<string, string> = {}
    const errorData = {}
    let error = false
    Object.keys(fieldValues).forEach((field) => {
      if (fieldValues[field] == undefined) {
          errorData[field] = 'Missing Field'
          error = true
      }
      else {
        formData[field] = fieldValues[field]    
      }
    })
    if (error) {
        setFormErrors(errorData)
        return null
    }
    return formData
  }, [form])

  const onFinish: NonNullable<FormProps['onFinish']> = useCallback(() => {
      const additionalData = returnFormData()
      if (additionalData) {
        handleExecuteAutomation(additionalData)
        setOpenAdditionalDataForm(false)
      }
  }, [handleExecuteAutomation, returnFormData])

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

  const ExtraDataForm = {
    [STEP_AXIOM_CREATE_FOLDERS]:
      <Modal title={"Additional Data"} open={openAdditionalDataForm} okText={"Execute"} onOk={form.submit} onCancel={() => setOpenAdditionalDataForm(false)} width={'30vw'}>
        <Typography.Paragraph>
            Provide for each source container the array barcode that will be used.
        </Typography.Paragraph>
        <Form
            form={form}
            onValuesChange={onValuesChange}
            onFinish={onFinish}
            layout="horizontal"
        >
          {
            Object.keys(formatedData).sort().map((field) => {
              return (
                <Form.Item
                    key={field}
                    label={<Typography.Text style={{ marginLeft: '1rem', width: `${maxLabelWidth*0.6}em`, textAlign: 'left' }}>{field}</Typography.Text>}
                    colon={false}
                    {...itemValidation(field)}
                >
                  <Input type="text"/>
                </Form.Item>
              )
            })
          }
        </Form>
      </Modal>
  }

  const onButtonClick = useCallback(async ()=>{
    if(!!!ExtraDataForm[step.name]){
      handleExecuteAutomation({})
    }
    else
    {
      setOpenAdditionalDataForm(true)
    }
  }, [step, formatedData])

  return (
    <>
      <Button type='primary' icon={<SyncOutlined spin={waitResponse}/>} disabled={!canExecute} onClick={onButtonClick} title='Execute the step automation with currently selected samples.'>Execute Automation</Button>
      {ExtraDataForm[step.name]}
    </>
  )
}

export default ExecuteAutomationButton