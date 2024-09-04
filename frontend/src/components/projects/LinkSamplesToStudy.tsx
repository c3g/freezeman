import React, { useEffect, useMemo, useState } from "react";
import { Form, Modal, Select, Typography } from "antd";
import api from "../../utils/api";
import { useAppDispatch, useAppSelector } from "../../hooks";
import { selectStudiesByID } from "../../selectors";
import { getAllItems, Study } from "../../models/frontend_models";
import { WorkflowStepOrder } from "../../models/fms_api_models";
import { notifyError, notifySuccess } from "../../modules/notification/actions";

const NOTIFICATION_ID = "samples-linked-to-study"

export interface LinkSamplesToStudyProps {
    open?: boolean
    selectAll: boolean,
    selectedItemIDs: number[]
    totalCount: number
    projectID: number
    handleOk?: () => void
    handleCancel?: () => void
    handleSuccess?: () => void
}

export default function LinkSamplesToStudy({ open, selectAll, selectedItemIDs, totalCount, projectID, handleOk, handleCancel, handleSuccess }: LinkSamplesToStudyProps) {
    const dispatch = useAppDispatch()
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
            dispatch(api.workflows.get(study.workflow_id)).then(response => {
                setStepsOrder(response.data.steps_order.filter((stepOrder) => stepOrder.order >= study.start && stepOrder.order <= study.end))
            }).catch(() => dispatch(notifyError({
                id: NOTIFICATION_ID,
                title: "Failed to get study",
                description: `Failed to get study ${study}`
            })))
        }
    }, [study, dispatch])

    const sampleCount = selectAll ? totalCount - selectedItemIDs.length : selectedItemIDs.length

    return (
        <Modal
            title={`Move ${sampleCount} Sample${sampleCount > 1 ? 's' : ''} to Study`}
            open={open}
            okButtonProps={{
                disabled: !(sampleCount > 0 && study && stepOrder)
            }}
            onOk={() => {
                if (selectedItemIDs.length > 0 && study && stepOrder) {
                    dispatch(api.projects.addSamplesToStudy(selectedItemIDs, selectAll, projectID, study.letter, stepOrder.order)).then(
                        () => {
                            dispatch(notifySuccess({
                                id: NOTIFICATION_ID,
                                title: "Samples linked to study",
                                description: `Successfully linked samples to study ${study.letter} at step "${stepOrder.step_name}"`
                            }))
                            if (handleSuccess) {
                                handleSuccess()
                            }
                        },
                        ({ data: { add_sample_to_study: errors } }: { data: { add_sample_to_study?: string[] } }) => {
                            let description = `Failed to link samples to study ${study.letter} at step "${stepOrder.step_name}": `
                            if (errors) {
                                description += `\n- ${errors.slice(0, Math.min(3, errors.length)).join("\n- ")}`
                                if (errors.length > 3) {
                                    description += `\n- and ${errors.length - 3} more`
                                }
                            } else {
                                description += "Unknown error"
                            }
                            dispatch(notifyError({
                                id: NOTIFICATION_ID,
                                title: "Failed to link samples to study",
                                description
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
                <Form.Item label={"Study: "}>
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
                </Form.Item>

                <Form.Item label={"Step: "}>
                    <Select
                        disabled={!study}
                        onChange={(value) => setStepOrder(stepsOrder.find(stepOrder => stepOrder.order === value))}
                    >
                        {stepsOrder.map(stepOrder =>
                            <Select.Option
                                key={stepOrder.order}
                                value={stepOrder.order}
                            >
                                {`${stepOrder.order} - ${stepOrder.step_name}`}
                            </Select.Option>)
                        }
                    </Select>
                </Form.Item>
            </Form>
        </Modal>
    )
}