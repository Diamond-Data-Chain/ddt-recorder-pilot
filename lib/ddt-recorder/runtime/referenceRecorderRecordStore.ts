import {
  getReferenceRecorderRecordStore as getStore,
} from "../storage/runtimeStores";

export function getReferenceRecorderRecordStore() {
  return getStore();
}
