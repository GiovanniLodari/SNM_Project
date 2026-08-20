/**
 * Escape dei caratteri che rendono una stringa markup.
 *
 * Serve in un punto solo, ma quel punto e' l'unico dell'applicazione in cui un
 * dato di rete diventa HTML: il `formatter` del tooltip di ECharts. La libreria
 * rende come markup la stringa che il formatter restituisce (`renderMode` e'
 * `"html"` per default), e li' dentro finivano interpolati `acct` e `id` dei
 * nodi - cioe' handle e identificativi raccolti dalle istanze Mastodon remote,
 * che sono dato non fidato: un'istanza ostile che si dichiara con un `acct`
 * contenente markup lo faceva eseguire nel tooltip.
 *
 * Non si e' passati a `renderMode: "richText"` perche' avrebbe richiesto di
 * riscrivere il tooltip nel linguaggio di rich text di ECharts, che non conosce
 * i colori del tema: l'escape risolve la stessa cosa senza cambiare cio' che si
 * vede.
 *
 * L'ordine conta: `&` va sostituita per prima, altrimenti riscriverebbe le
 * entita' introdotte dalle sostituzioni successive.
 */
export function escapeHtml(valore: string | number | null | undefined): string {
  if (valore === null || valore === undefined) return "";
  return String(valore)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
