type ApiFunction<P extends any[], T> = (...args: P) => (_: any, getState: () => { auth: { tokens: { access: string } } }) => Promise<T>

export function withToken<P extends any[], T>(token: string, fn: ApiFunction<P, T>): ApiFunction<P, T> {
    return (...args: P) => fn(...args)(undefined, () => ({ auth: { tokens: { access: token } } }))
}