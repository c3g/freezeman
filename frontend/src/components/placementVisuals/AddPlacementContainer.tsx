import React, { ComponentProps, useCallback, useMemo, useState } from "react"
import { Button, Select, Tabs, notification, Row } from "antd"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { selectCoordinatesByID, selectContainerKindsByID } from "../../selectors"
import Modal from "antd/lib/modal/Modal"
import SearchContainer from "../SearchContainer"
import Input from "antd/lib/input/Input"
import api from "../../utils/api"
import { MAX_CONTAINER_BARCODE_LENGTH, MAX_CONTAINER_NAME_LENGTH, barcodeRules, nameRules } from "../../constants"
import { FMSContainer, FMSId, FMSSample } from "../../models/fms_api_models"
import store from "../../store"

export interface DestinationContainer {
    container_barcode: string
    container_name: string
    container_kind: string
    samples: { [key in FMSId]: { id: FMSId, coordinates: string, name: string } }
}

export interface AddPlacementContainerProps {
    onConfirm: (destinationContainer: DestinationContainer) => void
    existingContainers: DestinationContainer[]
}

//component used to handle the creation of a new destination container
const AddPlacementContainer = ({ onConfirm, existingContainers }: AddPlacementContainerProps) => {
    const [isPopup, setIsPopup] = useState<boolean>(false)

    //used to hold loaded container data
    const [loadedContainer, setLoadedContainer] = useState<Partial<DestinationContainer>>({})
    const [selectedTab, setSelectedTab] = useState<string>('new')
    
    // make at least empty samples required for newly created container
    const [newContainer, setNewContainer] = useState<Pick<DestinationContainer, 'samples'> & Partial<DestinationContainer>>({ samples: {} })

    const containerKinds = useAppSelector(selectContainerKindsByID)

    const getContainerKindOptions = useCallback(() => {
        if (containerKinds) {
            const options = Object.keys(containerKinds).filter(id => containerKinds[id].children_ids.length === 0 && id !== "tube").sort().map((containerKind) => {
                return {
                    label: containerKind,
                    value: containerKind
                }
            })
            return options
        }
        return []
    }, [containerKinds])

    const dispatch = useAppDispatch()
    //retrieves container on search
    const handleContainerLoad = useCallback(async (loadedContainer: FMSId) => {
        const container: FMSContainer = (await dispatch(api.containers.get(loadedContainer))).data
        const containerName = container.name
        const containerBarcode = container.barcode
        const newDestination: DestinationContainer['samples']  = {}
        if (container.samples.length > 0) {
            const loadedSamples: FMSSample[] = (await dispatch(api.samples.list({ id__in: container.samples.join(','), limit: 100000 }))).data.results

            const coordinates = selectCoordinatesByID(store.getState())

            loadedSamples.forEach(sample => {
                newDestination[sample.id] = {
                    id: sample.id,
                    coordinates: sample.coordinate ? coordinates[sample.coordinate]?.name ?? '...' : '-',
                    name: sample.name,
                }
            })
        }
        setLoadedContainer({ container_barcode: containerBarcode, container_name: containerName, container_kind: container.kind, samples: { ...newDestination }, })
    }, [dispatch])

    //calls addDestination prop with 'New Destination' container
    const handleConfirm = useCallback(() => {
        const containerAlreadyExists = async (container: DestinationContainer, destinationContainerList: DestinationContainer[]) => {
            /* Centralized error notifications */
            const barcodeExistsError = () => {
                const EXISTING_BARCODE_NOTIFICATION_KEY = `LabworkStep.placement-existing-container-barcode`
                notification.error({
                    message: `New container barcode already exists.`,
                    key: EXISTING_BARCODE_NOTIFICATION_KEY,
                    duration: 20
                })
            }
            const nameExistsError = () => {
                const EXISTING_NAME_NOTIFICATION_KEY = `LabworkStep.placement-existing-container-name`
                notification.error({
                    message: `New container name already exists.`,
                    key: EXISTING_NAME_NOTIFICATION_KEY,
                    duration: 20
                })
            }
    
            let exists = false
            /* Get locally created containers first */
            /* Check if the barcode is used in the destinationContainerList */
            let barcode_exists: boolean = destinationContainerList.some(containerSample => containerSample.container_barcode === container.container_barcode)
            if (barcode_exists) {
                barcodeExistsError()
            }
            /* Check if the name is used in the destinationContainerList */
            let name_exists: boolean = destinationContainerList.some(containerSample => containerSample.container_name === container.container_name)
            if (name_exists) {
                nameExistsError()
            }
            exists = name_exists || barcode_exists
            if (exists) {
                /* Fast return if already exists in frontend display */
                return exists
            }
    
            /* Get existing containers from freezeman */
            /* Check if there is already a container in Freezeman with that abrcode */
            const barcodeResult = await dispatch(api.containers.list({ barcode: container.container_barcode }))
            barcode_exists = barcodeResult.data.count != 0
            if (barcode_exists) {
                barcodeExistsError()
            }
            /* Check if there is already a container in Freezeman with that name */
            const nameResult = await dispatch(api.containers.list({ name: container.container_name }))
            name_exists = nameResult.data.count != 0
            if (name_exists) {
                nameExistsError()
            }
            exists = name_exists || barcode_exists
            return exists
        }    

        const addContainer = (container: DestinationContainer) => {
            onConfirm(container)
            setIsPopup(false)
            setNewContainer({ samples: {} })
        }
        const container = selectedTab == "load" ? loadedContainer : newContainer
        container.container_name = container.container_name ? container.container_name : container.container_barcode
        if (container.container_barcode && container.container_kind) {
            if (selectedTab == "load") {
                addContainer(container as DestinationContainer)
            }
            else {
                containerAlreadyExists(container as DestinationContainer, existingContainers).then(exists => {
                    if (!exists) {
                        const barCodeResults = barcodeRules.filter((rule) => !rule.pattern.test(container.container_barcode as string))
                        const nameResults = nameRules.filter((rule) => !rule.pattern.test(container.container_name as string))
                        if (barCodeResults.length > 0) {
                            const INVALID_BARCODE_NOTIFICATION_KEY = `LabworkStep.placement-invalid-container-barcode`
                            notification.error({
                                message: `Container Barcode -- ${barCodeResults.map((rule) => rule.message).join(" ")}`,
                                key: INVALID_BARCODE_NOTIFICATION_KEY,
                                duration: 20
                            })
                        } if (nameResults.length > 0) {
                            const INVALID_NAME_NOTIFICATION_KEY = `LabworkStep.placement-invalid-container-name`
                            notification.error({
                                message: `Container Name -- ${nameResults.map((rule) => rule.message).join(" ")}`,
                                key: INVALID_NAME_NOTIFICATION_KEY,
                                duration: 20
                            })
                        } else {
                            addContainer(container as DestinationContainer)
                        }
                    }
                })
            }
        } else {
            const INVALID_KIND_NOTIFICATION_KEY = `LabworkStep.placement-invalid-container-kind`
            notification.error({
                message: `Invalid destination container kind.`,
                key: INVALID_KIND_NOTIFICATION_KEY,
                duration: 20
            })
        }
    }, [selectedTab, loadedContainer, newContainer, dispatch, onConfirm, existingContainers])

    const handleOnChange = useCallback((e: any, name: keyof typeof newContainer) => {
        const container: typeof newContainer = { ...newContainer }
        container[name] = e.target ? e.target.value : e
        setNewContainer(container)
    }, [newContainer])

    const tabsItems = useMemo<NonNullable<ComponentProps<typeof Tabs>['items']>>(() => [
        {
            key: 'new',
            label: 'New Container',
            children: <>
                <Row style={{ padding: "10px" }}>
                    <Input value={newContainer.container_barcode} placeholder="Barcode" onChange={(e) => handleOnChange(e, 'container_barcode')} maxLength={MAX_CONTAINER_BARCODE_LENGTH}></Input>
                </Row>
                <Row style={{ padding: "10px" }}>
                    <Input value={newContainer.container_name} placeholder="Name (optional)" onChange={(e) => handleOnChange(e, 'container_name')} maxLength={MAX_CONTAINER_NAME_LENGTH}></Input>
                </Row>
                <Row style={{ padding: "10px" }}>
                    <Select value={newContainer.container_kind} allowClear={true} placeholder="Container kind" onChange={(e) => handleOnChange(e, 'container_kind')} style={{ width: "100%" }} options={getContainerKindOptions()}></Select>
                </Row>
            </>
        },
        {
            key: 'load',
            label: 'Load Container',
            children: <SearchContainer exceptKinds={["tube"]} handleOnChange={(value) => handleContainerLoad(value)} />
        }
    ], [getContainerKindOptions, handleContainerLoad, handleOnChange, newContainer.container_barcode, newContainer.container_kind, newContainer.container_name])

    return (
        <>
            <Button onClick={() => setIsPopup(true)}>Add Destination</Button>
            <Modal title="Add Destination" open={isPopup} onOk={handleConfirm} onCancel={() => setIsPopup(false)} width={'40vw'}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Tabs defaultActiveKey={'New'} activeKey={selectedTab} onTabClick={(e) => setSelectedTab(e)} items={tabsItems} />
                </div>
            </Modal>
        </>
    )
}
export default AddPlacementContainer