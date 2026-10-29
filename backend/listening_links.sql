CREATE TABLE IF NOT EXISTS music_catalog.link_releases (
    version text PRIMARY KEY,
    catalog_version text NOT NULL REFERENCES music_catalog.releases(version),
    content_sha256 text NOT NULL CHECK (length(content_sha256)=64),
    link_count integer NOT NULL CHECK (link_count>=0)
);
CREATE TABLE IF NOT EXISTS music_catalog.recording_links (
    version text NOT NULL REFERENCES music_catalog.link_releases(version),
    recording_id uuid NOT NULL,
    canonical_recording_id uuid NOT NULL,
    provider text NOT NULL CHECK (provider IN ('spotify','apple_music','youtube_music')),
    payload jsonb NOT NULL,
    PRIMARY KEY(version,recording_id,provider)
);
ALTER TABLE music_catalog.link_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_catalog.recording_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reader_select ON music_catalog.link_releases;
CREATE POLICY reader_select ON music_catalog.link_releases FOR SELECT TO music_reader USING(true);
DROP POLICY IF EXISTS reader_select ON music_catalog.recording_links;
CREATE POLICY reader_select ON music_catalog.recording_links FOR SELECT TO music_reader USING(true);
REVOKE ALL ON music_catalog.link_releases,music_catalog.recording_links FROM PUBLIC;
GRANT SELECT ON music_catalog.link_releases,music_catalog.recording_links TO music_reader;
