import React, { useState } from "react"
import AppPageHeader from "../AppPageHeader";
import PageContent from "../PageContent";
import { Form } from "antd";
import { ObjectWithReferenceGenome } from "../shared/DefinitionsTable/ReferenceGenomeTableColumns";
import { useNavigate } from "react-router-dom";
import { useAppDispatch } from "../../hooks";

export const AddReferenceGenomeRoute = () => {
    return <EditReferenceGenomes />
};

export const EditReferenceGenomeRoute = () => {
    return <EditReferenceGenomes />
}


const EditReferenceGenomes = ({ referenceGenome }: Partial<ObjectWithReferenceGenome>) => {
    const [form] = Form.useForm()
    const isAdding = referenceGenome === undefined
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const onFinish = () => {
        const newValues = form.getFieldsValue();
        const newReferenceGenome = {
            
        }
    }
    return (
        <>
            <AppPageHeader />
            <PageContent>
                <Form
                    onFinish={onFinish}
                    form={form}
                    initialValues={referenceGenome}>
                </Form>
            </PageContent>
        </>
    );


}
export default EditReferenceGenomes;