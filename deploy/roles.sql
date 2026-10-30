-- Run as the operator in a new, dedicated project. Set the password privately with psql's \password.
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='music_reader') THEN
        CREATE ROLE music_reader LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
    ELSIF EXISTS (SELECT FROM pg_roles WHERE rolname='music_reader'
        AND (rolsuper OR rolcreatedb OR rolcreaterole OR rolinherit OR rolbypassrls))
        OR EXISTS (SELECT FROM pg_auth_members m JOIN pg_roles r ON r.oid=m.member WHERE r.rolname='music_reader') THEN
        RAISE EXCEPTION 'Existing reader role has unexpected privileges';
    END IF;
END $$;
