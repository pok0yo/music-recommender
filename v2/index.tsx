import { type PresentationProps, WorkspaceEmpty } from '../components/presentation';
export default function DiscStudy(p: PresentationProps) {
  return <div className="guided-sequence" data-layout="guided-sequence">
    <ol className="journey" aria-label="Discovery progress"><li aria-current={!p.seed ? 'step' : undefined}><span>1</span>Choose a song</li><li aria-current={p.seed ? 'step' : undefined}><span>2</span>Explore connections</li></ol>
    <div className="glass-shell"><div className={`shell-body sequence-body ${p.opening ? 'is-opening' : 'is-working'}`}>
      <div className="sequence-task">{p.heading}{p.search}</div>
      {p.opening ? <div className="sequence-entry">{p.starters}{p.hero}</div> : <div className="sequence-results">{p.seed}{p.results || <WorkspaceEmpty />}</div>}
    </div></div>
  </div>;
}
