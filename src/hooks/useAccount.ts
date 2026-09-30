import { useSyncExternalStore } from "react";
import { getAccount, subscribeAccount, type AccountState } from "../bilibili/account";

export function useAccount(): AccountState {
  return useSyncExternalStore(subscribeAccount, getAccount);
}
