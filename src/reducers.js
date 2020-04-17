import {combineReducers} from "redux";
import {persistReducer} from "redux-persist";
import storage from "redux-persist/lib/storage";

import {auth} from "./modules/auth/reducers";
import {containerKinds, containers} from "./modules/containers/reducers";
import {individuals} from "./modules/individuals/reducers";
import {samples} from "./modules/samples/reducers";
import {users} from "./modules/users/reducers";
import {versions} from "./modules/versions/reducers";

const AUTH_PERSIST_CONFIG = {
    key: "auth",
    blacklist: ["isFetching"],
    storage,
};

export default combineReducers({
    auth: persistReducer(AUTH_PERSIST_CONFIG, auth),
    containerKinds,
    containers,
    individuals,
    samples,
    users,
    versions,
});
