CREATE SCHEMA IF NOT EXISTS music_catalog;
REVOKE ALL ON SCHEMA music_catalog FROM PUBLIC;
CREATE TABLE IF NOT EXISTS music_catalog.releases (
    version text PRIMARY KEY,
    model_manifest_sha256 text NOT NULL CHECK (length(model_manifest_sha256)=64),
    content_sha256 text NOT NULL CHECK (length(content_sha256)=64),
    recording_count integer NOT NULL CHECK (recording_count>0)
);
CREATE TABLE IF NOT EXISTS music_catalog.recordings (
    version text NOT NULL REFERENCES music_catalog.releases(version),
    recording_id uuid NOT NULL,
    payload jsonb NOT NULL,
    search_text text NOT NULL,
    starter boolean NOT NULL,
    PRIMARY KEY (version, recording_id)
);
ALTER TABLE music_catalog.releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_catalog.recordings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reader_select ON music_catalog.releases;
CREATE POLICY reader_select ON music_catalog.releases FOR SELECT TO music_reader USING (true);
DROP POLICY IF EXISTS reader_select ON music_catalog.recordings;
CREATE POLICY reader_select ON music_catalog.recordings FOR SELECT TO music_reader USING (true);
REVOKE ALL ON ALL TABLES IN SCHEMA music_catalog FROM PUBLIC;
GRANT USAGE ON SCHEMA music_catalog TO music_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA music_catalog TO music_reader;
REVOKE ALL ON DATABASE music_discovery FROM PUBLIC;
GRANT CONNECT ON DATABASE music_discovery TO music_reader;
