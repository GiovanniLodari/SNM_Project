import { describe, expect, it, vi } from "vitest";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import SidebarNavigazione from "./SidebarNavigazione.tsx";
import { LARGHEZZA_RAIL, LARGHEZZA_SIDEBAR } from "./misure.ts";

// Le voci pre-scaricano i dati della rotta al passaggio del mouse: qui interessa
// solo la larghezza del pannello, quindi il client viene neutralizzato.
vi.mock("../../api/client.ts", () => ({
  api: new Proxy({}, { get: () => () => new Promise(() => {}) }),
}));

function montaSidebar({ bloccata = false, onCambiaBlocco = () => {} } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <SidebarNavigazione
          mobileAperta={false}
          onChiudiMobile={() => {}}
          bloccata={bloccata}
          onCambiaBlocco={onCambiaBlocco}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

/** Il comando che tiene aperto il pannello, nel solo pannello desktop. */
function comandoBlocco(): HTMLElement {
  return within(pannelloDesktop()).getByRole("button", {
    name: /tieni aperta la navigazione|richiudi la navigazione/i,
  });
}

/**
 * Il pannello permanente, quello del desktop.
 *
 * Va distinto esplicitamente perche' il pannello temporaneo di mobile resta
 * montato (`keepMounted`): ogni voce esiste due volte nel documento, e la copia
 * mobile non ha larghezza variabile.
 */
function pannelloDesktop(): HTMLElement {
  return screen.getByTestId("sidebar-desktop");
}

function navigazione(): HTMLElement {
  return screen.getByRole("navigation", { name: /navigazione principale/i });
}

describe("SidebarNavigazione", () => {
  it("a riposo resta larga quanto la colonna delle icone", () => {
    montaSidebar();
    expect(pannelloDesktop()).toHaveStyle({ width: `${LARGHEZZA_RAIL}px` });
  });

  it("si espande al passaggio del mouse e si richiude all'uscita", async () => {
    const utente = userEvent.setup();
    montaSidebar();

    await utente.hover(navigazione());
    expect(pannelloDesktop()).toHaveStyle({ width: `${LARGHEZZA_SIDEBAR}px` });

    await utente.unhover(navigazione());
    expect(pannelloDesktop()).toHaveStyle({ width: `${LARGHEZZA_RAIL}px` });
  });

  it("si espande quando il focus da tastiera entra in una voce e si richiude all'uscita", () => {
    montaSidebar();

    const collegamento = within(pannelloDesktop()).getByRole("link", { name: /fact checking/i });
    // `focus()` diretto invece di userEvent: qui interessa il focus che arriva
    // da solo - con Tab, o riportato da un'altra parte della pagina - non il
    // percorso preciso che ce lo ha portato. L'act serve perche' la chiamata
    // grezza al DOM non passa da testing-library e lo stato non verrebbe
    // applicato prima dell'asserzione.
    act(() => collegamento.focus());
    expect(pannelloDesktop()).toHaveStyle({ width: `${LARGHEZZA_SIDEBAR}px` });

    act(() => collegamento.blur());
    expect(pannelloDesktop()).toHaveStyle({ width: `${LARGHEZZA_RAIL}px` });
  });

  it("espone un comando per tenere aperto il pannello, raggiungibile a riposo", async () => {
    const utente = userEvent.setup();
    const cambiaBlocco = vi.fn();
    montaSidebar({ onCambiaBlocco: cambiaBlocco });

    // Il comando deve esistere *senza* passare dall'hover: e' l'unico modo di
    // leggere le etichette su un dispositivo che non sa fare hover, e se stesse
    // dentro la parte ritagliata del pannello sarebbe raggiungibile solo dopo
    // averlo aperto.
    const comando = comandoBlocco();
    expect(comando).toHaveAttribute("aria-expanded", "false");

    await utente.click(comando);
    expect(cambiaBlocco).toHaveBeenCalledTimes(1);
  });

  it("bloccata, resta larga anche quando il mouse esce", async () => {
    const utente = userEvent.setup();
    montaSidebar({ bloccata: true });

    expect(pannelloDesktop()).toHaveStyle({ width: `${LARGHEZZA_SIDEBAR}px` });
    expect(comandoBlocco()).toHaveAttribute("aria-expanded", "true");

    await utente.hover(navigazione());
    await utente.unhover(navigazione());
    // Il blocco vince sull'hover: uscire col mouse non annulla una scelta.
    expect(pannelloDesktop()).toHaveStyle({ width: `${LARGHEZZA_SIDEBAR}px` });
  });

  it("tiene le voci raggiungibili per nome anche a riposo", () => {
    montaSidebar();

    // Le etichette svaniscono in opacita', non escono dal documento: il nome
    // accessibile dei collegamenti non deve cambiare con lo stato del pannello.
    const collegamento = within(pannelloDesktop()).getByRole("link", { name: /account & bot/i });

    expect(pannelloDesktop()).toHaveStyle({ width: `${LARGHEZZA_RAIL}px` });
    expect(collegamento).toHaveAccessibleName(/account & bot/i);
  });
});
