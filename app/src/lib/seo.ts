import { useEffect } from 'react';

export const SITE_URL = 'https://mtg-graph.com';
export const SITE_NAME = 'MTG Graph';

export function useDocumentMeta(title: string, description?: string): void {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = title;

    const metaDescription = description
      ? document.querySelector<HTMLMetaElement>('meta[name="description"]')
      : null;
    const previousDescription = metaDescription?.getAttribute('content') ?? null;
    if (metaDescription && description !== undefined) {
      metaDescription.setAttribute('content', description);
    }

    return () => {
      document.title = previousTitle;
      if (metaDescription && previousDescription !== null) {
        metaDescription.setAttribute('content', previousDescription);
      }
    };
  }, [title, description]);
}
