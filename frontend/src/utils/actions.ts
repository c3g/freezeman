import { AnyAction } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from '../store';
import { ABORT_ERROR_NAME, FMSResponse } from './api';

export interface NetworkActionTypes<Prefix extends string> {
    REQUEST: `${Prefix}.REQUEST`
    RECEIVE: `${Prefix}.RECEIVE`
    ERROR: `${Prefix}.ERROR`
}

export const createNetworkActionTypes = <Prefix extends string>(prefix: Prefix): NetworkActionTypes<Prefix> => ({
    REQUEST: `${prefix}.REQUEST`,
    RECEIVE: `${prefix}.RECEIVE`,
    ERROR: `${prefix}.ERROR`,
});

export interface NetworkActionOptions {
    // A function that transforms the data received from the backend before returning it to the caller.
    transform?: (data: any) => any

    // Any extra data added to the action
    meta?: any

    // Don't display error notifications of the specified type, eg. 'AbortError'
    ignoreError?: string
}


export type NetworkActionThunk<T> = (dispatch: AppDispatch, getState: () => RootState) => Promise<FMSResponse<T>>
export interface NetworkActionListReceive extends AnyAction {
    type: string,
    data: any,
    meta: NetworkActionOptions['meta'],
}

/**
 * @param {object} types - Action types for REQUEST, RECEIVE, ERROR
 * @param {function} apiFunction - Store-dispatchable API function
 * @param {object} [options]
 * @param {object} [options.meta] - Additional data for actions
 * @param {boolean} [options.meta.ignoreError] - Don't show error notification on error
 */
export const networkAction = <Prefix extends string, T>(types: NetworkActionTypes<Prefix>, apiAction: NetworkActionThunk<T>, options: NetworkActionOptions = {}) => (dispatch: AppDispatch) => {
    const { meta, transform } = options
    dispatch({ type: types.REQUEST, meta });

    return dispatch(apiAction)
        .then(response => {
            dispatch({
                type: types.RECEIVE,
                data: transform ? transform(response.data) : response.data,
                meta,
            });
            return response.data;
        })
        .catch(error => {
            if (error.name !== ABORT_ERROR_NAME) {
                dispatch({ type: types.ERROR, error, meta })
            }
            return Promise.reject(error)
        });
};
