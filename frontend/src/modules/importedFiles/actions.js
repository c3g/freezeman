import {createNetworkActionTypes, networkAction} from "../../utils/actions";
import api from "../../utils/api";

export const GET                   = createNetworkActionTypes("IMPORTEDFILES.GET");
export const LIST                  = createNetworkActionTypes("IMPORTEDFILES.LIST");
export const DOWNLOAD              = createNetworkActionTypes("IMPORTEDFILES.DOWNLOAD");

export const get = id => async (dispatch, getState) => {
    const importedFile = getState().importedFiles.itemsByID[id];
    if (importedFile && importedFile.isFetching)
        return;

    return await dispatch(networkAction(GET, api.importedFiles.get(id), { meta: { id } }));
};

export const list = (options) => async (dispatch, getState) => {
    const params = { limit: 100000, ...options }
    return await dispatch(networkAction(LIST,
        api.importedFiles.list(params),
        { meta: params }
    ));
};

export const download = id => async (dispatch, getState) => {
  return await dispatch(networkAction(DOWNLOAD, api.importedFiles.download(id), { meta: { id } }));
};

export default {
    GET,
    LIST,
    DOWNLOAD,
    get,
    list,
    download,
};