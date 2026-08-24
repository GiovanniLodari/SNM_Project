import PaginaCapitolo, { Sezione } from "../components/narrativa/PaginaCapitolo.tsx";
import { useAttoInVista } from "../components/narrativa/useAttoInVista.ts";
import { ATTI } from "../components/influence/influenceContent.ts";
import { CAPITOLO_PROPAGAZIONE } from "../navigazione.ts";
import ConfrontoIM from "../components/influence/atto2/ConfrontoIM.tsx";
import LimitiMetodologici from "../components/influence/atto4/LimitiMetodologici.tsx";
import ImpattoDis from "../components/influence/atto_impatto/ImpattoDis.tsx";
import Propagatori from "../components/influence/atto_impatto/Propagatori.tsx";

const [ATTO_IMPATTO, ATTO_ALGORITMO, ATTO_PROPAGATORI, ATTO_LIMITI] = ATTI;

export default function InfluenceMaximization() {
  const attoAttivo = useAttoInVista(ATTI, true);

  return (
    <PaginaCapitolo
      numero={CAPITOLO_PROPAGAZIONE.numero}
      capitolo={CAPITOLO_PROPAGAZIONE.etichetta}
      titolo={CAPITOLO_PROPAGAZIONE.titolo}
      guida={CAPITOLO_PROPAGAZIONE.guida}
      atti={ATTI}
      attoAttivo={attoAttivo}
    >
      <Sezione atto={ATTO_IMPATTO}>
        <ImpattoDis />
      </Sezione>

      <Sezione atto={ATTO_ALGORITMO}>
        <ConfrontoIM />
      </Sezione>

      <Sezione atto={ATTO_PROPAGATORI}>
        <Propagatori />
      </Sezione>

      <Sezione atto={ATTO_LIMITI}>
        <LimitiMetodologici />
      </Sezione>
    </PaginaCapitolo>
  );
}
