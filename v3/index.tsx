import { type PresentationProps, WorkspaceEmpty } from '../components/presentation';
export default function PearlOrbit(p: PresentationProps) {
  return <div className={`catalog-workbench ${p.opening ? 'is-opening' : 'is-working'}`} data-layout="catalog-workbench">
    {p.heading}<div className="workbench-grid">
      <div className="glass-shell catalog-dock"><div className="shell-body">{p.search}{p.starters}</div></div>
      <div className="glass-shell catalog-display"><div className="shell-body">{p.opening ? p.hero : <>{p.seed}{p.results || <WorkspaceEmpty />}</>}</div></div>
    </div>
  </div>;
}
