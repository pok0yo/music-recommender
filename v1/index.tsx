import { type PresentationProps, WorkspaceEmpty } from '../components/presentation';
export default function BlueHorizon(p: PresentationProps) {
  return <div className="glass-shell split-console" data-layout="split-console"><div className={`shell-body console-grid ${p.opening ? 'is-opening' : 'is-working'}`}>
    <div className="console-task">{p.heading}{p.search}{p.opening ? p.starters : p.seed}</div>
    <div className="console-display">{p.opening ? p.hero : p.results || <WorkspaceEmpty />}</div>
  </div></div>;
}
