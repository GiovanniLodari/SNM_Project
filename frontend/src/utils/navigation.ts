/**
 * Decide se una voce di menu corrisponde al percorso corrente.
 *
 * Il confronto e' esatto oppure su un sottopercorso completo. Con un semplice
 * `startsWith`, "/ai-detection" combaciava anche con "/ai-detection-binoculars",
 * "/ai-detection-desklib" e "/ai-detection-ada": aprendo uno degli altri
 * detector, la voce FastDetectGPT restava evidenziata insieme a quella davvero
 * aperta. Lo slash finale distingue un figlio ("/posts/12") da un fratello che
 * per caso condivide il prefisso.
 */
export function isRouteActive(pathname: string, itemPath: string): boolean {
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}
