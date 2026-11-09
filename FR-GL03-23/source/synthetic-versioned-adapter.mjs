import {createSyntheticReadOnlyAdapter as source} from './read-only-adapter.mjs';
import {createVersionedReadOnlyAdapter} from './versioned-adapter.mjs';
export function createSyntheticReadOnlyAdapter(){return createVersionedReadOnlyAdapter(source());}
