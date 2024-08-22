import React, { useEffect, useMemo, useState } from "react";
import { Form, Modal, Select } from "antd";
import store from "../../store";
import api from "../../utils/api";
import { useAppSelector } from "../../hooks";
import { selectStudiesByID } from "../../selectors";
import { getAllItems, Study } from "../../models/frontend_models";
import { WorkflowStepOrder } from "../../models/fms_api_models";
import { notifyError, notifySuccess } from "../../modules/notification/actions";

const NOTIFICATION_ID = "samples-linked-to-study"

export interface LinkSamplesToStudyProps {
    open?: boolean
    selectedItemIDs: number[]
    projectID: number
    handleOk?: () => void
    handleCancel?: () => void
}

export default function LinkSamplesToStudy({ open, selectedItemIDs, projectID, handleOk, handleCancel }: LinkSamplesToStudyProps) {
    const studiesByID = useAppSelector(selectStudiesByID)
    const studies = useMemo(() =>
        getAllItems(studiesByID)
            .filter(study => study.project_id === projectID)
            .sort((a, b) => {
                if (a.letter > b.letter) return 1
                else if (a.letter < b.letter) return -1
                else return 0
            })
        , [projectID, studiesByID])
    const [study, setStudy] = useState<Study>()

    const [stepsOrder, setStepsOrder] = useState<WorkflowStepOrder[]>([])
    const [stepOrder, setStepOrder] = useState<WorkflowStepOrder>()
    useEffect(() => {
        if (study) {
            store.dispatch(api.workflows.get(study.workflow_id)).then(response => {
                setStepsOrder(response.data.steps_order.filter((stepOrder) => stepOrder.order >= study.start && stepOrder.order <= study.end))
            }).catch(() => store.dispatch(notifyError({
                id: NOTIFICATION_ID,
                title: "Failed to get study",
                description: `Failed to get study ${study}`
            })))
        }
    }, [study])

    return (
        <Modal
            title={"Link Samples to Study"}
            open={open}
            okButtonProps={{
                disabled: !(selectedItemIDs.length > 0 && study && stepOrder)
            }}
            onOk={() => {
                if (selectedItemIDs.length > 0 && study && stepOrder) {
                    store.dispatch(api.projects.addSamplesToStudy(selectedItemIDs, projectID, study.letter, stepOrder.order)).then(
                        () => {
                            store.dispatch(notifySuccess({
                                id: NOTIFICATION_ID,
                                title: "Samples linked to study",
                                description: `Successfully linked samples to study ${study.letter} at step "${stepOrder.step_name}"`
                            }))
                        },
                        () => {
                            store.dispatch(notifyError({
                                id: NOTIFICATION_ID,
                                title: "Failed to link samples to study",
                                description: `Failed to link samples to study ${study.letter} at step "${stepOrder.step_name}"`
                            }))
                        })
                    if (handleOk) {
                        handleOk()
                    }
                }
            }}
            onCancel={() => {
                if (handleCancel) {
                    handleCancel()
                }
            }}
        >
            <Form>
                <Form.Item label={"Study Letter"}>
                    <Select
                        onChange={(value) => setStudy(studies.find(study => study.letter === value))}
                    >
                        {studies.map(study =>
                            <Select.Option
                                key={study.id}
                                value={study.letter}
                            >
                                {study.letter}
                            </Select.Option>)
                        }
                    </Select>
                    <Select
                        disabled={!study}
                        onChange={(value) => setStepOrder(stepsOrder.find(stepOrder => stepOrder.order === value))}
                    >
                        {stepsOrder.map(stepOrder =>
                            <Select.Option
                                key={stepOrder.order}
                                value={stepOrder.order}
                            >
                                {stepOrder.step_name}
                            </Select.Option>)
                        }
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    )
}