/** UI state of any asynchronous resource. Screens render one view per status. */
export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; error: Error }
  | { status: 'success'; data: T };

export type AsyncStatus = AsyncState<unknown>['status'];
