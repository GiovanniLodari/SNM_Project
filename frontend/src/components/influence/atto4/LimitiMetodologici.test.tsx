import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import LimitiMetodologici from "./LimitiMetodologici.tsx";
import { LIMITI } from "../influenceContent.ts";

describe("LimitiMetodologici", () => {
  it("rende ogni limite dichiarato nel contenuto", () => {
    render(<LimitiMetodologici />);
    LIMITI.forEach((l) => {
      expect(screen.getByText(l.titolo)).toBeInTheDocument();
    });
  });
});
