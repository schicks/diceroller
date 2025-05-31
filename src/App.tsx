import automergeLogo from "/automerge.png";
import "@picocss/pico/css/pico.min.css";
import "./App.css";
import { type AutomergeUrl } from "@automerge/react";
import { useState, useEffect } from "react";
import {
  SharedStateActions,
  useSharedState,
} from "./hooks/useSharedState";
import { type Rolls, type Roll } from "./state.types";
import RollDetails from "./components/RollDetails";

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

const ONLINE_THRESHOLD = 10 * 60 * 1000; // 10 minutes in milliseconds

interface AppProps {
  doc: Rolls | undefined;
  userId: string;
  actions: SharedStateActions;
}

export function App({ doc, userId, actions }: AppProps) {
  const [diceExpression, setDiceExpression] = useState("");
  const [description, setDescription] = useState("");

  // Function to check if a user is online
  const isUserOnline = (lastHeartbeat: number) => {
    return Date.now() - lastHeartbeat < ONLINE_THRESHOLD;
  };

  // Get list of online users with their info
  const onlineUsers = doc?.heartbeats
    ? Object.entries(doc.heartbeats)
      .filter(([, lastHeartbeat]) => isUserOnline(lastHeartbeat as number))
      .map(([user]) => ({
        id: user,
        initials: getUserInitials(user),
        color: generateUserColor(user),
      }))
    : [];

  const handleRoll = () => {
    if (!diceExpression.trim()) return;
    actions.roll(diceExpression, description);
    setDiceExpression("");
    setDescription("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRoll();
    }
  };

  return (
    <>
      <header>
        <div className="header-content">
          <div className="header-left">
            <h1>
              <img src={automergeLogo} alt="Automerge logo" id="automerge-logo" />
              Dice Roller
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
                {onlineUsers.length} user{onlineUsers.length !== 1 ? "s" : ""} online
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="roll-history">
          <div className="history-table-container">
            {doc?.history && doc.history.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Description</th>
                    <th>Expression</th>
                    <th>Details</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {[...doc.history].reverse().map((entry, index) => (
                    <tr key={index}>
                      <td>{getUserInitials(entry.userId)}</td>
                      <td>{entry.description}</td>
                      <td>{entry.roll.expression}</td>
                      <td><RollDetails dice={entry.roll.dice} /></td>
                      <td>{entry.roll.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No rolls yet. Make your first roll!</p>
            )}
          </div>
        </div>

        <div className="roll-inputs">
          <div className="roll-inputs-container">
            <input
              type="text"
              value={diceExpression}
              onChange={(e) => setDiceExpression(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter dice expression (e.g., 2d6+3)"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Optional description"
            />
            <button onClick={handleRoll}>Roll</button>
          </div>
        </div>
      </main>
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
