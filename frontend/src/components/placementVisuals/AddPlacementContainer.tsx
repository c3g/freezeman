import { Button, Select, Switch, Typography } from "antd"
import Modal from "antd/lib/modal/Modal"
import React, { useCallback, useState } from "react"
import SearchContainer from "../SearchContainer"
import Input from "antd/lib/input/Input"
import { useAppDispatch, useAppSelector } from "../../hooks"
import api from "../../utils/api"
import { selectCoordinatesByID } from "../../selectors"
import { NONE_STRING } from "./PlacementTab"
import { copyKeyObject } from "./Placement"
const { Text } = Typography;
interface AddPlacementContainerProps {
    addDestination: (destinationContainer) => void
}
const EMPTY_CONTAINER = {
    barcode: '', samples: '', container_kind: ''
}
const AddPlacementContainer = ({ addDestination }: AddPlacementContainerProps) => {
    const [loadPopUp, setLoadPopUp] = useState<boolean>(false)
    const [newContainer, setNewContainer] = useState<any>({
        barcode: '', samples: '', container_kind: ''
    })
    const [loadedContainer, setLoadedContainer] = useState<any>({})
    const [formData, setFormData] = useState(EMPTY_CONTAINER)
    const [isLoad, setIsLoad] = useState<boolean>(false)
    const coordinates = useAppSelector(selectCoordinatesByID)

    const dispatch = useAppDispatch()
    const handleContainerLoad = useCallback(async (loadedContainer) => {
        const container = await dispatch(api.containers.get(loadedContainer))
        const loadedSamples = await dispatch(api.samples.list({ id__in: container.data.samples.join(',') }))
        const containerName = container.data.name

        const newDestination = {}
        loadedSamples.data.results.forEach(sample => {
            newDestination[sample.id] = { id: sample.id, coordinates: (coordinates[sample.coordinate].name), type: NONE_STRING, name: sample.name, sourceContainer: containerName }
        })
        setLoadedContainer({ container_name: containerName, samples: copyKeyObject(newDestination) })
    }, [coordinates])

    const handleConfirm = useCallback(() => {
        const container = isLoad ? loadedContainer : newContainer
        addDestination(container)
        setLoadPopUp(false)
    }, [newContainer, loadedContainer])

    const handleInputChange = useCallback((e, inputName) => {
        const tempContainer = newContainer
        const value = e.target ? e.target.value : e
        switch (inputName) {
            case 'barcode':
                tempContainer.container_name = value
                break
            case 'container_kind':
                tempContainer.container_kind = value
                break
            default:
                break;
        }
        setNewContainer({...tempContainer})
    }, [newContainer])
    return (
        <>
            <Button onClick={() => setLoadPopUp(true)}>Add Destination</Button>

            <Modal title="Add Destination" visible={loadPopUp} onOk={handleConfirm} onCancel={() => setLoadPopUp(false)}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div>
                        <Switch checkedChildren="Toggle New" unCheckedChildren="Toggle Load" checked={isLoad} onChange={() => setIsLoad(!isLoad)}></Switch>
                    </div>
                    {
                        !isLoad
                            ?
                            <>
                                <Text> New Container </Text>
                                <Input onChange={(e) => handleInputChange(e, 'barcode')} placeholder="Barcode"></Input>
                                <Select onChange={(e) => handleInputChange(e, 'container_kind')} placeholder="Container kind" style={{ width: "100%" }} options={[{ value: '96-well plate', label: '96-well plate' },]}></Select>
                            </>
                            :
                            <>
                                <Text> Load Container </Text>
                                <SearchContainer handleOnChange={(value) => handleContainerLoad(value)} />
                            </>
                    }
                </div>
            </Modal>
        </>
    )
}
export default AddPlacementContainer