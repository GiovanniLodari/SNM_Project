/**
 * Decide se una voce di menu corrisponde al percorso corrente.
 *
 * Il confronto e' esatto oppure su un sottopercorso completo. Con un semplice
 * `startsWith`, una voce restava accesa insieme a ogni fratello che ne
 * condividesse il prefisso: quando i quattro rilevatori avevano una rotta
 * ciascuno ("/ai-detection", "/ai-detection-binoculars", ...), aprendone uno
 * qualsiasi teneva evidenziata anche la prima voce. Lo slash finale distingue
 * un figlio ("/posts/12") da un fratello che per caso condivide il prefisso.
 */
export function isRouteActive(pathname: string, itemPath: string): boolean {
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}
