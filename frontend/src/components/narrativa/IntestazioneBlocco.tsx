import { Box, Typography, type SxProps, type Theme } from "@mui/material";
import type { ReactNode } from "react";
import EtichettaMono from "./EtichettaMono.tsx";
import { tokens } from "../../theme.ts";

export interface PropsIntestazioneBlocco {
  /** Il titolo: dice a quale domanda risponde cio' che segue. */
  titolo: string;
  /**
   * Occhiello tecnico sopra il titolo. Solo quando dice qualcosa che il titolo
   * non dice - l'unita' di misura, la soglia, la posizione nella narrazione.
   * Un occhiello che riformula il titolo e' il kicker decorativo, e ripetuto
   * sopra ogni blocco diventa grammatica automatica invece che voce.
   */
  occhiello?: string;
  /** Una riga che spiega come va letto il contenuto. Limitata a 70ch. */
  descrizione?: string;
  /** Filtri o menu, allineati a destra del titolo. */
  azione?: ReactNode;
  sx?: SxProps<Theme>;
}

/**
 * L'intestazione di un artefatto: occhiello, titolo in `<h3>`, descrizione,
 * slot azione.
 *
 * Vive separata da `Blocco` perche' non tutti gli artefatti possono stare in un
 * riquadro. Il canvas della cascata e' una superficie scura profonda, che nel
 * vocabolario delle superfici di DESIGN.md e' pari a un riquadro e non un suo
 * contenuto: infilarlo dentro un `Blocco` fa un riquadro dentro un riquadro, che
 * e' vietato alla lettera. Gli serve la stessa intestazione senza la scatola.
 *
 * Tenerla in un componente e' cio' che impedisce alla versione senza scatola di
 * divergere da quella con la scatola - che e' esattamente come l'Atto III si era
 * ritrovato con titoli a 18, 22 e 24px per lo stesso ruolo.
 */
export default function IntestazioneBlocco({
  titolo,
  occhiello,
  descrizione,
  azione,
  sx,
}: PropsIntestazioneBlocco) {
  return (
    <Box sx={sx}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 2,
          flexWrap: "wrap",
          mb: descrizione ? 1 : 3,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          {occhiello && <EtichettaMono sx={{ mb: 0.75 }}>{occhiello}</EtichettaMono>}
          <Typography
            component="h3"
            sx={{ ...tokens.type.featureHeading, color: tokens.color.nearBlack, m: 0 }}
          >
            {titolo}
          </Typography>
        </Box>
        {azione}
      </Box>

      {descrizione && (
        <Typography sx={{ color: tokens.color.textMuted, maxWidth: "70ch", mb: 3, lineHeight: 1.6 }}>
          {descrizione}
        </Typography>
      )}
    </Box>
  );
}
