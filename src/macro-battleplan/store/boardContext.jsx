// Shared board components (tokens, overlays, toolbar, scoreboard) read their
// state through this context so the same UI can drive either edition's store.
// Defaults to the 10e store, which is what the deprecated 10e board uses.

import { createContext, useContext } from 'react'
import { useBoardStore } from './boardStore'

const BoardStoreContext = createContext(useBoardStore)

export function BoardStoreProvider({ store, children }) {
  return <BoardStoreContext.Provider value={store}>{children}</BoardStoreContext.Provider>
}

export function useBoard(selector) {
  const useStore = useContext(BoardStoreContext)
  return useStore(selector)
}
