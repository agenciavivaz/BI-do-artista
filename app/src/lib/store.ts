/** localStorage seguro: nunca quebra a tela se estiver bloqueado (janela anônima etc.). */
export function lerJSON<T>(chave: string, padrao: T): T {
  try {
    const bruto = window.localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : padrao;
  } catch {
    return padrao;
  }
}
export function gravarJSON(chave: string, valor: unknown): void {
  try {
    window.localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* sem armazenamento: segue sem salvar */
  }
}
