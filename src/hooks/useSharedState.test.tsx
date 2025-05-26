import { renderHook, act } from "@testing-library/react";
import { useSharedState } from "./useSharedState";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { RepoContext } from "@automerge/react";
import { createTestRepo, createTestDoc } from "./useSharedState.test.helpers";

describe("useSharedState", () => {
  const userId = "testUser";
  const FIXED_TIME = 1748196818665;
  const repo = createTestRepo();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("initializes heartbeats and updates them periodically", () => {
    const docUrl = createTestDoc(repo);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RepoContext.Provider value={repo}>{children}</RepoContext.Provider>
    );

    const { result } = renderHook(() => useSharedState(docUrl, userId), {
      wrapper,
    });

    // Wait for initial effect to run
    act(() => {
      vi.advanceTimersByTime(0);
    });

    const [doc] = result.current;
    expect(doc?.heartbeats[userId]).toBe(FIXED_TIME);

    // Advance time and check heartbeat update
    act(() => {
      vi.advanceTimersByTime(5 * 60 * 1000); // 5 minutes
    });

    const [updatedDoc] = result.current;
    expect(updatedDoc?.heartbeats[userId]).toBe(FIXED_TIME + 5 * 60 * 1000);
  });

  it("adds a new topic", () => {
    const docUrl = createTestDoc(repo);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RepoContext.Provider value={repo}>{children}</RepoContext.Provider>
    );

    const { result } = renderHook(() => useSharedState(docUrl, userId), {
      wrapper,
    });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    const [, actions] = result.current;

    act(() => {
      actions.addTopic("Test Topic");
    });

    const [doc] = result.current;
    const topicId = Object.keys(doc?.topics || {})[0];
    const topic = doc?.topics[topicId];
    expect(topic?.title).toBe("Test Topic");
    expect(topic?.author).toBe(userId);
    expect(topic?.votes).toEqual({});
  });

  it("toggles votes on topics", () => {
    const docUrl = createTestDoc(repo);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RepoContext.Provider value={repo}>{children}</RepoContext.Provider>
    );

    const { result } = renderHook(() => useSharedState(docUrl, userId), {
      wrapper,
    });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    const [, actions] = result.current;

    // Add a topic first
    act(() => {
      actions.addTopic("Test Topic");
    });

    const [docWithTopic] = result.current;
    const topicId = Object.keys(docWithTopic?.topics || {})[0];

    // Toggle vote on
    act(() => {
      actions.toggleVote(topicId);
    });

    const [docWithVote] = result.current;
    expect(docWithVote?.topics[topicId]?.votes[userId]).toBe(true);

    // Toggle vote off
    act(() => {
      actions.toggleVote(topicId);
    });

    const [docWithoutVote] = result.current;
    expect(docWithoutVote?.topics[topicId]?.votes[userId]).toBeUndefined();
  });

  it("starts and manages timer for topics", () => {
    const docUrl = createTestDoc(repo);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RepoContext.Provider value={repo}>{children}</RepoContext.Provider>
    );

    const { result } = renderHook(() => useSharedState(docUrl, userId), {
      wrapper,
    });

    act(() => {
      vi.advanceTimersByTime(0);
    });

    const [, actions] = result.current;

    // Add a topic first
    act(() => {
      actions.addTopic("Test Topic");
    });

    const [docWithTopic] = result.current;
    const topicId = Object.keys(docWithTopic?.topics || {})[0];

    // Start timer
    act(() => {
      actions.startTimer(topicId);
    });

    const [docWithTimer] = result.current;
    expect(docWithTimer?.activeTopic?.id).toBe(topicId);
    expect(docWithTimer?.activeTopic?.votes).toEqual({});
    expect(docWithTimer?.activeTopic?.timerStarted).toBe(FIXED_TIME);

    // Toggle timer vote
    act(() => {
      actions.toggleVote(topicId, true, true);
    });

    const [docWithTimerVote] = result.current;
    expect(docWithTimerVote?.activeTopic?.votes[userId]).toBe(true);
  });

  it("marks topics as completed and allows rediscussion", () => {
    const docUrl = createTestDoc(repo);
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RepoContext.Provider value={repo}>{children}</RepoContext.Provider>
    );

    const { result } = renderHook(() => useSharedState(docUrl, userId), {
      wrapper,
    });

    const [, actions] = result.current;

    // Add a topic first
    act(() => {
      actions.addTopic("Test Topic");
    });

    const [docWithTopic] = result.current;
    const topicId = Object.keys(docWithTopic?.topics || {})[0];

    // Mark as completed
    act(() => {
      actions.markTopicCompleted(topicId);
    });

    const [docWithCompleted] = result.current;
    expect(docWithCompleted?.topics[topicId]?.completed).toBe(true);

    // Mark for rediscussion
    act(() => {
      actions.markTopicNotCompleted(topicId);
    });

    const [docWithRediscussion] = result.current;
    expect(docWithRediscussion?.topics[topicId]?.completed).toBe(false);
  });
});
