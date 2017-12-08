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
  })
  it('sets and remove loading flag during error', async () => {
    const api = new ApiUnrest(
      {
        fruit: 'fruit',
        color: 'base/color/:id?',
        tree: 'forest/tree/:type?/:age?',
      },
      {
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
    try {
      await fetchPromise
    } catch (err) {
      expect(err).toBeTruthy()
    }
    expect(store.getState().color.loading).toBeFalsy()
    expect(store.getState().color.error).toEqual('HttpError: [500] - error')
  })
})