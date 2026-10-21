import { type PresentationProps, WorkspaceEmpty } from '../components/presentation';
export default function CobaltSignal(p: PresentationProps) {
  return <div className={`signal-studio ${p.opening ? 'is-opening' : 'is-working'}`} data-layout="list-inspector">
    <div className="glass-shell"><div className="shell-body signal-command">{p.heading}{p.search}</div></div>
    {p.opening ? <><div className="glass-shell signal-panorama"><div className="shell-body">{p.hero}</div></div><div className="signal-starters">{p.starters}</div></>
      : <>{p.seed}<div className="signal-results"><div className="glass-shell"><div className="shell-body">{p.results || <WorkspaceEmpty />}</div></div>{p.inspector}</div></>}
  </div>;
}
