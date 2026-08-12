import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import { useUrlList, useUrlNumber, useUrlString } from "./useUrlState.ts";

/** Monta l'hook dentro un router con la query string data. */
const conUrl = (query: string) =>
  function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={[`/pagina${query}`]}>{children}</MemoryRouter>;
  };

describe("useUrlString", () => {
  it("legge il valore dalla URL", () => {
    const { result } = renderHook(() => useUrlString("q"), { wrapper: conUrl("?q=vaccino") });
    expect(result.current[0]).toBe("vaccino");
  });

  it("ricade sul predefinito quando il parametro manca", () => {
    const { result } = renderHook(() => useUrlString("sort", "id"), { wrapper: conUrl("") });
    expect(result.current[0]).toBe("id");
  });

  it("scrive il valore e poi lo rilegge", () => {
    const { result } = renderHook(() => useUrlString("q"), { wrapper: conUrl("") });
    act(() => result.current[1]("clima"));
    expect(result.current[0]).toBe("clima");
  });

  it("un valore vuoto toglie il parametro invece di lasciarlo vuoto", () => {
    // Cosi' la URL condivisa resta leggibile: niente ?q=&sort=&page=1 addosso.
    const { result } = renderHook(() => useUrlString("q"), { wrapper: conUrl("?q=vecchio") });
    act(() => result.current[1](""));
    expect(result.current[0]).toBe("");
  });
});

describe("useUrlNumber", () => {
  it("converte in numero", () => {
    const { result } = renderHook(() => useUrlNumber("page", 1), { wrapper: conUrl("?page=7") });
    expect(result.current[0]).toBe(7);
  });

  it("ricade sul predefinito se la URL contiene spazzatura", () => {
    // Una URL si puo' scrivere a mano: senza questo controllo un NaN si
    // propagherebbe nei calcoli di paginazione.
    const { result } = renderHook(() => useUrlNumber("page", 1), { wrapper: conUrl("?page=abc") });
    expect(result.current[0]).toBe(1);
  });

  it("accetta la forma con funzione, come useState", () => {
    const { result } = renderHook(() => useUrlNumber("page", 1), { wrapper: conUrl("?page=3") });
    act(() => result.current[1]((p) => p + 1));
    expect(result.current[0]).toBe(4);
  });
});

describe("useUrlList", () => {
  it("legge valori ripetuti", () => {
    const { result } = renderHook(() => useUrlList("lang"), {
      wrapper: conUrl("?lang=it&lang=en"),
    });
    expect(result.current[0]).toEqual(["it", "en"]);
  });

  it("una lista vuota toglie il parametro", () => {
    const { result } = renderHook(() => useUrlList("lang"), { wrapper: conUrl("?lang=it") });
    act(() => result.current[1]([]));
    expect(result.current[0]).toEqual([]);
  });

  it("sostituisce la selezione invece di accodarla", () => {
    const { result } = renderHook(() => useUrlList("lang"), { wrapper: conUrl("?lang=it") });
    act(() => result.current[1](["en", "fr"]));
    expect(result.current[0]).toEqual(["en", "fr"]);
  });
});
