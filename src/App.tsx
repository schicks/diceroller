import automergeLogo from "/automerge.png";
import "@picocss/pico/css/pico.min.css";
import "./App.css";
import { type AutomergeUrl } from "@automerge/react";
import { useState, useEffect } from "react";
import {
  SharedStateActions,
  useSharedState,
  type LeanCoffee,
  type Votes,
} from "./hooks/useSharedState";

/**
 * Get initials from a username
 * Examples:
 * - "John Doe" -> "JD"
 * - "john.doe" -> "JD"
 * - "johndoe" -> "JO"
 */
const getUserInitials = (username: string): string => {
  // Split by common separators
  const parts = username.split(/[\s._-]/);
  if (parts.length > 1) {
    // If we have multiple parts, use first letter of first and last parts
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  // Otherwise use first and last letter of the username
  return (username[0] + username[username.length - 1]).toUpperCase();
};

/**
 * Generate a consistent HSL color from a string
 * Returns a muted, professional color suitable for UI
 */
const generateUserColor = (username: string): string => {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate HSL color with:
  // - Hue: Full range (0-360)
  // - Saturation: 35-45% (muted but visible)
  // - Lightness: 45-55% (visible on both light and dark backgrounds)
  const hue = hash % 360;
  const saturation = 40 + (hash % 10);
  const lightness = 50 + (hash % 10);

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

const TIMER_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
const ONLINE_THRESHOLD = 10 * 60 * 1000; // 10 minutes in milliseconds

interface AppProps {
  doc: LeanCoffee | undefined;
  userId: string;
  actions: SharedStateActions;
}

export function App({ doc, userId, actions }: AppProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [newTopicTitle, setNewTopicTitle] = useState("");
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);

  // Function to check if a user is online
  const isUserOnline = (lastHeartbeat: number) => {
    return Date.now() - lastHeartbeat < ONLINE_THRESHOLD;
  };

  // Get list of online users with their info
  const onlineUsers = doc?.heartbeats
    ? Object.entries(doc.heartbeats)
        .filter(([, lastHeartbeat]) => isUserOnline(lastHeartbeat))
        .map(([user]) => ({
          id: user,
          initials: getUserInitials(user),
          color: generateUserColor(user),
        }))
    : [];

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
    actions.addTopic(newTopicTitle);
    setNewTopicTitle("");
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
      actions.startTimer(doc.activeTopic.id);
    } else {
      // Mark topic as completed and clear active topic
      if (doc.activeTopic) {
        actions.markTopicCompleted(doc.activeTopic.id);
        actions.clearActiveTopic();
      }
    }
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
        <div className="online-users">
          <div className="online-users-circles">
            {onlineUsers.map((user) => (
              <div
                key={user.id}
                className="user-circle"
                style={{ backgroundColor: user.color }}
              >
                {user.initials}
                <span className="user-tooltip">{user.id}</span>
              </div>
            ))}
          </div>
          <div className="online-users-count">
            {onlineUsers.length} user{onlineUsers.length !== 1 ? "s" : ""}{" "}
            online
          </div>
        </div>
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
                onClick={() =>
                  actions.toggleVote(doc!.activeTopic!.id, true, true)
                }
                className={
                  doc?.activeTopic?.votes[userId] === true ? "voted" : ""
                }
              >
                Continue ({continueVotes})
              </button>
              <button
                onClick={() =>
                  actions.toggleVote(doc!.activeTopic!.id, true, false)
                }
                className={
                  doc?.activeTopic?.votes[userId] === false ? "voted" : ""
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
                onClick={() => actions.startTimer(sortedTopics[0][0])}
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
                    {topic.author === userId ? (
                      <input
                        type="text"
                        value={topic.title}
                        onChange={(e) =>
                          actions.updateTopicTitle(topicId, e.target.value)
                        }
                        className={topic.completed ? "completed-text" : ""}
                      />
                    ) : (
                      topic.title
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => actions.toggleVote(topicId)}
                      className={topic.votes[userId] ? "voted" : ""}
                      disabled={topic.completed}
                    >
                      {getTopicVoteCount(topic.votes)}
                    </button>
                  </td>
                  <td>
                    {!doc?.activeTopic && !topic.completed && (
                      <button onClick={() => actions.startTimer(topicId)}>
                        Discuss
                      </button>
                    )}
                    {topic.completed && (
                      <button
                        onClick={() => actions.markTopicNotCompleted(topicId)}
                      >
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

interface AppWrapperProps {
  docUrl: AutomergeUrl;
  userId: string;
}

export default function AppWrapper({ docUrl, userId }: AppWrapperProps) {
  const [doc, actions] = useSharedState(docUrl, userId);

  return <App doc={doc} actions={actions} userId={userId} />;
}
