import { Input, Button } from "antd"
import React from "react"

const ContainerNameScroller = () => {
    return (
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-around' }}>
            <Button>
                Previous
            </Button>
            <Input style={{ width: '50%' }} />
            <Button>
                Next
            </Button >
        </div>
    )
}
export default ContainerNameScroller