import { useEffect, useRef } from "react";

/** Atualiza o título do documento e move o foco ao h1 da página a cada navegação. */
export function usePageHeading(title) {
  const headingRef = useRef(null);

  useEffect(() => {
    document.title = `${title} · Helpdesk TI`;
    headingRef.current?.focus();
  }, [title]);

  return headingRef;
}
