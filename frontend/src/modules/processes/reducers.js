import PROCESSES from "./actions";
import {indexByID} from "../../utils/objects";

export const processes = (
    state = {
        items: [],
        itemsByID: {},
        isFetching: false,
    },
    action
  ) => {
      switch (action.type) {
          case PROCESSES.LIST.REQUEST:
              return {
                  ...state,
                  isFetching: true,
              };
          case PROCESSES.LIST.RECEIVE:
              return {
                  ...state,
                  items: action.data,
                  itemsByID: indexByID(action.data, "id"),
                  isFetching: false,
              };
          case PROCESSES.LIST.ERROR:
              return {
                  ...state,
                  isFetching: false,
                  error: action.error,
              };
          default:
              return state;
      }
  };