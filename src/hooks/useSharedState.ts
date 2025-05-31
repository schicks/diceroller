import { useDocument, type AutomergeUrl } from "@automerge/react";
import { useEffect } from "react";
import { Rolls } from "../state.types";
import { roll as performRoll } from '../roll';

const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

export interface SharedStateActions {
  roll: (expression: string, description: string) => void
}

export function useSharedState(
  docUrl: AutomergeUrl,
  userId: string
): [Rolls | undefined, SharedStateActions] {
  const [doc, changeDoc] = useDocument<Rolls>(docUrl);

  // Handle heartbeats internally
  useEffect(() => {
    if (!doc) return;

    // Initialize heartbeats object if it doesn't exist
    changeDoc((d) => {
      if (!d.heartbeats) {
        d.heartbeats = {};
      }
      d.heartbeats[userId] = Date.now();
    });

    // Set up interval for heartbeats
    const interval = setInterval(() => {
      changeDoc((d) => {
        d.heartbeats[userId] = Date.now();
      });
    }, HEARTBEAT_INTERVAL);

    return () => clearInterval(interval);
  }, [doc, userId, changeDoc]);

  const actions: SharedStateActions = {
    roll: (expression: string, description: string) => {
      changeDoc((d) => {
        if (!d.history) {
          d.history = [];
        }
        const newRoll = performRoll(expression);
        d.history.unshift({
          roll: newRoll,
          description,
          userId,
        });
      });
    },
  };

  return [doc, actions];
}
