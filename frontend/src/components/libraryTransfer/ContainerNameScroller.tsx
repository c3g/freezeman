import { Input, Button, Typography } from "antd"
import React from "react"
const { Text } = Typography;

interface ContainerNameScrollerProps {
    changeContainer: (number: string, containerType: string) => void,
    name: string,
    changeContainerName?: (container_name) => void,
    containerType: string,
    disabled: boolean
}

const ContainerNameScroller = ({ name, changeContainer, changeContainerName, containerType, disabled}: ContainerNameScrollerProps) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around' }}>
            <Button disabled={disabled} onClick={() => changeContainer('-1', containerType)}>
                Previous
            </Button>
            {
                changeContainerName ?

                    <Input placeholder={"Destination Barcode"} value={name} style={{ width: '50%', textAlign: 'center' }} onChange={changeContainerName} />
                    :
                    <Text> {name}</Text>
            }
            <Button disabled={disabled} onClick={() => changeContainer('1', containerType)}>
                Next
            </Button >
        </div>
    )
}
export default ContainerNameScroller