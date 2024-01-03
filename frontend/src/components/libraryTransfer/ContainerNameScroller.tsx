import { Input, Button, Typography } from "antd"
import React from "react"
const { Text } = Typography;

interface ContainerNameScrollerProps {
    changeContainer: (number: string, name: string, containerType: string) => void,
    name: string,
    changeContainerName?: (containerName) => void,
    containerType: string,
    disabled: boolean
}

const ContainerNameScroller = ({ name, changeContainer, changeContainerName, containerType, disabled}: ContainerNameScrollerProps) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around' }}>
            <Button disabled={disabled} onClick={() => changeContainer('-1', name, containerType)}>
                Previous
            </Button>
            {
                changeContainerName ?

                    <Input value={name} style={{ width: '50%', textAlign: 'center' }} onChange={changeContainerName} />
                    :
                    <Text> {name}</Text>
            }
            <Button disabled={disabled} onClick={() => changeContainer('1', name, containerType)}>
                Next
            </Button >
        </div>
    )
}
export default ContainerNameScroller