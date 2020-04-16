import {combineReducers} from "redux";

import {auth} from "./modules/auth/reducers";
import {containerKinds, containers} from "./modules/containers/reducers";
import {individuals} from "./modules/individuals/reducers";
import {samples} from "./modules/samples/reducers";
import {users} from "./modules/users/reducers";
import {versions} from "./modules/versions/reducers";

export default combineReducers({
    auth,
    containerKinds,
    containers,
    individuals,
    samples,
    users,
    versions,
});
