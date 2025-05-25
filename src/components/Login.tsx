import { useState, useEffect } from "react";
import {
  generateUsername,
  getStoredUsername,
  storeUsername,
} from "../utils/nameGenerator";
import "./Login.css";

interface LoginProps {
  onLogin: (username: string) => void;
}

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // On mount, try to get stored username or generate a new one
    const stored = getStoredUsername();
    const initialUsername = stored || generateUsername();
    setUsername(initialUsername);
    if (!stored) {
      storeUsername(initialUsername);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      storeUsername(username.trim());
      onLogin(username.trim());
    }
  };

  const handleGenerateNew = () => {
    const newUsername = generateUsername();
    setUsername(newUsername);
    setIsEditing(false);
  };

  return (
    <div className="login-container">
      <h1>Welcome to Lean Coffee</h1>
      <form onSubmit={handleSubmit}>
        <div className="username-input">
          {isEditing ? (
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              autoFocus
            />
          ) : (
            <div
              className="username-display"
              onClick={() => setIsEditing(true)}
            >
              {username}
            </div>
          )}
          <button type="button" onClick={handleGenerateNew}>
            🎲 Generate random username
          </button>
        </div>
        <button type="submit">Start Discussion</button>
      </form>
    </div>
  );
}
