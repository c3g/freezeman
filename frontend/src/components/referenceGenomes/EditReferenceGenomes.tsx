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

type EditReferenceGenomeProps = Partial<ObjectWithReferenceGenome>

const EditReferenceGenomes = ({ referenceGenome }: EditReferenceGenomeProps) => {
    const [form, setForm] = useState();
    const isAdding = referenceGenome
    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const onFinish = () => {

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