import { type PresentationProps, WorkspaceEmpty } from '../components/presentation';
export default function CapsuleCurrent(p: PresentationProps) {
  return <div className={`glass-shell track-ledger ${p.opening ? 'is-opening' : 'is-working'}`} data-layout="track-ledger"><div className="shell-body">
    <div className="ledger-command">{p.heading}{p.search}</div>
    {p.opening ? <div className="ledger-entry">{p.starters}{p.hero}</div> : <>{p.seed}{p.results || <WorkspaceEmpty />}</>}
  </div></div>;
}
