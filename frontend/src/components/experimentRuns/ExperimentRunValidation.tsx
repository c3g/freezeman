import { Button, Collapse, List, Popconfirm, Space, Typography, Layout } from 'antd'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../../hooks'
import { useCurrentUser } from '../../hooks/useCurrentUser'
import { flushExperimentRunLanes, initExperimentRunLanes, setExpandedLanes, setRunLaneValidationStatus, setRunLaneValidationTime } from '../../modules/experimentRunLanes/actions'
import { ExperimentRunLanes, LaneInfo, ValidationStatus } from '../../modules/experimentRunLanes/models'
import { selectExperimentRunLanesState, selectDatasetsByID } from '../../selectors'
import { addArchivedComment, get } from '../../modules/datasets/actions'
import LaneValidationStatus from './LaneValidationStatus'
import ReadsPerSampleGraph from './ReadsPerSampleGraph'
import DatasetArchivedCommentsBox from './DatasetArchivedCommentsBox'
import { Dataset, Readset } from '../../models/frontend_models'
import api from '../../utils/api'
import { FMSDerivedSample, FMSId, FMSReadset, FMSSampleIdentityMatch } from '../../models/fms_api_models'
import { IdentityWarningsButton, MixupAndContaminationWarnings, ContaminationWarningValues, ConcordanceWarningValues } from './IdentityWarningsButton'
import { shallowEqual } from 'react-redux'

const { Sider, Content } = Layout;
const { Title, Text } = Typography


interface ExperimentRunValidationProps {
    experimentRunId: FMSId
}

function createLaneKey(lane: LaneInfo) {
    return `LANE: ${lane.laneNumber}`
}

function ExperimentRunValidation({ experimentRunId }: ExperimentRunValidationProps) {
    const dispatch = useAppDispatch()

    const [initialized, setInitialized] = useState<boolean>(false)
    const experimentRunLanesState = useAppSelector(selectExperimentRunLanesState)
    const [runLanes, setRunLanes] = useState<ExperimentRunLanes>()

    // Staff are allowed to change the lane validation status whenever needed.
    const currentUser = useCurrentUser()
    const isStaff = currentUser?.is_staff ?? false

    // Setting a run validated is a bit slow, so disable the validation buttons while
    // a validation is in progress so users can't click the button and trigger another call to the backend.
    const [isValidationInProgress, setIsValidationInProgress] = useState<boolean>(false)

    useEffect(() => {
        if (!initialized) {
            dispatch(initExperimentRunLanes(experimentRunId))
            setInitialized(true)
        }
    }, [dispatch, experimentRunId, initialized])

    useEffect(() => {
        // Flush redux state when the component is unmounted
        return () => { dispatch(flushExperimentRunLanes(experimentRunId)) }
    }, [dispatch, experimentRunId])

    useEffect(() => {
        const experimentRunLanes = experimentRunLanesState.runs[experimentRunId]
        if (experimentRunLanes) {
            setRunLanes(experimentRunLanes)
        }

    }, [experimentRunId, experimentRunLanesState])

    const updateLane = useCallback((lane: LaneInfo) => {
        Promise.allSettled(lane.datasets.map((dataset) => dispatch(get(dataset.datasetID)))).finally(() => {
            dispatch(setRunLaneValidationTime(lane)).finally(() => {
                setIsValidationInProgress(false)
            })
        })
    }, [dispatch])

    const setPassed = useCallback((lane: LaneInfo) => {
        setIsValidationInProgress(true)
        dispatch(setRunLaneValidationStatus(lane, ValidationStatus.PASSED)).finally(() => updateLane(lane))
    }, [dispatch, updateLane])

    const setFailed = useCallback((lane: LaneInfo) => {
        setIsValidationInProgress(true)
        dispatch(setRunLaneValidationStatus(lane, ValidationStatus.FAILED)).finally(() => updateLane(lane))
    }, [dispatch, updateLane])

    const setAvailable = useCallback((lane: LaneInfo) => {
        setIsValidationInProgress(true)
        dispatch(setRunLaneValidationStatus(lane, ValidationStatus.AVAILABLE)).finally(() => updateLane(lane))
    }, [dispatch, updateLane])

    const setLaneExpansionState = useCallback((laneKeys: string | string[]) => {
        if (runLanes) {
            const keys = (typeof laneKeys === 'string') ? [laneKeys] : laneKeys
            const expandedLanes = runLanes.lanes.filter(lane => keys.includes(createLaneKey(lane)))
            dispatch(setExpandedLanes(runLanes.experimentRunId, expandedLanes.map(lane => lane.laneNumber)))
        }
    }, [dispatch, runLanes])

    const expandedLaneKeys: string[] = []
    const lanesUX = experimentRunLanesState.ux[experimentRunId]
    if (lanesUX && runLanes) {
        for (const laneNumber of lanesUX.expandedLanes) {
            const laneInfo = runLanes.lanes.find(lane => lane.laneNumber === laneNumber)
            if (laneInfo) {
                expandedLaneKeys.push(createLaneKey(laneInfo))
            }
        }
    }

    return (
        runLanes && runLanes.lanes.length > 0 ?
            <Collapse onChange={setLaneExpansionState} activeKey={expandedLaneKeys}>{
                runLanes.lanes.map(lane => {
                    return (
                        <Collapse.Panel
                            key={createLaneKey(lane)}
                            header={<Title level={5}>{`Lane ${lane.laneNumber}`}</Title>}
                            extra={<Space direction={'horizontal'}>
                                <LaneValidationStatus validationStatus={lane.validationStatus} isValidationInProgress={isValidationInProgress} />
                                {lane.validationTime ? ['-', `${new Date(lane.validationTime).toLocaleDateString("fr-CA")}`] : ''}
                            </Space>}
                        >
                            <LanePanel
                                lane={lane}
                                canReset={isStaff}
                                canValidate={isStaff || lane.validationStatus === ValidationStatus.AVAILABLE}
                                isValidationInProgress={isValidationInProgress}
                                setAvailable={setAvailable}
                                setPassed={setPassed}
                                setFailed={setFailed} />
                        </Collapse.Panel>
                    )
                })
            }</Collapse>
            :
            <Text italic style={{ paddingLeft: '1em' }}>No datasets for this experiment are available for this experiment yet.</Text>
    )
}

