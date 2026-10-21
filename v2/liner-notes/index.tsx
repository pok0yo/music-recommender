import { type PresentationProps, WorkspaceEmpty } from '../../components/presentation';
export default function LinerNotes(p: PresentationProps) {
  return <div className={`disc-study liner-notes ${p.opening ? 'is-opening' : 'is-working'}`} data-layout="liner-notes">
    <div className="liner-heading">{p.heading}{p.search}</div>
    <div className="glass-shell"><div className="shell-body liner-body">
      {p.opening ? <><div className="liner-choices">{p.starters}</div>{p.hero}</> : <>{p.seed}{p.results || <WorkspaceEmpty />}</>}
    </div></div>
  </div>;
}
