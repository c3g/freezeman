import React from "react"
import PageContainer from "../PageContainer";
import ActionContent from "../ActionContent";
import { IndexCuration } from "./IndexCuration";
import {Navigate, Route, Routes} from "react-router-dom";


export function IndexCurationPage() {
  return (<>
        <PageContainer>
          <Routes>
            <Route path="/actions/:action/*" element={<ActionContent templateType="pooledSample" />}/>
            <Route path="*" element={<IndexCuration />}/>
          </Routes>
        </PageContainer>
  </>)
}