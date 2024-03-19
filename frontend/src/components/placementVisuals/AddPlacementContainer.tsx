import React, { useCallback, useState } from "react"
import { Button, Select, Tabs, notification, Row } from "antd"
import { useAppDispatch, useAppSelector } from "../../hooks"
import { selectCoordinatesByID, selectContainerKindsByID } from "../../selectors"
import { PLACED_STRING } from "./PlacementTab"
import Modal from "antd/lib/modal/Modal"
import SearchContainer from "../SearchContainer"
import Input from "antd/lib/input/Input"
import api from "../../utils/api"
import { ContainerSample } from "./models"
import { FMSContainer, FMSSample } from "../../models/fms_api_models"

interface NewContainer {
  container_barcode?: string
  container_name?: string
  container_kind?: string
}

interface LoadedContainer {
  container_barcode: string
  container_name: string
  container_kind: string
  samples: Record<FMSSample['id'], { id: FMSSample['id'], coordinates?: string, type: string, name: FMSSample['name'], sourceContainer: string }>
}

export type DestinationContainer = NewContainer | LoadedContainer

interface AddPlacementContainerProps {
    onConfirm: (destinationContainer: DestinationContainer) => void
    destinationContainerList: ContainerSample[]
    setDestinationIndex: (number: number) => void
}

//component used to handle the creation of a new destination container
const AddPlacementContainer = ({ onConfirm, destinationContainerList, setDestinationIndex }: AddPlacementContainerProps) => {
    const [isPopup, setIsPopup] = useState<boolean>(false)

    //used to hold loaded container data
    const [loadedContainer, setLoadedContainer] = useState<any>({})
    const [selectedTab, setSelectedTab] = useState<string>('new')
    const [error, setError] = useState<string | undefined>(undefined)
    const [newContainer, setNewContainer] = useState<NewContainer>({})

    const coordinates = useAppSelector(selectCoordinatesByID)
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
    const handleContainerLoad = useCallback(async (loadedContainer) => {
        const container: FMSContainer = (await dispatch(api.containers.get(loadedContainer))).data
        const containerName = container.name
        const containerBarcode = container.barcode
        const newDestination = {}
        if (container.samples.length > 0) {
            const loadedSamples: FMSSample[] = (await dispatch(api.samples.list({ id__in: container.samples.join(','), limit: 100000}))).data.results

            loadedSamples.forEach((sample: FMSSample) => {
                newDestination[sample.id] = { id: sample.id, coordinates: (sample.coordinate && coordinates[sample.coordinate].name), type: PLACED_STRING, name: sample.name, sourceContainer: containerName }
            })
        }
        setLoadedContainer({ container_barcode: containerBarcode, container_name: containerName, container_kind: container.kind, samples: { ...newDestination }, })
    }, [coordinates])

    const containerAlreadyExists = async (container, destinationContainerList: ContainerSample[]) => {
      /* Centralized error notifications */
      const barcodeExistsError = () => {
        setError("Existing container barcode.")
        const EXISTING_BARCODE_NOTIFICATION_KEY = `LabworkStep.placement-existing-container-barcode`
        notification.error({
          message: `New container barcode already exists.`,
          key: EXISTING_BARCODE_NOTIFICATION_KEY,
          duration: 20
        })
      }
      const nameExistsError = () => {
        setError("Existing container name.")
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
      let barcode_exists: boolean = destinationContainerList.some(containerSample => containerSample.container_barcode == container.container_barcode)
      if (barcode_exists) {
        barcodeExistsError()
      }
      /* Check if the name is used in the destinationContainerList */
      let name_exists: boolean = destinationContainerList.some(containerSample => containerSample.container_name == container.container_name)
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
      const barcodeResult = await dispatch(api.containers.list({barcode: container.container_barcode}))
      barcode_exists = barcodeResult.data.count != 0
      if (barcode_exists) {
        barcodeExistsError()
      }
      /* Check if there is already a container in Freezeman with that name */
      const nameResult = await dispatch(api.containers.list({name: container.container_name}))
      name_exists = nameResult.data.count != 0
      if (name_exists) {
        nameExistsError()
      }
      exists = name_exists || barcode_exists
      return exists
    }

    //calls addDestination prop with 'New Destination' container
    const handleConfirm = useCallback(() => {
        const addContainer = (container) => {
          onConfirm(container)
          setIsPopup(false)
          setNewContainer({})
          setDestinationIndex(destinationContainerList.length)
        }
        const container = selectedTab == "load" ? loadedContainer : newContainer
        container.container_name = container.container_name ? container.container_name : container.container_barcode
        if (container.container_barcode && container.container_kind) {
          if (selectedTab == "load") {
            addContainer(container)
          }
          else {
            containerAlreadyExists(container, destinationContainerList).then(exists => {
              if (!exists) {
                addContainer(container)
              }
            })
          }
        } else {
            setError("Invalid container kind")
            const INVALID_KIND_NOTIFICATION_KEY = `LabworkStep.placement-invalid-container-kind`
            notification.error({
              message: `Invalid destination container kind.`,
              key: INVALID_KIND_NOTIFICATION_KEY,
              duration: 20
            })
        }
    }, [loadedContainer, selectedTab, newContainer, destinationContainerList])

    const handleOnChange = useCallback((e, name) => {
        const container = { ...newContainer }
        container[name] = e.target ? e.target.value : e
        setNewContainer(container)
    }, [newContainer])


    return (
        <>
            <Button onClick={() => setIsPopup(true)}>Add Destination</Button>
            <Modal title="Add Destination" open={isPopup} onOk={handleConfirm} onCancel={() => setIsPopup(false)} width={'40vw'}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Tabs defaultActiveKey={'New'} activeKey={selectedTab} onTabClick={(e) => setSelectedTab(e)}>
                        <Tabs.TabPane tab='New Container' key={'new'}>
                          <Row style={{padding: "10px"}}>
                            <Input value={newContainer.container_barcode} placeholder="Barcode" onChange={(e) => handleOnChange(e, 'container_barcode')}></Input>
                          </Row>
                          <Row style={{padding: "10px"}}>
                            <Input value={newContainer.container_name} placeholder="Name (optional)" onChange={(e) => handleOnChange(e, 'container_name')}></Input>
                          </Row>
                          <Row style={{padding: "10px"}}>
                            <Select value={newContainer.container_kind} clearIcon placeholder="Container kind" onChange={(e) => handleOnChange(e, 'container_kind')} style={{ width: "100%" }} options={getContainerKindOptions()}></Select>
                          </Row>
                        </Tabs.TabPane>
                        <Tabs.TabPane tab='Load Container' key={'load'}>
                            <SearchContainer exceptKinds={["tube"]} handleOnChange={(value) => handleContainerLoad(value)} />
                        </Tabs.TabPane>
                    </Tabs>

                </div>
            </Modal>
        </>
    )
}
export default AddPlacementContainer