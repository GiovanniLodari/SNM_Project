/**
 * Caricatori delle pagine, sorgente unica.
 *
 * Ogni pagina arriva in lazy, e lo stesso caricatore serve a due cose che prima
 * stavano nello stesso file solo perche' erano nate insieme: costruire il
 * componente `lazy()` in App.tsx e anticipare il bundle quando il mouse sfiora
 * la voce di navigazione. Da quando la sidebar vive in un componente suo, il
 * secondo uso e' altrove: tenere la mappa qui evita che le due copie divergano
 * - una rotta aggiunta senza caricatore non si rompe, semplicemente smette di
 * essere pre-scaricata, ed e' il tipo di regressione che nessuno nota.
 *
 * Il file sta nella radice di `src` perche' i percorsi degli `import()`
 * dinamici sono relativi al modulo che li contiene: spostarlo in una
 * sottocartella significherebbe riscriverli tutti.
 */

export const caricaDashboard = () => import("./pages/Dashboard.tsx");
export const caricaPosts = () => import("./pages/Posts.tsx");
export const caricaPostDetail = () => import("./pages/PostDetail.tsx");
export const caricaDetection = () => import("./pages/Detection.tsx");
export const caricaFactChecking = () => import("./pages/FactChecking.tsx");
export const caricaAccounts = () => import("./pages/Accounts.tsx");
export const caricaPipelines = () => import("./pages/Pipelines.tsx");
export const caricaDbSync = () => import("./pages/DbSync.tsx");
export const caricaInfluenceMaximization = () => import("./pages/InfluenceMaximization.tsx");

/** Il caricatore di ogni rotta raggiungibile dalla sidebar, per il prefetch. */
export const CARICATORI_ROTTA: Record<string, () => Promise<unknown>> = {
  "/": caricaDashboard,
  "/posts": caricaPosts,
  "/accounts": caricaAccounts,
  "/detection": caricaDetection,
  "/fact-check": caricaFactChecking,
  "/influence-maximization": caricaInfluenceMaximization,
  "/pipelines": caricaPipelines,
  "/db-sync": caricaDbSync,
};
