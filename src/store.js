import {applyMiddleware, createStore, compose} from "redux";
import thunkMiddleware from "redux-thunk";
import logger from 'redux-logger'

import rootReducer from "./reducers";

export default function configureStore(initialState) {
  const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
  const store = createStore(
    rootReducer,
    initialState,
    composeEnhancers(
      applyMiddleware(thunkMiddleware, logger)),
  );

  if (module.hot) {
    // Enable Webpack hot module replacement for reducers
    module.hot.accept([
      './reducers.js',
    ], () => {
      const nextRootReducer = require('./reducers');
      store.replaceReducer(nextRootReducer);
    });
  }

  return store;
}

