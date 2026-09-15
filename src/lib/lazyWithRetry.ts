import { lazy, type ComponentType } from "react";

/**
 * React.lazy defensivo.
 *
 * Após um novo deploy, os arquivos JS antigos deixam de existir no servidor.
 * O navegador que ainda tem a versão anterior em cache tenta buscar um chunk
 * inexistente e falha com "Failed to fetch dynamically imported module",
 * resultando em tela branca.
 *
 * Estratégia:
 * 1. Tenta importar normalmente.
 * 2. Em caso de falha, faz UMA recarga forçada da página (marcada em
 *    sessionStorage) para baixar o manifesto novo.
 * 3. Se já houve recarga, propaga o erro para o Error Boundary.
 */
export function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
  key: string
) {
  return lazy(async () => {
    const storageKey = `chunk-reload:${key}`;

    try {
      const mod = await factory();
      try {
        sessionStorage.removeItem(storageKey);
      } catch {
        /* sessionStorage indisponível (modo privado) — ignorar */
      }
      return mod;
    } catch (error) {
      let alreadyReloaded = true;
      try {
        alreadyReloaded = sessionStorage.getItem(storageKey) === "1";
        if (!alreadyReloaded) sessionStorage.setItem(storageKey, "1");
      } catch {
        alreadyReloaded = true;
      }

      if (!alreadyReloaded) {
        window.location.reload();
        // Promise pendente: evita renderizar erro enquanto a página recarrega.
        return new Promise<{ default: T }>(() => {});
      }

      throw error;
    }
  });
}
