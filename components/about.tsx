const sections = [
  { id: 'method', title: 'What the model uses', body: 'Item-based collaborative filtering ranks connections using shared training listeners, cosine normalization, and support shrinkage. It uses no audio features, mood analysis, or personal listening profile.' },
  { id: 'catalog', title: 'A limited catalog, clearly marked', body: 'Search covers a verified catalog of model-supported recordings. Some songs, versions and result metadata are unavailable. Short lists remain short, and omitted metadata is disclosed. Listen opens an external music service: checked recording links are used where available, and other destinations are clearly labeled searches.' },
  { id: 'evidence', title: 'Evidence, not a promise', body: 'On the frozen retrospective test, the selected model measured NDCG@10 of 0.218345 versus 0.021665 for popularity across 7,848 scorable queries. Only 67.79% of constructed queries were scorable, and 49.26% of scorable model queries had no observed target in the top ten. Future listening overlap is a limited proxy, not a guarantee of enjoyment.' },
  { id: 'privacy', title: 'Data and privacy', body: 'Recording identity and display metadata come from MusicBrainz. Listening connections come from the audited ListenBrainz extract, using training data before August 1, 2026. Listener identities and histories are not exposed by this interface. No account is required. Optional recommendation feedback stays on this device and does not retrain the model.' },
];
export function About({ variant }: { variant: number }) {
  return <article className="about-preview" data-about-layout={variant}><div className="about-intro"><h1>Connections, with context.</h1>
    <p className="about-lead">Start with a song you know. Explore tracks connected by shared listening in a limited, documented dataset.</p></div>
    {(variant === 3 || variant === 5) && <nav className="about-index" aria-label="On this page">{sections.map(section => <a key={section.id} href={'#' + section.id}>{section.title}</a>)}</nav>}
    <div className="glass-shell about-shell"><div className="shell-body about-sections">{sections.map((section, index) => variant === 2
      ? <details className="method-section" id={section.id} key={section.id} open={index === 0}><summary><h2>{section.title}</h2></summary><p>{section.body}</p></details>
      : <section className="method-section" id={section.id} key={section.id} aria-labelledby={section.id + '-heading'}><h2 id={section.id + '-heading'}>{section.title}</h2><p>{section.body}</p></section>)}</div></div>
    <p className="about-boundary">Recommendations describe connections in shared listening data. They do not predict how much you will enjoy a song.</p>
  </article>;
}
