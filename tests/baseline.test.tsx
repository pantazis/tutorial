import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import HomePage from "@/app/page";

describe("application baseline", () => {
  it("renders one descriptive page heading", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Advanced learning" }),
    ).toBeInTheDocument();
  });
});