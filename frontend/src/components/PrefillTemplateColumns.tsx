import React, { useCallback, useEffect, useState } from 'react'
import { Button, Checkbox, Form, Input, Modal } from "antd"

interface PrefillButtonProps {
    canPrefill: boolean,
    handlePrefillTemplate: () => void,
    data: any[]
}

const PrefillButton = ({ canPrefill, handlePrefillTemplate, data }: PrefillButtonProps) => {

    const [isPrefillColumnsShown, setIsPrefillColumnsShown] = useState(true);

    const showPrefillColumns = useCallback(() => {
        setIsPrefillColumnsShown(true);
    }, [setIsPrefillColumnsShown]);

    const cancelPrefillTemplate = useCallback(() => {
        setIsPrefillColumnsShown(false);
    }, [setIsPrefillColumnsShown]);

    const [form] = Form.useForm()

    const onFinish = () => { }
    const onValuesChange = () => { }
    useEffect(() => {

    }, [])

    return (
        <>
            <Button type='primary' disabled={!canPrefill} onClick={showPrefillColumns} title='Download a prefilled template with the selected samples'>Prefill Template</Button>
            <Modal title={"Prefilled Columns"} visible={isPrefillColumnsShown} onOk={handlePrefillTemplate} onCancel={cancelPrefillTemplate}>

                <Form
                    layout="horizontal"
                    onFinish={onFinish}
                    onValuesChange={onValuesChange}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: '0.2fr 1fr 1fr',
                        rowGap: '15%'
                    }}>
                    {
                        data &&
                        Object.keys(data).map((field: any) => {
                            return (
                                <>
                                    <Checkbox />
                                    <span>{field}</span>
                                    <Input style={{ textAlign: 'right' }} type={data[field]}/>
                                </>
                            )
                        })
                    }
                </Form>

            </Modal>
        </>
    )
}

export default PrefillButton