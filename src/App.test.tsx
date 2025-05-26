import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { App } from "./App";
import { type LeanCoffee } from "./hooks/useSharedState";

describe("App", () => {
  const mockActions = {
    addTopic: vi.fn(),
    toggleVote: vi.fn(),
    startTimer: vi.fn(),
    updateTopicTitle: vi.fn(),
    markTopicNotCompleted: vi.fn(),
    markTopicCompleted: vi.fn(),
    clearActiveTopic: vi.fn(),
  };
  const FIXED_TIME = 1748196818665;
  const userId = "user1";
  const baseDoc: LeanCoffee = {
    activeTopic: null,
    topics: {},
    heartbeats: {},
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_TIME);
    Object.values(mockActions).forEach((mock) => mock.mockClear());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // Helper function to deep clone a document
  const cloneDoc = (doc: LeanCoffee): LeanCoffee =>
    JSON.parse(JSON.stringify(doc));

  describe("Adding topics", () => {
    it("adds a new topic when typing and clicking Add", () => {
      render(<App doc={baseDoc} actions={mockActions} userId={userId} />);

      const input = screen.getByPlaceholderText("Add a new topic...");
      fireEvent.change(input, { target: { value: "New Topic" } });
      fireEvent.click(screen.getByText("Add"));

      expect(mockActions.addTopic).toHaveBeenCalledWith("New Topic");
    });

    it("adds a new topic when pressing Enter", () => {
      render(<App doc={baseDoc} actions={mockActions} userId={userId} />);

      const input = screen.getByPlaceholderText("Add a new topic...");
      fireEvent.change(input, { target: { value: "New Topic" } });
      fireEvent.keyDown(input, { key: "Enter" });

      expect(mockActions.addTopic).toHaveBeenCalledWith("New Topic");
    });

    it("does not add empty topics", () => {
      render(<App doc={baseDoc} actions={mockActions} userId={userId} />);

      const input = screen.getByPlaceholderText("Add a new topic...");
      fireEvent.change(input, { target: { value: "   " } });
      fireEvent.click(screen.getByText("Add"));

      expect(mockActions.addTopic).not.toHaveBeenCalled();
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
      heartbeats: {},
    };

    it("toggles vote on a topic when clicking vote button", () => {
      render(<App doc={docWithTopics} actions={mockActions} userId={userId} />);

      // Find the vote button for the first topic
      const voteButtons = screen.getAllByText("0");
      fireEvent.click(voteButtons[0]);

      expect(mockActions.toggleVote).toHaveBeenCalledWith("topic1");
    });

    it("removes vote when clicking again", () => {
      render(<App doc={docWithTopics} actions={mockActions} userId={userId} />);

      // Find the row containing "Second Topic" and then find its vote button
      const row = screen.getByText("Second Topic").closest("tr");
      const voteButton = row!.querySelector("button");
      fireEvent.click(voteButton!);

      expect(mockActions.toggleVote).toHaveBeenCalledWith("topic2");
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
      heartbeats: {},
    };

    it("shows timer for active topic", () => {
      render(
        <App
          doc={docWithActiveDiscussion}
          actions={mockActions}
          userId={userId}
        />
      );

      expect(screen.getByText("5:00")).toBeInTheDocument();
      expect(
        screen.getByText("Current Topic: Active Topic")
      ).toBeInTheDocument();
    });

    it("updates timer every second", () => {
      render(
        <App
          doc={docWithActiveDiscussion}
          actions={mockActions}
          userId={userId}
        />
      );

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
      render(
        <App
          doc={docWithActiveDiscussion}
          actions={mockActions}
          userId={userId}
        />
      );

      fireEvent.click(screen.getByText("Continue (0)"));
      expect(mockActions.toggleVote).toHaveBeenCalledWith("topic1", true, true);
    });

    it("marks topic as completed when time runs out and stop votes win", () => {
      const docWithVotes: LeanCoffee = {
        ...docWithActiveDiscussion,
        activeTopic: {
          ...docWithActiveDiscussion.activeTopic!,
          votes: { user1: false, user2: false, user3: true },
        },
      };

      render(<App doc={docWithVotes} actions={mockActions} userId={userId} />);

      act(() => {
        vi.advanceTimersByTime(5 * 60 * 1000); // Advance to end of timer
      });

      expect(mockActions.markTopicCompleted).toHaveBeenCalledWith("topic1");
      expect(mockActions.clearActiveTopic).toHaveBeenCalled();
    });

    it("restarts timer when continue votes win", () => {
      const docWithVotes: LeanCoffee = {
        ...docWithActiveDiscussion,
        activeTopic: {
          ...docWithActiveDiscussion.activeTopic!,
          votes: { user1: true, user2: true, user3: false },
        },
      };

      render(<App doc={docWithVotes} actions={mockActions} userId={userId} />);

      act(() => {
        vi.advanceTimersByTime(5 * 60 * 1000); // Advance to end of timer
      });

      expect(mockActions.startTimer).toHaveBeenCalledWith("topic1");
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
      heartbeats: {},
    };

    it("hides completed topics by default", () => {
      render(
        <App
          doc={docWithCompletedTopic}
          actions={mockActions}
          userId={userId}
        />
      );

      expect(screen.queryByText("Completed Topic")).not.toBeInTheDocument();
    });

    it("shows completed topics when toggled", () => {
      render(
        <App
          doc={docWithCompletedTopic}
          actions={mockActions}
          userId={userId}
        />
      );

      fireEvent.click(screen.getByLabelText("Show Completed Topics"));
      const completedTopicInput = screen.getByDisplayValue("Completed Topic");
      expect(completedTopicInput).toBeInTheDocument();
    });

    it("allows rediscussing completed topics", () => {
      render(
        <App
          doc={docWithCompletedTopic}
          actions={mockActions}
          userId={userId}
        />
      );

      fireEvent.click(screen.getByLabelText("Show Completed Topics"));
      fireEvent.click(screen.getByText("Rediscuss"));

      expect(mockActions.markTopicNotCompleted).toHaveBeenCalledWith("topic1");
    });
  });

  describe("Heartbeats", () => {
    it("shows correct number of online users", () => {
      const docWithHeartbeats: LeanCoffee = {
        ...baseDoc,
        heartbeats: {
          user1: Date.now(),
          user2: Date.now() - 5 * 60 * 1000, // 5 minutes ago
          user3: Date.now() - 15 * 60 * 1000, // 15 minutes ago (offline)
        },
      };

      render(
        <App doc={docWithHeartbeats} actions={mockActions} userId={userId} />
      );

      expect(screen.getByText("2 users online")).toBeInTheDocument();
    });

    it("shows user circles with correct initials", () => {
      const docWithHeartbeats: LeanCoffee = {
        ...baseDoc,
        heartbeats: {
          "john.doe": Date.now(),
          jane_smith: Date.now() - 5 * 60 * 1000, // 5 minutes ago
          "bob.wilson": Date.now() - 15 * 60 * 1000, // 15 minutes ago (offline)
        },
      };

      render(
        <App doc={docWithHeartbeats} actions={mockActions} userId={userId} />
      );

      // Should show circles for john.doe and jane_smith (bob.wilson is offline)
      const circles = screen.getAllByText(/JD|JS/);
      expect(circles).toHaveLength(2);

      // Check initials and tooltips
      const johnCircle = screen.getByText("JD").closest(".user-circle");
      expect(johnCircle).toHaveTextContent("john.doe");

      const janeCircle = screen.getByText("JS").closest(".user-circle");
      expect(janeCircle).toHaveTextContent("jane_smith");
    });

    it("generates consistent colors for the same username", () => {
      const docWithHeartbeats: LeanCoffee = {
        ...baseDoc,
        heartbeats: {
          "john.doe": Date.now(),
          jane_smith: Date.now(),
        },
      };

      const { rerender } = render(
        <App doc={docWithHeartbeats} actions={mockActions} userId={userId} />
      );

      // Get initial colors
      const johnCircle = screen
        .getByText("JD")
        .closest(".user-circle") as HTMLDivElement;
      const janeCircle = screen
        .getByText("JS")
        .closest(".user-circle") as HTMLDivElement;
      const johnColor = johnCircle.style.backgroundColor;
      const janeColor = janeCircle.style.backgroundColor;

      // Rerender and check colors remain the same
      rerender(
        <App doc={docWithHeartbeats} actions={mockActions} userId={userId} />
      );

      const newJohnCircle = screen
        .getByText("JD")
        .closest(".user-circle") as HTMLDivElement;
      const newJaneCircle = screen
        .getByText("JS")
        .closest(".user-circle") as HTMLDivElement;
      expect(newJohnCircle.style.backgroundColor).toBe(johnColor);
      expect(newJaneCircle.style.backgroundColor).toBe(janeColor);

      // Colors should be different for different users
      expect(johnColor).not.toBe(janeColor);
    });
  });
});
