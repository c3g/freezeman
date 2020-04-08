import React from "react";

import {Redirect, Route, Switch} from "react-router-dom";

import ExtractionsProcessContent from "./ExtractionsProcessContent";
import SamplesAddContent from "./SamplesAddContent";
import SamplesListContent from "./SamplesListContent";
import SamplesUpdateContent from "./SamplesUpdateContent";

const SamplesExtractionsPage = () => (
    <div style={{height: "100%", backgroundColor: "white", overflowY: "auto"}}>
        <Switch>
            <Route path="/samples/add"><SamplesAddContent /></Route>
            <Route path="/samples/update"><SamplesUpdateContent /></Route>
            <Route path="/samples/extract"><ExtractionsProcessContent /></Route>
            <Route path="/samples/list"><SamplesListContent /></Route>
            <Redirect to="/samples/list" />
        </Switch>
    </div>
);
export default SamplesExtractionsPage;
