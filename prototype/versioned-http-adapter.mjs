// FR-GL03-18 bridge: strict versioned synthetic DTO -> existing hardened fixture envelope.
// This is a compatibility-only bridge. It deliberately strips revision/state only after
// full validation, and therefore is NOT suitable for canonical production data.
import {toVersionedSyntheticDTO} from "./versioned-dto.mjs";
export function createLegacyFixtureBridge(richerAdapter) {
 if(!richerAdapter||typeof richerAdapter.getDashboard!=="function") throw new TypeError("Adapter required");
 return {async getDashboard(view="overall"){
  const dto=toVersionedSyntheticDTO(await richerAdapter.getDashboard(view));
  return {
   revision:dto.revision,source:dto.source,
   actions:dto.actions.map(({id,title,context})=>({id,title,context})),
   decisions:dto.decisions.map(({id,title})=>({id,title})),
   warnings:dto.warnings
  };
 }};
}
