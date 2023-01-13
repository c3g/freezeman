import React from "react";
import {createRoot} from "react-dom/client"

import {persistStore} from "redux-persist";
import {PersistGate} from "redux-persist/integration/react";

import {Provider} from "react-redux";

import {BrowserRouter} from "react-router-dom";

import "./utils/platform";
// import configureStore from "./store";
import { setStore } from "./utils/withItem.js";
import App from "./components/App";

import "./styles/global.css";
import "./styles/antd-adjustments.scss";

import store from './store'

// const store = configureStore({});
const persistor = persistStore(store);
setStore(store);

const container = document.getElementById("root")
const root = createRoot(container)
root.render(
  <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </PersistGate>
    </Provider>
)
