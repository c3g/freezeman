import React from "react";
import {render} from "react-dom";

import {persistStore} from "redux-persist";
import {PersistGate} from "redux-persist/integration/react";

import {Provider} from "react-redux";

import {BrowserRouter} from "react-router-dom";

import configureStore from "./store";
import App from "./components/App";

import "./styles/antd-adjustments.css";


// noinspection JSUnresolvedVariable
const store = configureStore({});
const persistor = persistStore(store);

const renderApp = () =>
    render(
        <Provider store={store}>
            <PersistGate loading={null} persistor={persistor}>
                <BrowserRouter>
                    <App />
                </BrowserRouter>
            </PersistGate>
        </Provider>,
        document.getElementById("root")
    );

document.addEventListener("DOMContentLoaded", renderApp);
