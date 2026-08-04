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
    mark_deleted,
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
    _make_account(conn, instance_id)

    # Insert a non-deleted status
    status_id_1 = upsert_status(conn, instance_id, {
        "id": "s1", "account": {"id": "1", "acct": "alice", "username": "alice", "bot": False},
        "content": "ciao", "language": "it",
    })
    assert count_posts(conn) == 1

    # Insert another status and mark it deleted; count should still be 1
    status_id_2 = upsert_status(conn, instance_id, {
        "id": "s2", "account": {"id": "1", "acct": "alice", "username": "alice", "bot": False},
        "content": "arrivederci", "language": "it",
    })
    mark_deleted(conn, status_id_2)
    assert count_posts(conn) == 1


def test_count_follows_counts_all_rows(conn):
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    alice = _make_account(conn, instance_id, "1", "alice")
    bob = _make_account(conn, instance_id, "2", "bob")

    assert count_follows(conn) == 0
    insert_follow(conn, alice, bob)
    assert count_follows(conn) == 1


from webapp.queries import get_post, get_posts_by_ids, list_posts  # noqa: E402


def _make_status(conn, instance_id, mastodon_id, content, lang="en"):
    return upsert_status(conn, instance_id, {
        "id": mastodon_id,
        "account": {"id": f"acc-{mastodon_id}", "acct": f"user{mastodon_id}", "username": f"user{mastodon_id}", "bot": False},
        "content": content, "language": lang,
    })


def test_list_posts_filters_by_language(conn):
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    _make_status(conn, instance_id, "s1", "<p>hello</p>", lang="en")
    _make_status(conn, instance_id, "s2", "<p>ciao</p>", lang="it")

    en_posts = list_posts(conn, langs=["en"], offset=0, limit=10)

    assert len(en_posts) == 1
    assert en_posts[0]["content"] == "hello"  # HTML gia' ripulito
    assert en_posts[0]["acct"] == "users1"
    assert en_posts[0]["domain"] == "mastodon.social"


def test_list_posts_filters_by_multiple_languages(conn):
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    _make_status(conn, instance_id, "s1", "<p>hello</p>", lang="en")
    _make_status(conn, instance_id, "s2", "<p>ciao</p>", lang="it")
    _make_status(conn, instance_id, "s3", "<p>bonjour</p>", lang="fr")

    posts = list_posts(conn, langs=["en", "it"], offset=0, limit=10)

    assert {p["language"] for p in posts} == {"en", "it"}


def test_list_posts_no_filter_returns_all(conn):
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    _make_status(conn, instance_id, "s1", "<p>hello</p>", lang="en")
    _make_status(conn, instance_id, "s2", "<p>ciao</p>", lang="it")

    assert len(list_posts(conn, langs=None, offset=0, limit=10)) == 2


def test_list_posts_respects_offset_and_limit(conn):
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    for i in range(5):
        _make_status(conn, instance_id, f"s{i}", f"<p>post {i}</p>")

    page = list_posts(conn, langs=None, offset=2, limit=2)

    assert len(page) == 2


from webapp.queries import distinct_languages  # noqa: E402


def test_distinct_languages_returns_sorted_unique_non_null(conn):
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    _make_status(conn, instance_id, "s1", "<p>a</p>", lang="it")
    _make_status(conn, instance_id, "s2", "<p>b</p>", lang="en")
    _make_status(conn, instance_id, "s3", "<p>c</p>", lang="it")
    _make_status(conn, instance_id, "s4", "<p>d</p>", lang=None)

    assert distinct_languages(conn) == ["en", "it"]


def test_distinct_languages_excludes_deleted_posts(conn):
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    status_json = {
        "id": "999", "content": "<p>x</p>", "language": "fr",
        "account": {"id": "1", "acct": "u", "username": "u", "bot": False},
    }
    status_id = upsert_status(conn, instance_id, status_json)
    mark_deleted(conn, status_id)

    assert "fr" not in distinct_languages(conn)


def test_get_post_returns_single_post_with_account_info(conn):
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    status_id = _make_status(conn, instance_id, "s1", "<p>hello</p>")

    post = get_post(conn, status_id)

    assert post["content"] == "hello"
    assert post["acct"] == "users1"
    assert post["domain"] == "mastodon.social"


def test_get_post_returns_none_for_unknown_id(conn):
    assert get_post(conn, 999999) is None


def test_get_posts_by_ids_returns_dict_keyed_by_id(conn):
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    s1 = _make_status(conn, instance_id, "s1", "<p>hello</p>")
    s2 = _make_status(conn, instance_id, "s2", "<p>world</p>")

    posts = get_posts_by_ids(conn, [s1, s2, 999999])

    assert set(posts) == {s1, s2}
    assert posts[s1]["content"] == "hello"


from webapp.queries import (  # noqa: E402
    count_accounts_by_bot,
    get_account_bot_flags,
    get_account_ids_for_statuses,
)


def test_count_accounts_by_bot_splits_correctly(conn):
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    upsert_account(conn, instance_id, {"id": "1", "acct": "alice", "username": "alice", "bot": False})
    upsert_account(conn, instance_id, {"id": "2", "acct": "bobbot", "username": "bobbot", "bot": True})

    counts = count_accounts_by_bot(conn)

    assert counts[False] == 1
    assert counts[True] == 1


def test_get_account_ids_for_statuses_maps_status_to_account(conn):
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    status_id = upsert_status(conn, instance_id, {
        "id": "s1", "account": {"id": "1", "acct": "alice", "username": "alice", "bot": False},
        "content": "hello", "language": "en",
    })

    mapping = get_account_ids_for_statuses(conn, [status_id])

    assert list(mapping.keys()) == [status_id]


def test_get_account_ids_for_statuses_excludes_deleted(conn):
    """A deleted post must not map to an account, so its AI score can't poison
    the account's average on /accounts (same filter as count_posts)."""
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    status_id = upsert_status(conn, instance_id, {
        "id": "s1", "account": {"id": "1", "acct": "alice", "username": "alice", "bot": False},
        "content": "hello", "language": "en",
    })
    mark_deleted(conn, status_id)

    mapping = get_account_ids_for_statuses(conn, [status_id])

    assert mapping == {}


def test_get_account_bot_flags_returns_flags_for_given_ids(conn):
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    account_id = upsert_account(conn, instance_id, {"id": "1", "acct": "bobbot", "username": "bobbot", "bot": True})

    flags = get_account_bot_flags(conn, [account_id])

    assert flags[account_id] is True
