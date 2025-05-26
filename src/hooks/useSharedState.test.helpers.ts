import { Repo, type AutomergeUrl } from "@automerge/react";
import { type LeanCoffee } from "./useSharedState";

export function createTestRepo() {
  return new Repo({});
}

export function createTestDoc(repo: Repo): AutomergeUrl {
  const handle = repo.create<LeanCoffee>();
  const url = handle.url;

  // Initialize the document with empty state
  handle.change((doc) => {
    doc.topics = {};
    doc.heartbeats = {};
    doc.activeTopic = null;
  });

  return url;
}
