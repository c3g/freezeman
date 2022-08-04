import {applyMiddleware, createStore, compose} from "redux";
import thunkMiddleware from "redux-thunk";
import {createLogger} from "redux-logger";

import rootReducer from "./reducers";

export default function configureStore(initialState) {

  // Log redux actions as 'info' so that they can be filtered out of the console
  // output when we are not interested in the actions. The default is to log them
  // at the 'log' level which fills the console with noise that cannot be filtered.
  // Here, we are using the createLogger function to create the logger with options,
  // instead of importing the default redux logger.
  // To view redux logging, enable 'info' level messages in the browser's console.
  const logger = createLogger({
    level: 'info'
  })

  const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
  const store = createStore(
    rootReducer,
    initialState,
    composeEnhancers(applyMiddleware(thunkMiddleware, logger)),
  );

  if (module.hot) {
    // Enable Webpack hot module replacement for reducers
    // noinspection JSValidateTypes
    module.hot.accept([
      './reducers.js',
    ], () => {
      const nextRootReducer = require('./reducers');
      store.replaceReducer(nextRootReducer);
    });
  }

  return store;
}

