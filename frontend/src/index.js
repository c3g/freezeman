import {hot} from 'react-hot-loader/root';
import React from "react";
import {render} from "react-dom";

import {persistStore} from "redux-persist";
import {PersistGate} from "redux-persist/integration/react";

import {Provider} from "react-redux";

import {BrowserRouter} from "react-router-dom";

import "./utils/platform";
import configureStore from "./store";
import { setStore } from "./utils/withItem.js";
import App from "./components/App";

import "./styles/global.css";
import "./styles/antd-adjustments.scss";

const Root = process.env.NODE_ENV === 'development' ? hot(App) : App;

const store = configureStore({});
const persistor = persistStore(store);
setStore(store);

const renderApp = () =>
  render(
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter>
          <Root />
        </BrowserRouter>
      </PersistGate>
    </Provider>,
    document.getElementById("root")
  );

renderApp();
