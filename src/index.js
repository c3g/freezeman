import React from "react";
import {render} from "react-dom";

import {persistStore} from "redux-persist";
import {PersistGate} from "redux-persist/integration/react";

import {applyMiddleware, createStore, compose} from "redux";
import thunkMiddleware from "redux-thunk";

import {Provider} from "react-redux";

import {BrowserRouter} from "react-router-dom";

import App from "./components/App";
import rootReducer from "./reducers";

// noinspection JSUnresolvedVariable
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
export const store = createStore(rootReducer, composeEnhancers(applyMiddleware(thunkMiddleware)));
const persistor = persistStore(store);

document.addEventListener("DOMContentLoaded", () => {
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
});
