import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";

// I font che il tema dichiara davvero (theme.ts: tokens.font). Prima veniva
// caricato Roboto, che nessun fontFamily menziona: Inter e Space Grotesk non
// arrivavano mai al browser e tutta la tipografia ripiegava in silenzio sul
// sans-serif di sistema. I pesi sono quelli usati dal tema: 400/500/600/700.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
