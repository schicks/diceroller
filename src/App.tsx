import automergeLogo from "/automerge.png";
import "@picocss/pico/css/pico.min.css";
import "./App.css";
import { useDocument, updateText, type AutomergeUrl } from "@automerge/react";
import { useState, useEffect } from "react";

/**
 * Votes is a map of user ids to a boolean value.
 * true is an upvote, false is a downvote.
 * Remove the user id to remove the vote. When downvotes are not relevant, a downvote can be treated as removing a vote.
 */
type Votes = { [userId in string]?: boolean };

export type LeanCoffee = {
  activeTopic: null | {
    id: string;
    timerStarted: number;
    votes: Votes;
  };
  topics: {
    [topicId in string]?: {
      title: string;
      author: string; // user id
      votes: Votes;
      completed?: boolean;
    };
  };
};

// For now, using a mock user ID. In a real app, this would come from auth
const MOCK_USER_ID = "user1";
const TIMER_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

interface AppProps {
  doc: LeanCoffee | undefined;
  changeDoc: (fn: (doc: LeanCoffee) => void) => void;
}

export function App({ doc, changeDoc }: AppProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    if (!doc?.activeTopic) {
      setTimeLeft(null);
      return;
    }

    const elapsed = Date.now() - doc.activeTopic.timerStarted;
    const remaining = Math.max(0, TIMER_DURATION - elapsed);
    setTimeLeft(remaining);

    const timer = setInterval(() => {
      const newElapsed = Date.now() - doc.activeTopic!.timerStarted;
      const newRemaining = Math.max(0, TIMER_DURATION - newElapsed);
      setTimeLeft(newRemaining);

      if (newRemaining === 0) {
        checkVoteResult();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [doc?.activeTopic?.timerStarted, doc?.activeTopic?.id]);

  const getTopicVoteCount = (votes: Votes) => {
    return Object.values(votes).filter((v) => v).length;
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const addTopic = () => {
    if (!newTopicTitle.trim()) return;

    changeDoc((d) => {
      const topicId = crypto.randomUUID();
      if (!d.topics) d.topics = {};
      d.topics[topicId] = {
        title: newTopicTitle,
        author: MOCK_USER_ID,
        votes: {},
      };
    });
    setNewTopicTitle("");
  };

  const toggleVote = (
    topicId: string,
    isTimerVote = false,
    voteValue?: boolean
  ) => {
    changeDoc((d) => {
      const votes = isTimerVote
        ? d.activeTopic?.votes
        : d.topics[topicId]?.votes;
      if (!votes) return;

      // For regular topic votes (not timer votes), just toggle between voted and not voted
      if (!isTimerVote) {
        if (votes[MOCK_USER_ID]) {
          delete votes[MOCK_USER_ID];
        } else {
          votes[MOCK_USER_ID] = true;
        }
        return;
      }

      // For timer votes, handle the continue/stop voting
      if (votes[MOCK_USER_ID] === voteValue) {
        delete votes[MOCK_USER_ID];
      } else {
        votes[MOCK_USER_ID] = voteValue!;
      }
    });
  };

  const startTimer = (topicId: string) => {
    changeDoc((d) => {
      d.activeTopic = {
        id: topicId,
        timerStarted: Date.now(),
        votes: {},
      };
    });
  };

  const checkVoteResult = () => {
    if (!doc?.activeTopic) return;

    const continueVotes = Object.values(doc.activeTopic.votes).filter(
      (v) => v
    ).length;
    const stopVotes = Object.values(doc.activeTopic.votes).filter(
      (v) => !v
    ).length;

    if (continueVotes > stopVotes) {
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 1000);
      // Restart timer
      changeDoc((d) => {
        if (d.activeTopic) {
          d.activeTopic.timerStarted = Date.now();
          d.activeTopic.votes = {};
        }
      });
    } else {
      // Mark topic as completed and clear active topic
      changeDoc((d) => {
        if (d.activeTopic && d.topics[d.activeTopic.id]) {
          d.topics[d.activeTopic.id]!.completed = true;
          d.activeTopic = null;
        }
      });
    }
  };

  const updateTopicTitle = (topicId: string, newTitle: string) => {
    changeDoc((d) => {
      if (d.topics[topicId]) {
        updateText(d, ["topics", topicId, "title"], newTitle);
      }
    });
  };

  const markTopicNotCompleted = (topicId: string) => {
    changeDoc((d) => {
      if (d.topics[topicId]) {
        d.topics[topicId]!.completed = false;
      }
    });
  };

  const sortedTopics = doc?.topics
    ? Object.entries(doc.topics)
        .filter(([, topic]) => topic && (showCompleted || !topic.completed))
        .sort(([, a], [, b]) => {
          if (!a || !b) return 0;
          // Sort completed topics to the bottom
          if (a.completed && !b.completed) return 1;
          if (!a.completed && b.completed) return -1;
          // Then sort by votes
          return getTopicVoteCount(b.votes) - getTopicVoteCount(a.votes);
        })
    : [];

  const hasUndiscussedTopics = sortedTopics.some(
    ([, topic]) => topic && !topic.completed
  );

  const activeTopic = doc?.activeTopic ? doc.topics[doc.activeTopic.id] : null;
  const continueVotes = doc?.activeTopic
    ? Object.values(doc.activeTopic.votes).filter((v) => v).length
    : 0;
  const stopVotes = doc?.activeTopic
    ? Object.values(doc.activeTopic.votes).filter((v) => !v).length
    : 0;

  return (
    <>
      <header>
        <h1>
          <img src={automergeLogo} alt="Automerge logo" id="automerge-logo" />
          Lean Coffee
        </h1>
      </header>

      <div className="timer-section">
        {activeTopic ? (
          <div>
            <h2>Current Topic: {activeTopic.title}</h2>
            <div className={`timer ${isFlashing ? "flash" : ""}`}>
              {timeLeft !== null ? formatTime(timeLeft) : "5:00"}
            </div>
            <div className="vote-buttons">
              <button
                onClick={() => toggleVote(doc!.activeTopic!.id, true, true)}
                className={
                  doc?.activeTopic?.votes[MOCK_USER_ID] === true ? "voted" : ""
                }
              >
                Continue ({continueVotes})
              </button>
              <button
                onClick={() => toggleVote(doc!.activeTopic!.id, true, false)}
                className={
                  doc?.activeTopic?.votes[MOCK_USER_ID] === false ? "voted" : ""
                }
              >
                Stop ({stopVotes})
              </button>
              <button onClick={checkVoteResult} className="call-vote">
                Call Vote
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2>No Active Topic</h2>
            {sortedTopics.length > 0 && (
              <button
                onClick={() => startTimer(sortedTopics[0][0])}
                disabled={!hasUndiscussedTopics}
              >
                Start Discussion
              </button>
            )}
          </div>
        )}
      </div>

      <div className="add-topic">
        <input
          type="text"
          value={newTopicTitle}
          onChange={(e) => setNewTopicTitle(e.target.value)}
          placeholder="Add a new topic..."
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              addTopic();
            }
          }}
        />
        <button onClick={addTopic}>Add</button>
      </div>

      <table>
        <thead>
          <tr>
            <th>Topic</th>
            <th>Votes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedTopics.map(
            ([topicId, topic]) =>
              topic && (
                <tr
                  key={topicId}
                  className={topic.completed ? "completed" : ""}
                >
                  <td className={topic.completed ? "completed-text" : ""}>
                    {topic.author === MOCK_USER_ID ? (
                      <input
                        type="text"
                        value={topic.title}
                        onChange={(e) =>
                          updateTopicTitle(topicId, e.target.value)
                        }
                        className={topic.completed ? "completed-text" : ""}
                      />
                    ) : (
                      topic.title
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => toggleVote(topicId)}
                      className={topic.votes[MOCK_USER_ID] ? "voted" : ""}
                      disabled={topic.completed}
                    >
                      {getTopicVoteCount(topic.votes)}
                    </button>
                  </td>
                  <td>
                    {!doc?.activeTopic && !topic.completed && (
                      <button onClick={() => startTimer(topicId)}>
                        Discuss
                      </button>
                    )}
                    {topic.completed && (
                      <button onClick={() => markTopicNotCompleted(topicId)}>
                        Rediscuss
                      </button>
                    )}
                  </td>
                </tr>
              )
          )}
        </tbody>
      </table>

      <div className="show-completed">
        <label>
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
          />
          Show Completed Topics
        </label>
      </div>
    </>
  );
}

export default function AppWrapper({ docUrl }: { docUrl: AutomergeUrl }) {
  const [doc, changeDoc] = useDocument<LeanCoffee>(docUrl);

  return <App doc={doc} changeDoc={changeDoc} />;
}
