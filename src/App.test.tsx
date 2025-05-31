import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { App } from "./App";
import { type Rolls, type Roll } from "./state.types";
import { type SharedStateActions } from "./hooks/useSharedState";

describe("App", () => {
  const mockActions: SharedStateActions = {
    roll: vi.fn(),
  };
  const FIXED_TIME = 1748196818665;
  const baseDoc: Rolls = {
    history: [],
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

  describe("Rolling dice", () => {
    it("calls roll action when form is submitted", () => {
      render(<App doc={baseDoc} actions={mockActions} />);

      const expressionInput = screen.getByPlaceholderText(
        "Enter dice expression (e.g., 2d6+3)"
      );
      const descriptionInput =
        screen.getByPlaceholderText("Optional description");
      const rollButton = screen.getByText("Roll");

      fireEvent.change(expressionInput, { target: { value: "2d6" } });
      fireEvent.change(descriptionInput, {
        target: { value: "Damage roll" },
      });
      fireEvent.click(rollButton);

      expect(mockActions.roll).toHaveBeenCalledWith("2d6", "Damage roll");
    });

    it("does not call roll action if expression is empty", () => {
      render(<App doc={baseDoc} actions={mockActions} />);

      const descriptionInput =
        screen.getByPlaceholderText("Optional description");
      const rollButton = screen.getByText("Roll");

      fireEvent.change(descriptionInput, {
        target: { value: "Damage roll" },
      });
      fireEvent.click(rollButton);

      expect(mockActions.roll).not.toHaveBeenCalled();
    });

    it("clears input fields after rolling", () => {
      render(<App doc={baseDoc} actions={mockActions} />);

      const expressionInput = screen.getByPlaceholderText(
        "Enter dice expression (e.g., 2d6+3)"
      ) as HTMLInputElement;
      const descriptionInput = screen.getByPlaceholderText(
        "Optional description"
      ) as HTMLInputElement;
      const rollButton = screen.getByText("Roll");

      fireEvent.change(expressionInput, { target: { value: "1d20" } });
      fireEvent.change(descriptionInput, {
        target: { value: "Attack roll" },
      });
      fireEvent.click(rollButton);

      expect(expressionInput.value).toBe("");
      expect(descriptionInput.value).toBe("");
    });
  });

  describe("Roll history", () => {
    const mockRollResult: Roll = {
      expression: "2d6",
      dice: [
        [
          { sides: 6, value: 3 },
          { sides: 6, value: 4 },
        ],
      ],
      result: 7,
    };
    const docWithHistory: Rolls = {
      heartbeats: { user1: FIXED_TIME, user2: FIXED_TIME - 60000 }, // user2 active
      history: [
        { userId: "user1", description: "Damage roll", roll: mockRollResult },
        {
          userId: "user2",
          description: "Healing potion",
          roll: {
            expression: "1d4+1",
            dice: [[{ sides: 4, value: 2 }]],
            result: 3,
          },
        },
      ],
    };

    it("displays roll history correctly", () => {
      render(
        <App doc={docWithHistory} actions={mockActions} />
      );

      // Check text content
      expect(screen.getByText("Damage roll")).toBeInTheDocument();
      expect(screen.getByText("Healing potion")).toBeInTheDocument();
      expect(screen.getByText("2d6")).toBeInTheDocument();
      expect(screen.getByText("1d4+1")).toBeInTheDocument();

      // Check results
      expect(screen.getByRole("cell", { name: "7" })).toBeInTheDocument();
      expect(screen.getByRole("cell", { name: "3" })).toBeInTheDocument();

      // Check that the dice details are accessible somewhere in the document
      expect(screen.getAllByLabelText(/d6\(3\)/)).not.toHaveLength(0);
      expect(screen.getAllByLabelText(/d6\(4\)/)).not.toHaveLength(0);
      expect(screen.getAllByLabelText(/d4\(2\)/)).not.toHaveLength(0);
    });

    it("shows 'No rolls yet' message when history is empty", () => {
      render(<App doc={baseDoc} actions={mockActions} />);
      expect(
        screen.getByText("No rolls yet. Make your first roll!")
      ).toBeInTheDocument();
    });

    it("displays user initials for each roll entry", () => {
      render(
        <App doc={docWithHistory} actions={mockActions} />
      );
      // getUserInitials("user1") -> "U1"
      // getUserInitials("user2") -> "U2"
      const user1Initials = screen.getAllByText("U1");
      const user2Initials = screen.getAllByText("U2");
      expect(user1Initials.length).toBeGreaterThan(0);
      expect(user2Initials.length).toBeGreaterThan(0);
    });
  });

  describe("Heartbeats", () => {
    it("shows correct number of online users", () => {
      const docWithHeartbeats: Rolls = {
        ...baseDoc,
        heartbeats: {
          user1: Date.now(),
          user2: Date.now() - 5 * 60 * 1000, // 5 minutes ago
          user3: Date.now() - 15 * 60 * 1000, // 15 minutes ago (offline)
        },
      };

      render(
        <App doc={docWithHeartbeats} actions={mockActions} />
      );

      expect(screen.getByText("2 users online")).toBeInTheDocument();
    });

    it("shows user circles with correct initials and tooltips", () => {
      const docWithHeartbeats: Rolls = {
        ...baseDoc,
        heartbeats: {
          "john.doe": Date.now(),
          jane_smith: Date.now() - 5 * 60 * 1000, // 5 minutes ago
        },
      };

      render(
        <App doc={docWithHeartbeats} actions={mockActions} />
      );

      const johnCircle = screen.getByText("JD").closest(".user-circle");
      expect(johnCircle).toBeInTheDocument();
      expect(johnCircle).toHaveTextContent("john.doe");


      const janeCircle = screen.getByText("JS").closest(".user-circle");
      expect(janeCircle).toBeInTheDocument();
      expect(janeCircle).toHaveTextContent("jane_smith");
    });


    it("generates consistent colors for the same username", () => {
      const docWithHeartbeats: Rolls = {
        ...baseDoc,
        heartbeats: {
          "john.doe": Date.now(),
          "jane.smith": Date.now(),
        },
      };

      const { rerender } = render(
        <App doc={docWithHeartbeats} actions={mockActions} />
      );

      const johnCircle = screen.getByText("JD")
        .closest(".user-circle") as HTMLDivElement;
      const janeCircle = screen.getByText("JS") // jane.smith -> JS
        .closest(".user-circle") as HTMLDivElement;
      const johnColor = johnCircle.style.backgroundColor;
      const janeColor = janeCircle.style.backgroundColor;

      rerender(
        <App doc={docWithHeartbeats} actions={mockActions} />
      );

      const newJohnCircle = screen.getByText("JD")
        .closest(".user-circle") as HTMLDivElement;
      const newJaneCircle = screen.getByText("JS")
        .closest(".user-circle") as HTMLDivElement;
      expect(newJohnCircle.style.backgroundColor).toBe(johnColor);
      expect(newJaneCircle.style.backgroundColor).toBe(janeColor);

      expect(johnColor).not.toBe(janeColor);
    });
  });
});
