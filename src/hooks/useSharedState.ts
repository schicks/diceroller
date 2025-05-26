import { useDocument, updateText, type AutomergeUrl } from "@automerge/react";
import { useEffect } from "react";

export type Votes = { [userId in string]?: boolean };

export type LeanCoffee = {
  activeTopic: null | {
    id: string;
    timerStarted: number;
    votes: Votes;
  };
  topics: {
    [topicId in string]?: {
      title: string;
      author: string;
      votes: Votes;
      completed?: boolean;
    };
  };
  heartbeats: {
    [userId: string]: number;
  };
};

const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds

export interface SharedStateActions {
  addTopic: (title: string) => void;
  toggleVote: (
    topicId: string,
    isTimerVote?: boolean,
    voteValue?: boolean
  ) => void;
  startTimer: (topicId: string) => void;
  updateTopicTitle: (topicId: string, newTitle: string) => void;
  markTopicNotCompleted: (topicId: string) => void;
  markTopicCompleted: (topicId: string) => void;
  clearActiveTopic: () => void;
}

export function useSharedState(
  docUrl: AutomergeUrl,
  userId: string
): [LeanCoffee | undefined, SharedStateActions] {
  const [doc, changeDoc] = useDocument<LeanCoffee>(docUrl);

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
    addTopic: (title: string) => {
      if (!title.trim()) return;
      changeDoc((d) => {
        const topicId = crypto.randomUUID();
        if (!d.topics) d.topics = {};
        d.topics[topicId] = {
          title,
          author: userId,
          votes: {},
        };
      });
    },

    toggleVote: (topicId: string, isTimerVote = false, voteValue?: boolean) => {
      changeDoc((d) => {
        const votes = isTimerVote
          ? d.activeTopic?.votes
          : d.topics[topicId]?.votes;
        if (!votes) return;

        if (!isTimerVote) {
          if (votes[userId]) {
            delete votes[userId];
          } else {
            votes[userId] = true;
          }
          return;
        }

        if (votes[userId] === voteValue) {
          delete votes[userId];
        } else {
          votes[userId] = voteValue!;
        }
      });
    },

    startTimer: (topicId: string) => {
      changeDoc((d) => {
        d.activeTopic = {
          id: topicId,
          timerStarted: Date.now(),
          votes: {},
        };
      });
    },

    updateTopicTitle: (topicId: string, newTitle: string) => {
      changeDoc((d) => {
        if (d.topics[topicId]) {
          updateText(d, ["topics", topicId, "title"], newTitle);
        }
      });
    },

    markTopicNotCompleted: (topicId: string) => {
      changeDoc((d) => {
        if (d.topics[topicId]) {
          d.topics[topicId]!.completed = false;
        }
      });
    },

    markTopicCompleted: (topicId: string) => {
      changeDoc((d) => {
        if (d.topics[topicId]) {
          d.topics[topicId]!.completed = true;
        }
      });
    },

    clearActiveTopic: () => {
      changeDoc((d) => {
        d.activeTopic = null;
      });
    },
  };

  return [doc, actions];
}
