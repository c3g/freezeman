import React from "react"
import PageContainer from "../../PageContainer";
import ActionContent from "../../ActionContent";
import SampleRename from "./index";
import {Navigate, Route, Routes} from "react-router-dom";

export function SampleRenamePage() {
  return (<>
        <PageContainer>
          <Routes>
            <Route index element={<SampleRename />} />
            <Route path="/actions/:action/*" element={<ActionContent templateType="pooledSample" />}/>
            <Route path="*" element={<Navigate to={"/management/sample-rename"} />}/>
          </Routes>
        </PageContainer>
  </>)
}
export default SampleRenamePage
