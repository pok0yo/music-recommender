import { type PresentationProps, WorkspaceEmpty } from '../../components/presentation';
export default function Gatefold(p: PresentationProps) {
  return <div className={`disc-study gatefold ${p.opening ? 'is-opening' : 'is-working'}`} data-layout="gatefold">
    <div className="glass-shell"><div className="shell-body gatefold-pages">
      <div className="gatefold-cover">{p.heading}{p.search}{p.opening ? p.hero : p.seed}</div>
      <div className="gatefold-leaf">{p.opening ? p.starters : p.results || <WorkspaceEmpty />}</div>
    </div></div>
  </div>;
}
