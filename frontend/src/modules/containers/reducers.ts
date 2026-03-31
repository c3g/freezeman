import { merge, set } from "object-path-immutable"
import { indexByID } from "../../utils/objects"
import { prefillTemplatesReducerFactory } from "../../utils/prefillTemplates"
import { resetTable } from "../../utils/reducers"
import { templateActionsReducerFactory } from "../../utils/templateActions"
import { AnyAction } from "redux"
import { Container, ContainerKind, ItemsByID } from "../../models/frontend_models"
import CONTAINERS from "./actions"

export interface ContainerKindsState {
  items: ContainerKind[]
  itemsByID: Record<string, ContainerKind>
  isFetching: boolean
  error?: any
}

export const containerKinds = (
  state: ContainerKindsState = {
    items: [],
    itemsByID: {},
    isFetching: false,
  },
  action
): ContainerKindsState => {
  switch (action.type) {
    case CONTAINERS.LIST_KINDS.REQUEST:
      return {
        ...state,
        isFetching: true,
      };
    case CONTAINERS.LIST_KINDS.RECEIVE:
      return {
        ...state,
        items: action.data,
        itemsByID: indexByID(action.data, "id"),
        isFetching: false,
      };
    case CONTAINERS.LIST_KINDS.ERROR:
      return {
        ...state,
        isFetching: false,
        error: action.error,
      };
    default:
      return state;
  }
};

export const containerTemplateActions = templateActionsReducerFactory(CONTAINERS);
export const containerPrefillTemplates = prefillTemplatesReducerFactory(CONTAINERS);

export interface ContainersState {
  itemsByID: ItemsByID<Container>
  isFetching: boolean
  error?: any
}

const initialState: ContainersState = {
  itemsByID: {},
  isFetching: false
}

export const containers = (
  state: ContainersState = initialState,
  action: AnyAction
) => {
  switch (action.type) {
    case CONTAINERS.GET.REQUEST:
      return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
    case CONTAINERS.GET.RECEIVE:
      return merge(state, ['itemsByID', action.meta.id],
        { ...preprocess(action.data), isFetching: false });
    case CONTAINERS.GET.ERROR:
      return merge(state, ['itemsByID', action.meta.id],
        { error: action.error, isFetching: false, didFail: true });

    case CONTAINERS.ADD.REQUEST:
      return { ...state, error: undefined, isFetching: true };
    case CONTAINERS.ADD.RECEIVE:
      return merge(resetTable({ ...state, isFetching: false, }), ['itemsByID', action.data.id],
        { ...preprocess(action.data) });
    case CONTAINERS.ADD.ERROR:
      return { ...state, error: action.error, isFetching: false };

    case CONTAINERS.UPDATE.REQUEST:
      return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
    case CONTAINERS.UPDATE.RECEIVE:
      return merge(state, ['itemsByID', action.meta.id], { ...preprocess(action.data), isFetching: false, versions: undefined });
    case CONTAINERS.UPDATE.ERROR:
      return merge(state, ['itemsByID', action.meta.id],
        { error: action.error, isFetching: false });

    case CONTAINERS.LIST.REQUEST:
      return { ...state, isFetching: true };
    case CONTAINERS.LIST.RECEIVE: {
      const results = action.data.results.map(preprocess)
      const itemsByID = merge(state.itemsByID, [], indexByID(results, "id"));
      return { ...state, itemsByID, isFetching: false, error: undefined };
    }
    case CONTAINERS.LIST.ERROR:
      return { ...state, isFetching: false, error: action.error };

    case CONTAINERS.LIST_PARENTS.REQUEST:
      return merge(state, ['itemsByID', action.meta.id], { id: action.meta.id, isFetching: true });
    case CONTAINERS.LIST_PARENTS.RECEIVE: {
      const parents = action.data.map(preprocess);
      const parentsID = parents.map(p => p.id);
      const itemsByID = merge(state.itemsByID, [], indexByID(parents))
      return merge(state, ['itemsByID'],
        merge(itemsByID, [action.meta.id], { isFetching: false, parents: parentsID })
      );
    }
    case CONTAINERS.LIST_PARENTS.ERROR:
      return merge(state, ['itemsByID', action.meta.id],
        { error: action.error, isFetching: false, didFail: true });

    case CONTAINERS.LIST_CHILDREN.REQUEST: {
      const container = state.itemsByID[action.meta.id];
      const itemsByID = indexByID(
        container.children
          .filter(id => !action.meta.excludes.includes(id))
          .map(id => ({ id, isFetching: true })))
      itemsByID[action.meta.id] = set(container, ['isFetching'], true);
      return merge(state, ['itemsByID'], itemsByID);
    }
    case CONTAINERS.LIST_CHILDREN.RECEIVE: {
      const container = state.itemsByID[action.meta.id];
      const items = action.data.map(preprocess);
      const itemsByID = merge(state.itemsByID, [], indexByID(items))
      itemsByID[action.meta.id] = set(container, ['isFetching'], false);
      return merge(state, ['itemsByID'], itemsByID);
    }
    case CONTAINERS.LIST_CHILDREN.ERROR:
      return merge(state, ['itemsByID', action.meta.id], { error: action.error, isFetching: false, didFail: true });

    default:
      return state;
  }
};

function preprocess(container) {
  container.isFetching = false
  container.isLoaded = true
  return container;
}
