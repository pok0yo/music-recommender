import { type PresentationProps, WorkspaceEmpty } from '../../components/presentation';
export default function DiscTray(p: PresentationProps) {
  return <div className={`disc-study disc-tray ${p.opening ? 'is-opening' : 'is-working'}${p.pickerOpen ? ' is-picking' : ''}${p.retainHero ? ' has-disc-dock' : ''}`} data-layout="disc-tray">
    <div className={`glass-shell${p.retainHero && !p.opening ? ' cd-player-console' : ''}`}><div className="shell-body tray-upper"><div className="tray-command">{p.retainHero && !p.opening ? <><div className="sr-only">{p.heading}</div>{p.seed}</> : p.heading}{p.search}</div>
      {(p.opening || p.retainHero) && p.hero}</div></div>
    <div className="glass-shell tray-drawer"><div className="shell-body">{p.opening ? p.starters : <>{!p.retainHero && p.seed}{p.results || <WorkspaceEmpty />}</>}</div></div>
  </div>;
}
