"""The documented five-client load must not be rejected by a four-slot query guard."""
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from threading import Barrier, Event
import unittest
from unittest.mock import MagicMock, patch

import psycopg
from backend.catalog import Catalog


class CatalogConcurrencyTests(unittest.TestCase):
    def test_five_queries_are_admitted_and_excess_load_is_still_bounded(self):
        catalog = Catalog('unused', {})
        entered, release = Barrier(6), Event()
        cursor = MagicMock(); cursor.fetchall.return_value = []
        database = MagicMock()

        def execute(*args):
            entered.wait(timeout=5)
            if not release.wait(timeout=5):
                raise TimeoutError('Test did not release the queries')
            return cursor

        database.execute.side_effect = execute

        @contextmanager
        def connect(*args, **kwargs):
            yield database

        with patch('backend.catalog.psycopg.connect', connect), ThreadPoolExecutor(max_workers=5) as pool:
            queries = [pool.submit(catalog.query, 'SELECT 1') for _ in range(5)]
            try:
                entered.wait(timeout=5)
                with self.assertRaises(psycopg.OperationalError):
                    catalog.query('SELECT 1')
            finally:
                release.set()
            self.assertEqual([query.result() for query in queries], [[]] * 5)
