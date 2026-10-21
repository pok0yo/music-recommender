import { type PresentationProps, WorkspaceEmpty } from '../../components/presentation';
export default function DiscTray(p: PresentationProps) {
  return <div className={`disc-study disc-tray ${p.opening ? 'is-opening' : 'is-working'}`} data-layout="disc-tray">
    <div className="glass-shell"><div className="shell-body tray-upper"><div className="tray-command">{p.heading}{p.search}</div>
      {p.opening && p.hero}</div></div>
    <div className="glass-shell tray-drawer"><div className="shell-body">{p.opening ? p.starters : <>{p.seed}{p.results || <WorkspaceEmpty />}</>}</div></div>
  </div>;
}
