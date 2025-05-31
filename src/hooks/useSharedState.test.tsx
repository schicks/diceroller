import { renderHook, act } from "@testing-library/react";
import { useSharedState } from "./useSharedState";
import { vi, describe, it, expect, beforeEach, afterEach, MockedFunction } from "vitest";
import { RepoContext, type AutomergeUrl } from "@automerge/react";
import { createTestRepo, createTestDoc } from "./useSharedState.test.helpers";
import type { Roll, Rolls } from "../state.types"; // Assuming state.types is in ../
import { roll as performRoll } from "../roll"; // Import the actual roll to get its type if needed, but we will mock it

// Mock ../roll
vi.mock("../roll", () => ({
  roll: vi.fn(),
}));

// Cast the mocked import
const mockedPerformRoll = performRoll as MockedFunction<typeof performRoll>;

describe("useSharedState", () => {
  const userId = "testUser";
  const FIXED_TIME = 1748196818665;
  let repo: ReturnType<typeof createTestRepo>;
  let docUrl: AutomergeUrl;
  let currentHookResult: { current: ReturnType<typeof useSharedState> } | undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_TIME);
    repo = createTestRepo();
    docUrl = createTestDoc<Rolls>(repo, { heartbeats: {}, history: [] });
    mockedPerformRoll.mockClear();
    currentHookResult = undefined;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <RepoContext.Provider value={repo}>{children}</RepoContext.Provider>
  );

  // Helper to render the hook and capture its result consistently
  const renderAndAdvanceTimers = (url: AutomergeUrl, uId: string) => {
    act(() => {
      const { result } = renderHook(() => useSharedState(url, uId), { wrapper });
      currentHookResult = result;
      vi.advanceTimersByTime(0); // Ensure initial effects run
    });
  };

  describe("heartbeats", () => {
    it("initializes heartbeats and updates them periodically", () => {
      renderAndAdvanceTimers(docUrl, userId);

      const [doc] = currentHookResult!.current;
      expect(doc?.heartbeats[userId]).toBe(FIXED_TIME);

      act(() => {
        vi.advanceTimersByTime(5 * 60 * 1000); // Advance by HEARTBEAT_INTERVAL
      });

      const [updatedDoc] = currentHookResult!.current;
      expect(updatedDoc?.heartbeats[userId]).toBe(FIXED_TIME + 5 * 60 * 1000);
    });
  });

  describe("actions.roll", () => {
    const expression = "2d6";
    const description = "Test roll for damage";
    const mockRollResult: Roll = {
      expression: expression,
      dice: [[{ sides: 6, value: 3 }, { sides: 6, value: 4 }]],
      result: 7,
    };

    beforeEach(() => {
      mockedPerformRoll.mockReturnValue(mockRollResult);
    });

    it("should add a new roll to the history", () => {
      renderAndAdvanceTimers(docUrl, userId);

      const [, actions] = currentHookResult!.current;

      act(() => {
        actions.roll(expression, description);
      });

      expect(mockedPerformRoll).toHaveBeenCalledWith(expression);

      const [docAfterRoll] = currentHookResult!.current;
      expect(docAfterRoll?.history).toBeDefined();
      expect(docAfterRoll?.history.length).toBe(1);
      expect(docAfterRoll?.history[0]).toEqual({
        roll: mockRollResult,
        description,
        userId,
      });
    });

    it("should add multiple rolls to the history in correct order (unshift)", () => {
      renderAndAdvanceTimers(docUrl, userId);

      const [, actions] = currentHookResult!.current;

      const expression2 = "1d20";
      const description2 = "Second roll";
      const mockRollResult2: Roll = {
        expression: expression2,
        dice: [[{ sides: 20, value: 15 }]],
        result: 15,
      };

      act(() => {
        actions.roll(expression, description);
      });

      mockedPerformRoll.mockReturnValueOnce(mockRollResult2);
      act(() => {
        actions.roll(expression2, description2);
      });

      const [docAfterRolls] = currentHookResult!.current;
      expect(docAfterRolls?.history.length).toBe(2);
      expect(docAfterRolls?.history[0]).toEqual({
        roll: mockRollResult2,
        description: description2,
        userId,
      });
      expect(docAfterRolls?.history[1]).toEqual({
        roll: mockRollResult,
        description,
        userId,
      });
    });

    it("should initialize history array if it does not exist on the doc", () => {
      const initialDocState = { heartbeats: {} } as Rolls; // history is undefined
      const freshDocUrl = createTestDoc<Rolls>(repo, initialDocState);

      renderAndAdvanceTimers(freshDocUrl, userId);

      const [, actions] = currentHookResult!.current;

      act(() => {
        actions.roll(expression, description);
      });

      const [docAfterRoll] = currentHookResult!.current;
      expect(docAfterRoll?.history).toBeDefined();
      expect(docAfterRoll?.history.length).toBe(1);
      expect(docAfterRoll?.history[0].roll).toEqual(mockRollResult);
    });
  });
});
