import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import IndiceAtti from "./IndiceAtti.tsx";
import { ATTI } from "./influenceContent.ts";

describe("IndiceAtti", () => {
  it("elenca tutti gli atti con un collegamento alla propria ancora", () => {
    render(<IndiceAtti attivo="problema" />);
    ATTI.forEach((atto) => {
      const voce = screen.getByRole("link", { name: new RegExp(atto.titolo, "i") });
      expect(voce).toHaveAttribute("href", `#${atto.id}`);
    });
  });

  it("segnala quale atto e' quello corrente", () => {
    render(<IndiceAtti attivo="cascata" />);
    expect(screen.getByTestId("voce-cascata")).toHaveAttribute("aria-current", "true");
    expect(screen.getByTestId("voce-problema")).not.toHaveAttribute("aria-current");
  });
});
