"""Start or stop this project's isolated loopback-only PostgreSQL cluster."""

import argparse
import json
from pathlib import Path
import secrets
import subprocess

import psycopg
from psycopg import sql

ROOT = Path("artifacts/local-postgres").resolve()


def run(action):
    binary = ROOT / "pgsql/bin"
    data = ROOT / "data"
    config = ROOT / "connections.json"
    if action == "stop":
        subprocess.run([str(binary / "pg_ctl.exe"), "-D", str(data), "stop", "-m", "fast"], check=True)
        return
    if not data.exists():
        admin, reader = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        password = ROOT / "admin-password.txt"
        password.write_text(admin, encoding="ascii")
        subprocess.run([str(binary / "initdb.exe"), "-D", str(data), "-U", "music_admin",
            "--auth=scram-sha-256", "--encoding=UTF8", "--locale=C", "--pwfile=" + str(password)], check=True)
        config.write_text(json.dumps(dict(
            admin=f"postgresql://music_admin:{admin}@127.0.0.1:55432/music_discovery",
            reader=f"postgresql://music_reader:{reader}@127.0.0.1:55432/music_discovery")), encoding="utf-8")
        with (data / "postgresql.conf").open("a", encoding="utf-8") as stream:
            stream.write("\nlisten_addresses = '127.0.0.1'\nport = 55432\nmax_connections = 12\n")
    settings = json.loads(config.read_text())
    status = subprocess.run([str(binary / "pg_ctl.exe"), "-D", str(data), "status"], capture_output=True)
    if status.returncode != 0:
        subprocess.run([str(binary / "pg_ctl.exe"), "-D", str(data), "-l", str(ROOT / "server.log"), "start"], check=True)
    admin_url = settings["admin"].rsplit("/", 1)[0] + "/postgres"
    with psycopg.connect(admin_url, autocommit=True, connect_timeout=3) as db:
        if not db.execute("SELECT 1 FROM pg_database WHERE datname='music_discovery'").fetchone():
            db.execute("CREATE DATABASE music_discovery")
        if not db.execute("SELECT 1 FROM pg_roles WHERE rolname='music_reader'").fetchone():
            password = settings["reader"].split(":", 2)[2].split("@", 1)[0]
            db.execute(sql.SQL("CREATE ROLE music_reader LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT PASSWORD {}").format(sql.Literal(password)))
    print("Project PostgreSQL ready on 127.0.0.1:55432; credentials remain in ignored local files.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("start", "stop"))
    run(parser.parse_args().action)
