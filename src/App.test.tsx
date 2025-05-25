import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { App, type LeanCoffee } from "./App";

describe("App", () => {
  const mockChangeDoc = vi.fn();
  const FIXED_TIME = 1748196818665;
  const baseDoc: LeanCoffee = {
    activeTopic: null,
    topics: {},
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe("Adding topics", () => {
    it("adds a new topic when typing and clicking Add", () => {
      render(<App doc={baseDoc} changeDoc={mockChangeDoc} />);

      const input = screen.getByPlaceholderText("Add a new topic...");
      fireEvent.change(input, { target: { value: "New Topic" } });
      fireEvent.click(screen.getByText("Add"));

      expect(mockChangeDoc).toHaveBeenCalled();
      const changeDocCall = mockChangeDoc.mock.calls[0][0];
      const testDoc = { ...baseDoc };
      changeDocCall(testDoc);

      // Verify a topic was added with the correct title
      const topicId = Object.keys(testDoc.topics)[0];
      expect(testDoc.topics[topicId]?.title).toBe("New Topic");
    });

    it("adds a new topic when pressing Enter", () => {
      render(<App doc={baseDoc} changeDoc={mockChangeDoc} />);

      const input = screen.getByPlaceholderText("Add a new topic...");
      fireEvent.change(input, { target: { value: "New Topic" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockChangeDoc).toHaveBeenCalled();
    });

    it("does not add empty topics", () => {
      render(<App doc={baseDoc} changeDoc={mockChangeDoc} />);

      const input = screen.getByPlaceholderText("Add a new topic...");
      fireEvent.change(input, { target: { value: "   " } });
      fireEvent.click(screen.getByText("Add"));

      expect(mockChangeDoc).not.toHaveBeenCalled();
    });
  });

  describe("Voting", () => {
    const docWithTopics: LeanCoffee = {
      activeTopic: null,
      topics: {
        topic1: {
          title: "First Topic",
          author: "user1",
          votes: {},
        },
        topic2: {
          title: "Second Topic",
          author: "user2",
          votes: { user1: true },
        },
      },
    };

    it("toggles vote on a topic when clicking vote button", () => {
      render(<App doc={docWithTopics} changeDoc={mockChangeDoc} />);

      // Find the vote button for the first topic
      const voteButtons = screen.getAllByText("0");
      fireEvent.click(voteButtons[0]);

      expect(mockChangeDoc).toHaveBeenCalled();
      const changeDocCall = mockChangeDoc.mock.calls[0][0];
      const testDoc = { ...docWithTopics };
      changeDocCall(testDoc);

      expect(testDoc.topics["topic1"]?.votes["user1"]).toBe(true);
    });

    it("removes vote when clicking again", () => {
      render(<App doc={docWithTopics} changeDoc={mockChangeDoc} />);

      // Find the row containing "Second Topic" and then find its vote button
      const row = screen.getByText("Second Topic").closest("tr");
      const voteButton = row!.querySelector("button");
      fireEvent.click(voteButton!);

      expect(mockChangeDoc).toHaveBeenCalled();
      const changeDocCall = mockChangeDoc.mock.calls[0][0];
      const testDoc = { ...docWithTopics };
      changeDocCall(testDoc);

      expect(testDoc.topics["topic2"]?.votes["user1"]).toBeUndefined();
    });
  });

  describe("Timer behavior", () => {
    const docWithActiveDiscussion: LeanCoffee = {
      activeTopic: {
        id: "topic1",
        timerStarted: FIXED_TIME,
        votes: {},
      },
      topics: {
        topic1: {
          title: "Active Topic",
          author: "user1",
          votes: {},
        },
      },
    };

    it("shows timer for active topic", () => {
      render(<App doc={docWithActiveDiscussion} changeDoc={mockChangeDoc} />);

      expect(screen.getByText("5:00")).toBeInTheDocument();
      expect(
        screen.getByText("Current Topic: Active Topic")
      ).toBeInTheDocument();
    });

    it("updates timer every second", () => {
      render(<App doc={docWithActiveDiscussion} changeDoc={mockChangeDoc} />);

      expect(screen.getByText("5:00")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText("4:59")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByText("4:58")).toBeInTheDocument();
    });

    it("handles continue/stop voting during discussion", () => {
      render(<App doc={docWithActiveDiscussion} changeDoc={mockChangeDoc} />);

      fireEvent.click(screen.getByText("Continue (0)"));
      expect(mockChangeDoc).toHaveBeenCalled();

      const changeDocCall = mockChangeDoc.mock.calls[0][0];
      const testDoc = { ...docWithActiveDiscussion };
      changeDocCall(testDoc);

      expect(testDoc.activeTopic?.votes["user1"]).toBe(true);
    });

    it("marks topic as completed when time runs out and stop votes win", () => {
      if (!docWithActiveDiscussion.activeTopic)
        throw new Error("activeTopic should not be null");

      const docWithVotes: LeanCoffee = {
        ...docWithActiveDiscussion,
        activeTopic: {
          id: docWithActiveDiscussion.activeTopic.id,
          timerStarted: docWithActiveDiscussion.activeTopic.timerStarted,
          votes: { user1: false, user2: false, user3: true },
        },
      };

      render(<App doc={docWithVotes} changeDoc={mockChangeDoc} />);

      act(() => {
        vi.advanceTimersByTime(5 * 60 * 1000); // Advance to end of timer
      });

      expect(mockChangeDoc).toHaveBeenCalled();
      const changeDocCall = mockChangeDoc.mock.calls[0][0];
      const testDoc = { ...docWithVotes };
      changeDocCall(testDoc);

      expect(testDoc.topics["topic1"]?.completed).toBe(true);
      expect(testDoc.activeTopic).toBeNull();
    });

    it("restarts timer when continue votes win", () => {
      if (!docWithActiveDiscussion.activeTopic)
        throw new Error("activeTopic should not be null");

      const docWithVotes: LeanCoffee = {
        ...docWithActiveDiscussion,
        activeTopic: {
          id: docWithActiveDiscussion.activeTopic.id,
          timerStarted: docWithActiveDiscussion.activeTopic.timerStarted,
          votes: { user1: true, user2: true, user3: false },
        },
      };

      render(<App doc={docWithVotes} changeDoc={mockChangeDoc} />);

      act(() => {
        vi.advanceTimersByTime(5 * 60 * 1000); // Advance to end of timer
      });

      expect(mockChangeDoc).toHaveBeenCalled();
      const changeDocCall = mockChangeDoc.mock.calls[0][0];
      const testDoc = { ...docWithVotes };
      changeDocCall(testDoc);

      expect(testDoc.activeTopic?.timerStarted).toBe(
        FIXED_TIME + 5 * 60 * 1000
      );
      expect(Object.keys(testDoc.activeTopic?.votes || {}).length).toBe(0);
    });
  });

  describe("Topic management", () => {
    const docWithCompletedTopic: LeanCoffee = {
      activeTopic: null,
      topics: {
        topic1: {
          title: "Completed Topic",
          author: "user1",
          votes: {},
          completed: true,
        },
      },
    };

    it("hides completed topics by default", () => {
      render(<App doc={docWithCompletedTopic} changeDoc={mockChangeDoc} />);

      expect(screen.queryByText("Completed Topic")).not.toBeInTheDocument();
    });

    it("shows completed topics when toggled", () => {
      render(<App doc={docWithCompletedTopic} changeDoc={mockChangeDoc} />);

      fireEvent.click(screen.getByLabelText("Show Completed Topics"));
      const completedTopicInput = screen.getByDisplayValue("Completed Topic");
      expect(completedTopicInput).toBeInTheDocument();
    });

    it("allows rediscussing completed topics", () => {
      render(<App doc={docWithCompletedTopic} changeDoc={mockChangeDoc} />);

      fireEvent.click(screen.getByLabelText("Show Completed Topics"));
      fireEvent.click(screen.getByText("Rediscuss"));

      expect(mockChangeDoc).toHaveBeenCalled();
      const changeDocCall = mockChangeDoc.mock.calls[0][0];
      const testDoc = { ...docWithCompletedTopic };
      changeDocCall(testDoc);

      expect(testDoc.topics["topic1"]?.completed).toBe(false);
    });
  });
});
