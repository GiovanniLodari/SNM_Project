import os

import pytest

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(
    not TEST_DATABASE_URL,
    reason="TEST_DATABASE_URL non impostata: test di integrazione webapp saltati",
)

from snm.storage.db import (  # noqa: E402
    get_connection,
    init_schema,
    insert_follow,
    upsert_account,
    upsert_instance,
    upsert_status,
    upsert_topic,
)
from webapp.queries import count_follows, count_posts  # noqa: E402


@pytest.fixture
def conn():
    connection = get_connection(TEST_DATABASE_URL)
    init_schema(connection)
    yield connection
    with connection.cursor() as cur:
        cur.execute("TRUNCATE topics, instances CASCADE")
    connection.commit()
    connection.close()


def _make_account(conn, instance_id, mastodon_id="1", acct="alice"):
    return upsert_account(conn, instance_id, {
        "id": mastodon_id, "acct": acct, "username": acct, "bot": False,
    })


def test_count_posts_counts_non_deleted_statuses(conn):
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    account_id = _make_account(conn, instance_id)
    upsert_status(conn, instance_id, {
        "id": "s1", "account": {"id": "1", "acct": "alice", "username": "alice", "bot": False},
        "content": "ciao", "language": "it",
    })

    assert count_posts(conn) == 1


def test_count_follows_counts_all_rows(conn):
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    alice = _make_account(conn, instance_id, "1", "alice")
    bob = _make_account(conn, instance_id, "2", "bob")

    assert count_follows(conn) == 0
    insert_follow(conn, alice, bob)
    assert count_follows(conn) == 1
