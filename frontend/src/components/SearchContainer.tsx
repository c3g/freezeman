import { Select } from "antd"
import React, { useCallback, useId, useState } from "react"

import * as Options from "../utils/options";
import api, { ABORT_ERROR_NAME, withToken } from "../utils/api";
import { selectAuthTokenAccess } from "../selectors";
import { useAppSelector } from "../hooks";

interface SearchContainerProps {
    exceptKinds: string[]
    handleOnChange: (value) => void
}

const SearchContainer = ({exceptKinds, handleOnChange}: SearchContainerProps) => {
    const token = useAppSelector(selectAuthTokenAccess)
    // A page can render more than one SearchContainer. A key per instance stops them from aborting each other's requests.
    const instanceId = useId()
    const requestID = `container-search-${instanceId}`
    // A string dependency, because a parent can pass a new exceptKinds array with the same kinds on each render.
    const exceptKindsParam = exceptKinds.join(",")

    const [containerOptions, setContainerOptions] = useState([]);
    const onFocusContainer = ev => { onSearchContainer(ev.target.value) }
    const onSearchContainer = useCallback((input, options?) => {
        withToken(token, api.containers.search)(input, { sample_holding: true, except_kinds: exceptKindsParam, ...options }, requestID).then(res => {
            setContainerOptions(res.data.results.map(Options.renderContainer));
        }).catch(error => {
            // A newer search aborted this one. Its results replace these.
            if (error.name === ABORT_ERROR_NAME) return
            throw error
        })
    }, [token, exceptKindsParam, requestID])

    return (
        <div style={{ width: "100%" }}>
            <Select
                onChange={handleOnChange}
                style={{width: "100%"}}
                showSearch
                allowClear
                filterOption={false}
                options={containerOptions}
                onSearch={onSearchContainer}
                onFocus={onFocusContainer}
            />
        </div>
    );
}

export default SearchContainer