function FlexBar(props: { children: React.ReactNode }) {
    // Displays children in a horizontal flexbox, maximizing the space between the children.
    // Two children will appear at the left and right ends of the bar with whitespace in between.
    return <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1em' }}>{props.children}</div>
}

interface LanePanelProps {
    lane: LaneInfo
    canValidate: boolean
    canReset: boolean
    isValidationInProgress: boolean
    setPassed: (lane: LaneInfo) => void
    setFailed: (lane: LaneInfo) => void
    setAvailable: (lane: LaneInfo) => void
}

function LanePanel({ lane, canValidate, canReset, isValidationInProgress, setPassed, setFailed, setAvailable }: LanePanelProps) {
    const dispatch = useAppDispatch()

    const allDatasetsById = useAppSelector(selectDatasetsByID)
    const datasetsById = useMemo(() =>
    (
        lane.datasets.map((dataset) => {
            const datasetSelector = allDatasetsById[dataset.datasetID]
            return datasetSelector
        }).reduce((selectors, dataset) => {
            if (dataset) {
                selectors[dataset.id] = dataset;
            }
            return selectors;
        }, {} as typeof allDatasetsById)
    ),
        [lane.datasets, allDatasetsById]
    )
    const [datasets, setDatasets] = useState<Dataset[]>([])

    useEffect(() => {
        Promise.all(lane.datasets.map(async (dataset) => {
            const response = await dispatch(api.datasets.get(dataset.datasetID))
            return response.data
        }))
            .then((values) => {
                setDatasets(values as Dataset[])
            })
    }, [dispatch, lane.datasets, datasetsById])

    const [mixupAndContaminationWarnings, setMixupAndContaminationWarnings] = useState<MixupAndContaminationWarnings>()
    useEffect(() => {
        const fetchWarningsForLane = async () => {
            const laneDatasetsIds = lane.datasets.map((dataset) => dataset && dataset.datasetID.toString()).join(",")
            const warningsForLaneDatasetsWithIdentity = await dispatch(api.readsets.list({ dataset__id__in: laneDatasetsIds, derived_sample__biosample__sample_identity__conclusive: true })) // Only gets readsets that have a conclusive identity
                .then(async (readsets_response) => {
                    const readsets: FMSReadset[] = readsets_response.data.results
                    if (readsets.length == 0) // Make sure there is some readsets with identities
                        return

                    const readsetsIds = readsets.map((readset) => readset.id.toString()).join(",")
                    const fetchBiosampleIds = async (readsets: FMSReadset[]) => {
                        const biosampleIdByReadsetId: Record<Readset['id'], FMSDerivedSample['biosample']> = {}
                        await Promise.all(readsets.map(async (readset) =>
                            dispatch(api.derivedSamples.list({ readsets__id__in: readset.id.toString() }))
                                .then(response => { biosampleIdByReadsetId[readset.id] = response.data.results[0].biosample })
                        ))
                        return biosampleIdByReadsetId
                    }

                    const biosampleIdByReadsetId = await fetchBiosampleIds(readsets)
                    const warningsForAllMatches = await dispatch(api.sampleIdentityMatch.list({ readset__in: readsetsIds }))
                        .then((sampleIdentityMatches_response) => {
                            const matchesByReadset = sampleIdentityMatches_response.data.results.reduce((acc, current) => {
                                if (current.readset_id) {
                                    if (acc[current.readset_id]) {
                                        acc[current.readset_id].push(current)
                                    } else {
                                        acc[current.readset_id] = [current]
                                    }
                                }
                                return acc
                            }, {} as Record<Readset['id'], FMSSampleIdentityMatch[]>)

                            const warningsBrokenDownByType = new MixupAndContaminationWarnings()
                            for (const readset of readsets) {
                                let match_self = false
                                const matchesForReadset = matchesByReadset[readset.id]
                                if (matchesForReadset) {
                                    for (const match of matchesForReadset) {
                                        if (match.tested_biosample_id == match.matched_biosample_id) {
                                            match_self = true
                                        }
                                        else {
                                            const contaminationWarning = new ContaminationWarningValues(readset.id, match.tested_biosample_id, match.matched_biosample_id, match.matching_site_ratio, match.compared_sites)
                                            warningsBrokenDownByType.addContaminationWarning(contaminationWarning)
                                        }
                                    }
                                }
                                if (!match_self) {
                                    const concordanceWarnings = new ConcordanceWarningValues(readset.id, biosampleIdByReadsetId[readset.id])
                                    warningsBrokenDownByType.addConcordanceWarning(concordanceWarnings)
                                }
                            }
                            return warningsBrokenDownByType
                        })
                    return warningsForAllMatches
                })
            setMixupAndContaminationWarnings(warningsForLaneDatasetsWithIdentity)
        }

        if (!lane.datasets || lane.datasets.length == 0)
            return

        fetchWarningsForLane()
    }, [dispatch, lane.datasets])

    const handleAddComment = useCallback(
        (id, comment) => {
            return dispatch(addArchivedComment(id, comment))
        }, [dispatch])

    // Create a list of unique metrics url's from the lane's datasets. Normally all of the
    // datasets should have the same url.
    const urlSet: Set<string> = lane.datasets.reduce<Set<string>>((acc, dataset) => {
        if (dataset.metricsURL) {
            acc.add(dataset.metricsURL)
        }
        return acc
    }, new Set<string>())

    let title = 'Reads Per Sample'
    if (lane.readsPerSample) {
        title = `Reads Per Sample (${lane.readsPerSample.sampleReads.length})`
    }

    const layoutStyle = {
        borderRadius: 8,
        overflow: 'hidden',
        width: 'calc(100% - 8px)',
        maxWidth: 'calc(100% - 8px)',
        backgroundColor: '#fff',
    }

    const siderStyle = {
        backgroundColor: '#fff',
    }
    return (
        <>
            <FlexBar style={{ padding: '1em' }}>
                {urlSet.size > 0 ? (
                    // Display the list of metrics url's associated with the lane's datasets.
                    <List>
                        {[...urlSet].map((url, index) => {
                            return (
                                <List.Item key={`URL-${index}`}>
                                    <a style={{ fontSize: 'medium' }} href={url} rel="external noopener noreferrer" target="_blank">
                                        View Run Metrics
                                    </a>
                                </List.Item>
                            )
                        })}
                    </List>
                ) : (
                    <Text italic>(Run metrics unavailable)</Text>
                )}
                <IdentityWarningsButton warnings={mixupAndContaminationWarnings} />
                <Space>
                    {canValidate &&
                        <Text strong>Validate lane:</Text>
                    }
                    {canReset &&
                        <Popconfirm
                            title="Reset the lane's validation status?"
                            okText={'Yes'}
                            cancelText={'No'}
                            onConfirm={() => {
                                setAvailable(lane)
                            }}
                        >
                            <Button disabled={isValidationInProgress || lane.validationStatus === ValidationStatus.AVAILABLE}>Reset</Button>
                        </Popconfirm>

                    }

                    {canValidate &&
                        <Button disabled={isValidationInProgress || lane.validationStatus === ValidationStatus.PASSED} onClick={() => setPassed(lane)}>Passed</Button>
                    }

                    {canValidate &&
                        <Popconfirm
                            title="Set the lane's validation status to Failed?"
                            okText={'Yes'}
                            cancelText={'No'}
                            onConfirm={() => {
                                setFailed(lane)
                            }}
                            placement={'topRight'}
                        >
                            <Button disabled={isValidationInProgress || lane.validationStatus === ValidationStatus.FAILED}>Failed</Button>
                        </Popconfirm>
                    }
                </Space>
            </FlexBar>
            <Layout style={layoutStyle}>
                <Content style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <ReadsPerSampleGraph lane={lane} />
                    <Title level={5}>{title}</Title>
                </Content>
                <Sider width="30%" style={siderStyle}>
                    <DatasetArchivedCommentsBox datasets={datasets} handleAddComment={handleAddComment} />
                </Sider>
            </Layout>
        </>
    )
}

export default ExperimentRunValidation
