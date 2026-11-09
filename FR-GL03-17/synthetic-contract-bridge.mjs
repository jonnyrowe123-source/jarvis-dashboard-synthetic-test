// FR-GL03-17: synthetic-only projection; NEVER a canonical Brain adapter.
import {validateSnapshot} from './fr-gl03-10-original-adapter.mjs';
export function projectSyntheticSnapshot(input) {
  const source=validateSnapshot(input);
  if(source.source!=='synthetic-fixture') throw new TypeError('Non-synthetic source forbidden');
  if(source.actions.length>100||source.decisions.length>100||source.warnings.length>100)
    throw new TypeError('Synthetic payload too large');
  const actions=source.actions.map(({id,title,context})=>{
    if(!['10min','lenovo'].includes(context)) throw new TypeError('Unsupported action context');
    if(typeof title!=='string'||title.length>200) throw new TypeError('Invalid title');
    return {id,title,context};
  });
  const decisions=source.decisions.map(({id,title})=>{
    if(typeof title!=='string'||title.length>200) throw new TypeError('Invalid decision title');
    return {id,title};
  });
  if(!source.warnings.every(w=>typeof w==='string'&&w.length<=512))
    throw new TypeError('Unexpected warning');
  return {revision:source.revision,source:'synthetic-fixture',actions,decisions,warnings:[...source.warnings]};
}
export function createSyntheticContractBridge(originalAdapter) {
  if(!originalAdapter||typeof originalAdapter.getDashboard!=='function') throw new TypeError('Invalid adapter');
  return Object.freeze({
    async getDashboard(view='overall') {
      if(!['overall','10min','lenovo'].includes(view)) throw new TypeError('Invalid view');
      const input=await originalAdapter.getDashboard(view);
      return projectSyntheticSnapshot(input);
    }
  });
}
