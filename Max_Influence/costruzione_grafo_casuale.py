import random

def genera_grafo_casuale(num_nodi, num_archi, peso_min=1.0, peso_max=10.0, file_output="grafo_casuale.txt", orientato=True):
    """
    Genera un grafo casuale e lo salva in un file nel formato 'source target weight'.
    
    Parameters:
    - num_nodi (int): Numero totale di nodi (es. da 1 a num_nodi).
    - num_archi (int): Numero totale di archi da generare.
    - peso_min (float): Valore minimo per il peso casuale.
    - peso_max (float): Valore massimo per il peso casuale.
    - file_output (str): Nome del file di destinazione.
    - orientato (bool): True se il grafo è diretto (source -> target), False altrimenti.
    """
    
    # Verifica il numero massimo teorico di archi ed evita loop infiniti
    max_archi = num_nodi * (num_nodi - 1) if orientato else (num_nodi * (num_nodi - 1)) // 2
    if num_archi > max_archi:
        raise ValueError(f"Impossibile creare {num_archi} archi senza duplicati per {num_nodi} nodi. Massimo consentito: {max_archi}.")

    archi_creati = set()
    
    with open(file_output, "w", encoding="utf-8") as f:
        # Intestazione opzionale (rimuovere il commento sotto se si desidera l'header nel file)
        # f.write("source target weight\n")
        
        count = 0
        while count < num_archi:
            u = random.randint(1, num_nodi)
            v = random.randint(1, num_nodi)
            
            # Evita self-loop (u == v)
            if u == v:
                continue
                
            coppia = (u, v) if orientato else tuple(sorted((u, v)))
            
            if coppia not in archi_creati:
                archi_creati.add(coppia)
                # Genera un peso casuale arrotondato a 4 cifre decimali
                weight = round(random.uniform(peso_min, peso_max), 4)
                
                # Scrittura su file nel formato: source target weight
                f.write(f"{u} {v} {weight}\n")
                count += 1

    print(f"Grafo salvato con successo in '{file_output}' ({num_nodi} nodi, {num_archi} archi).")

# ==========================================
# ESEMPIO DI UTILIZZO
# ==========================================
if __name__ == "__main__":
    N = 10    # Numero di nodi
    E = 20    # Numero di archi
    
    genera_grafo_casuale(
        num_nodi=N, 
        num_archi=E, 
        peso_min=0.1, 
        peso_max=1.0, 
        file_output="grafo_output.txt",
        orientato=True
    )