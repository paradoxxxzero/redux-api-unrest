import { applyMiddleware, combineReducers, createStore } from 'redux'
import thunk from 'redux-thunk'
// eslint-disable-next-line no-unused-vars
import regeneratorRuntime from 'regenerator-runtime'

import ApiUnrest from '../src'
import { timeout } from './utils'

describe('Api unrest update the state when fetching', () => {
  it('sets and remove loading flag during success', async () => {
    const api = new ApiUnrest(
      {
        fruit: 'fruit',
        color: 'base/color/:id?',
        tree: 'forest/tree/:type?/:age?',
      },
      {
        apiRoot: state => state,
        fetch: async () => {
          await timeout(25)
          return {
            status: 200,
            headers: {
              get: key =>
                ({
                  'Content-Type': 'application/json',
                }[key]),
            },
            // eslint-disable-next-line require-await
            json: async () => ({
              objects: ['response'],
            }),
          }
        },
      }
    )
    const store = createStore(
      combineReducers(api.reducers),
      applyMiddleware(thunk)
    )

    expect(store.getState().color.loading).toBeFalsy()
    const fetchPromise = store.dispatch(api.actions.color.get())
    expect(store.getState().color.loading).toBeTruthy()
    await fetchPromise
    expect(store.getState().color.loading).toBeFalsy()
    expect(store.getState().color.objects).toEqual(['response'])
    expect(store.getState().color.error).toBeNull()
    expect(store.getState().color.metadata.code).toEqual(200)
  })
  it('sets and remove loading flag during error', async () => {
    const api = new ApiUnrest(
      {
        fruit: 'fruit',
        color: 'base/color/:id?',
        tree: 'forest/tree/:type?/:age?',
      },
      {
        apiRoot: state => state,
        fetch: async () => {
          await timeout(25)
          return {
            status: 500,
            headers: {
              get: key =>
                ({
                  'Content-Type': 'application/json',
                }[key]),
            },
            // eslint-disable-next-line require-await
            json: async () => ({
              message: 'error',
            }),
          }
        },
      }
    )
    const store = createStore(
      combineReducers(api.reducers),
      applyMiddleware(thunk)
    )

    expect(store.getState().color.loading).toBeFalsy()
    const fetchPromise = store.dispatch(api.actions.color.get())
    expect(store.getState().color.loading).toBeTruthy()
    let catched = false
    try {
      await fetchPromise
    } catch (err) {
      expect(err).toBeTruthy()
      catched = true
    }
    expect(catched).toBeTruthy()
    expect(store.getState().color.loading).toBeFalsy()
    expect(store.getState().color.error).toEqual('HttpError: [500] - error')
  })
  it('throws an error on concurrent requests', async () => {
    const api = new ApiUnrest(
      {
        fruit: 'fruit',
        color: 'base/color/:id?',
        tree: 'forest/tree/:type?/:age?',
      },
      {
        apiRoot: state => state,
        fetch: async () => {
          await timeout(25)
          return {
            status: 200,
            headers: {
              get: key =>
                ({
                  'Content-Type': 'application/json',
                }[key]),
            },
            // eslint-disable-next-line require-await
            json: async () => ({
              objects: ['data'],
            }),
          }
        },
      }
    )
    const store = createStore(
      combineReducers(api.reducers),
      applyMiddleware(thunk)
    )
    let catched = false
    try {
      await Promise.all([
        store.dispatch(api.actions.color.get()),
        store.dispatch(api.actions.color.get()),
      ])
    } catch (err) {
      catched = true
      expect(err.name).toEqual('AlreadyLoadingError')
    }
    expect(catched).toBeTruthy()
  })
  it('still success on first request on concurrent requests', async () => {
    const api = new ApiUnrest(
      {
        fruit: 'fruit',
        color: 'base/color/:id?',
        tree: 'forest/tree/:type?/:age?',
      },
      {
        apiRoot: state => state,
        errorHandler: () => false,
        fetch: async () => {
          await timeout(25)
          return {
            status: 200,
            headers: {
              get: key =>
                ({
                  'Content-Type': 'application/json',
                }[key]),
            },
            // eslint-disable-next-line require-await
            json: async () => ({
              objects: ['data'],
            }),
          }
        },
      }
    )
    const store = createStore(
      combineReducers(api.reducers),
      applyMiddleware(thunk)
    )
    await Promise.all([
      store.dispatch(api.actions.color.get()),
      store.dispatch(api.actions.color.get()),
    ])
    expect(store.getState().color.objects).toEqual(['data'])
  })

  it('can force its way on concurrent requests', async () => {
    const api = new ApiUnrest(
      {
        fruit: 'fruit',
        color: 'base/color/:id?',
        tree: 'forest/tree/:type?/:age?',
      },
      {
        apiRoot: state => state,
        fetch: async url => {
          await timeout(25)
          return {
            status: 200,
            headers: {
              get: key =>
                ({
                  'Content-Type': 'application/json',
                }[key]),
            },
            // eslint-disable-next-line require-await
            json: async () => ({
              objects: [url],
            }),
          }
        },
      }
    )
    const store = createStore(
      combineReducers(api.reducers),
      applyMiddleware(thunk)
    )
    const reports = await Promise.all([
      store.dispatch(api.actions.color.getItem({ id: 1 })).catch(e => ({
        promise: 1,
        e,
      })),
      store.dispatch(api.actions.color.force.getItem({ id: 2 })).catch(e => ({
        promise: 2,
        e,
      })),
    ])

    expect(reports[0].promise).toEqual(1)
    expect(reports[0].e.name).toEqual('AbortError')
    expect(reports[0].e.toString()).toEqual(
      'AbortError: This request was aborted by a force: ' +
        'GET /base/color/2 (api.color)'
    )
    expect(reports[1].promise).toBeUndefined()
    expect(store.getState().color.objects).toEqual(['/base/color/2'])
  })

  it('can force its way on concurrent requests on other method', async () => {
    const api = new ApiUnrest(
      {
        fruit: 'fruit',
        color: 'base/color/:id?',
        tree: 'forest/tree/:type?/:age?',
      },
      {
        apiRoot: state => state,
        fetch: async (url, { body }) => {
          await timeout(25)
          return {
            status: 200,
            headers: {
              get: key =>
                ({
                  'Content-Type': 'application/json',
                }[key]),
            },
            // eslint-disable-next-line require-await
            json: async () => ({
              objects: [JSON.parse(body)],
            }),
          }
        },
      }
    )
    const store = createStore(
      combineReducers(api.reducers),
      applyMiddleware(thunk)
    )

    const reports = await Promise.all([
      store.dispatch(api.actions.color.post({ o: 1 })).catch(e => ({
        promise: 1,
        e,
      })),
      store.dispatch(api.actions.color.force.post()).catch(e => ({
        promise: 2,
        e,
      })),
      store.dispatch(api.actions.color.force.post({ o: 2 })).catch(e => ({
        promise: 3,
        e,
      })),
    ])

    expect(reports[0].promise).toEqual(1)
    expect(reports[0].e.name).toEqual('AbortError')
    expect(reports[0].e.toString()).toEqual(
      'AbortError: This request was aborted by a force: ' +
        'POST /base/color (api.color)'
    )
    expect(reports[1].promise).toEqual(2)
    expect(reports[1].e.name).toEqual('AbortError')
    expect(reports[1].e.toString()).toEqual(
      'AbortError: This request was aborted by a force: ' +
        'POST /base/color (api.color)'
    )
    expect(reports[2].promise).toBeUndefined()
    expect(store.getState().color.objects).toEqual([{ o: 2 }])
    // What happened to the object 1 -> we can't say so don't use that!
    expect(api.promises.color).toBeUndefined()
  })

  it('resets while a request is pending', async () => {
    const api = new ApiUnrest(
      {
        fruit: 'fruit',
        color: 'base/color/:id?',
        tree: 'forest/tree/:type?/:age?',
      },
      {
        apiRoot: state => state,
        fetch: async () => {
          await timeout(25)
          throw new Error('We should never go here')
        },
      }
    )
    const store = createStore(
      combineReducers(api.reducers),
      applyMiddleware(thunk)
    )

    expect(store.getState().color.loading).toBeFalsy()
    const fetchPromise = store.dispatch(api.actions.color.get())
    expect(api.promises.color).not.toBeUndefined()
    expect(store.getState().color.loading).toBeTruthy()
    setTimeout(() => {
      expect(store.getState().color.loading).toBeTruthy()
      store.dispatch(api.actions.color.reset())
      expect(store.getState().color.loading).toBeFalsy()
    }, 1)
    let thrown = false
    try {
      await fetchPromise
    } catch (error) {
      thrown = true
      expect(error.name).toEqual('AbortError')
      expect(error.toString()).toEqual(
        'AbortError: This request was aborted by a reset on api.color'
      )
    }
    expect(thrown).toBeTruthy()
    expect(store.getState().color.objects).toEqual([])
    expect(api.promises.color).toBeUndefined()
  })
})
