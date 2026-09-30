import { fetchNavUser, type NavUser } from "./auth";
import { client } from "./client";
import {
  Credential,
  clearStoredCredential,
  loadStoredCredential,
  storeCredential,
} from "./credential";

export interface AccountState {
  credential: Credential;
  user: NavUser | null;
  checking: boolean;
}

let state: AccountState = {
  credential: loadStoredCredential() ?? new Credential(),
  user: null,
  checking: false,
};

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function subscribeAccount(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAccount(): AccountState {
  return state;
}

export async function refreshAccount(): Promise<void> {
  state = { ...state, checking: true };
  emit();
  try {
    const user = await fetchNavUser(state.credential);
    state = { ...state, user, checking: false };
  } catch {
    state = { ...state, user: null, checking: false };
  }
  emit();
}

export function applyCredential(credential: Credential): void {
  client.credential = credential;
  state = { ...state, credential };
  emit();
  void refreshAccount();
}

export function loginWithCredential(credential: Credential): void {
  storeCredential(credential);
  applyCredential(credential);
}

export function logout(): void {
  clearStoredCredential();
  applyCredential(new Credential());
}
