import {combineReducers} from "redux";

import {auth} from "./modules/auth/reducers";
import {containers} from "./modules/containers/reducers";
import {individuals} from "./modules/individuals/reducers";
import {samples} from "./modules/samples/reducers";
import {versions} from "./modules/versions/reducers";

export default combineReducers({
    auth,
    containers,
    individuals,
    samples,
    versions,
});
