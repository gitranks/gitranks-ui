/**
 * The address without its query, with no navigation and the history's state kept: a flow step's answers leave the
 * address once they are applied to the account (getting in, §6.2).
 */
export function dropFlowQuery() {
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.hash}`);
}
