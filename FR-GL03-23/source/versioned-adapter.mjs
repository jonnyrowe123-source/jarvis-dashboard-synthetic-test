import {versionRichSnapshot,VIEWS} from './dashboard-contract.mjs';
// Adds a version to a validated rich snapshot. No filtering, sorting or field removal.
// The source is trusted local code; canonical ownership/ranking is deliberately absent.
export function createVersionedReadOnlyAdapter(source){
 if(!source||typeof source.getDashboard!=='function')throw new TypeError('Read-only source required');
 return Object.freeze({async getDashboard(view='overall'){
  if(!VIEWS.includes(view))throw new TypeError('Invalid view');
  return versionRichSnapshot(await source.getDashboard(view),{view});
 }});
}
