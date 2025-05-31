import { Repo, type AutomergeUrl } from "@automerge/react";

export function createTestRepo() {
  return new Repo({});
}

// Make createTestDoc generic and accept initialData
export function createTestDoc<T = any>(repo: Repo, initialData?: T): AutomergeUrl {
  const handle = repo.create<T>(initialData ? { ...initialData } : undefined);
  const url = handle.url;

  return url;
}
