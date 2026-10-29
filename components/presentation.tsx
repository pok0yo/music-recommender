import type { ReactNode } from 'react';
export type PresentationProps = {
  opening: boolean; heading: ReactNode; search: ReactNode; starters: ReactNode;
  hero: ReactNode; seed: ReactNode; results: ReactNode; inspector?: ReactNode;
  pickerOpen?: boolean;
  retainHero?: boolean;
};
export function WorkspaceEmpty() {
  return <div className="workspace-empty"><p>Your connections will appear here.</p><p>Choose a matching song to explore the listening connections in this catalog.</p></div>;
}
