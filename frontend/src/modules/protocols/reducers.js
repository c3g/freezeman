import {indexByID} from "../../utils/objects";

import PROTOCOLS from "./actions";

export const protocols = (
  state = {
      items: [],
      itemsByID: {},
      isFetching: false,
  },
  action
) => {
    switch (action.type) {
        case PROTOCOLS.LIST.REQUEST:
            return {
                ...state,
                isFetching: true,
            };
        case PROTOCOLS.LIST.RECEIVE:
            return {
                ...state,
                items: action.data,
                itemsByID: indexByID(action.data, "id"),
                isFetching: false,
            };
        case PROTOCOLS.LIST.ERROR:
            return {
                ...state,
                isFetching: false,
                error: action.error,
            };
        default:
            return state;
    }
};
