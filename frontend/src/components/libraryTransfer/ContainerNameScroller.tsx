import { Input, Button } from "antd"
import React from "react"

const ContainerNameScroller = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around' }}>
            <Button style={{ border: 'solid grey 1px' }}>
                Previous
            </Button>
            <Input style={{ width: '50%' }} />
            <Button style={{ border: 'solid grey 1px' }}>
                Next
            </Button >
        </div>
    )
}
export default ContainerNameScroller