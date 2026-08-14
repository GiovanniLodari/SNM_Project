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


from webapp.queries import (  # noqa: E402
    accounts_population,
    corpus_composition,
    count_posts_by_bot,
    count_posts_matching,
    get_accounts_by_ids,
)


def _status_by(conn, instance_id, mastodon_id, content, account, lang="en"):
    """Post attribuito a un account specifico, per i test che distinguono bot e
    umani (i corrispondenti in `_make_status` sono tutti umani e tutti diversi)."""
    return upsert_status(conn, instance_id, {
        "id": mastodon_id, "account": account, "content": content, "language": lang,
    })


_ALICE = {"id": "1", "acct": "alice", "username": "alice", "bot": False}
_BOBBOT = {"id": "2", "acct": "bobbot", "username": "bobbot", "bot": True}


def test_count_posts_matching_applies_the_same_filters_as_the_listing(conn):
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    _status_by(conn, instance_id, "s1", "<p>hello world</p>", _ALICE, lang="en")
    _status_by(conn, instance_id, "s2", "<p>ciao mondo</p>", _ALICE, lang="it")
    _status_by(conn, instance_id, "s3", "<p>hello robot</p>", _BOBBOT, lang="en")

    assert count_posts_matching(conn, langs=None) == 3
    assert count_posts_matching(conn, langs=["en"]) == 2
    assert count_posts_matching(conn, langs=None, search="hello") == 2
    assert count_posts_matching(conn, langs=None, author="bot") == 1
    assert count_posts_matching(conn, langs=["en"], search="hello", author="umani") == 1


def test_count_posts_matching_treats_like_metacharacters_literally(conn):
    """Cercare "100%" non deve corrispondere a qualunque testo: senza escape il
    carattere jolly di LIKE arriverebbe intatto alla query."""
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    _status_by(conn, instance_id, "s1", "<p>sicuro al 100% </p>", _ALICE)
    _status_by(conn, instance_id, "s2", "<p>nessuna percentuale</p>", _ALICE)

    assert count_posts_matching(conn, langs=None, search="100%") == 1
    # Il jolly e' letterale: cercare "%" trova il solo post che contiene quel
    # carattere, non tutti come farebbe un LIKE non protetto.
    assert count_posts_matching(conn, langs=None, search="%") == 1


def test_list_posts_orders_by_the_requested_criterion(conn):
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    primo = _status_by(conn, instance_id, "s1", "<p>uno</p>", _ALICE)
    secondo = _status_by(conn, instance_id, "s2", "<p>due</p>", _ALICE)

    archivio = [p["id"] for p in list_posts(conn, None, 0, 10, order="archivio")]
    ignoto = [p["id"] for p in list_posts(conn, None, 0, 10, order="ordinamento-inesistente")]

    assert archivio == [primo, secondo]
    # Un ordinamento sconosciuto ricade sul default invece di raggiungere l'SQL.
    assert ignoto == archivio


def test_list_posts_filters_by_author_type(conn):
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    _status_by(conn, instance_id, "s1", "<p>umano</p>", _ALICE)
    _status_by(conn, instance_id, "s2", "<p>automatico</p>", _BOBBOT)

    soli_bot = list_posts(conn, None, 0, 10, author="bot")

    assert [p["acct"] for p in soli_bot] == ["bobbot"]


def test_count_posts_by_bot_splits_posts_not_accounts(conn):
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    _status_by(conn, instance_id, "s1", "<p>a</p>", _BOBBOT)
    _status_by(conn, instance_id, "s2", "<p>b</p>", _BOBBOT)
    _status_by(conn, instance_id, "s3", "<p>c</p>", _ALICE)

    counts = count_posts_by_bot(conn)

    assert counts[True] == 2
    assert counts[False] == 1


def test_corpus_composition_reports_volumes_languages_and_instances(conn):
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    altra = upsert_instance(conn, "fosstodon.org", 50, topic_id)
    _status_by(conn, instance_id, "s1", "<p>a</p>", _ALICE, lang="it")
    _status_by(conn, instance_id, "s2", "<p>b</p>", _BOBBOT, lang="it")
    _status_by(conn, altra, "s3", "<p>c</p>", _ALICE, lang="en")

    composizione = corpus_composition(conn)

    assert composizione["posts_total"] == 3
    assert composizione["instances_total"] == 2
    assert composizione["posts_bot"] == 1
    assert composizione["posts_human"] == 2
    assert composizione["lingue"][0] == {"lang": "it", "posts": 2}
    domini = {voce["domain"]: voce for voce in composizione["istanze"]}
    assert domini["mastodon.social"]["posts"] == 2
    assert domini["mastodon.social"]["bot_posts"] == 1


def test_corpus_composition_excludes_deleted_posts(conn):
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    _status_by(conn, instance_id, "s1", "<p>a</p>", _ALICE)
    cancellato = _status_by(conn, instance_id, "s2", "<p>b</p>", _ALICE)
    mark_deleted(conn, cancellato)

    assert corpus_composition(conn)["posts_total"] == 1


def test_accounts_population_counts_accounts_per_instance(conn):
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    upsert_account(conn, instance_id, _ALICE)
    upsert_account(conn, instance_id, _BOBBOT)

    popolazione = accounts_population(conn)

    assert popolazione["istanze"][0]["domain"] == "mastodon.social"
    assert popolazione["istanze"][0]["accounts"] == 2
    assert popolazione["istanze"][0]["bot_accounts"] == 1
    assert popolazione["accounts_con_post"] == 0


def test_accounts_population_ignores_non_numeric_follower_counts(conn):
    """`accounts.raw` e' JSONB non validato: un contatore mancante o testuale non
    deve far fallire la query, semplicemente non entra nella statistica."""
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    upsert_account(conn, instance_id, {**_ALICE, "followers_count": 120})
    upsert_account(conn, instance_id, {**_BOBBOT, "followers_count": "molti"})
    upsert_account(conn, instance_id, {"id": "3", "acct": "carol", "username": "carol", "bot": False})

    popolazione = accounts_population(conn)

    assert popolazione["followers_human"]["accounts"] == 1
    assert popolazione["followers_human"]["massimo"] == 120
    assert popolazione["followers_bot"]["accounts"] == 0
    assert [voce["acct"] for voce in popolazione["piu_seguiti"]] == ["alice"]


def test_accounts_population_discards_impossible_follower_counts(conn):
    """Nei dati reali compaiono profili che dichiarano miliardi di follower e
    altri fermi a 2147483647, il massimo di un intero a 32 bit: sono guasti del
    dato remoto, e in classifica scavalcherebbero ogni account vero."""
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    upsert_account(conn, instance_id, {**_ALICE, "followers_count": 5000})
    upsert_account(conn, instance_id, {
        "id": "9", "acct": "impossibile", "username": "impossibile", "bot": False,
        "followers_count": 8116613856,
    })

    popolazione = accounts_population(conn)

    assert popolazione["followers_human"]["accounts"] == 1
    assert popolazione["followers_human"]["massimo"] == 5000
    # Scartato, non nascosto: la pagina lo dichiara.
    assert popolazione["followers_human"]["scartati"] == 1
    assert [voce["acct"] for voce in popolazione["piu_seguiti"]] == ["alice"]


def test_accounts_population_lists_each_handle_once(conn):
    """Lo stesso profilo remoto viene archiviato una volta per ogni istanza da
    cui il crawler lo incontra: in classifica deve comparire una volta sola."""
    topic_id = upsert_topic(conn, "ai")
    prima = upsert_instance(conn, "mastodon.social", 100, topic_id)
    seconda = upsert_instance(conn, "fosstodon.org", 50, topic_id)
    doppione = {"id": "5", "acct": "nhl@sportsbots.xyz", "username": "nhl", "bot": True}
    upsert_account(conn, prima, {**doppione, "followers_count": 900})
    upsert_account(conn, seconda, {**doppione, "followers_count": 900})
    upsert_account(conn, prima, {**_ALICE, "followers_count": 100})

    piu_seguiti = accounts_population(conn)["piu_seguiti"]

    assert [voce["acct"] for voce in piu_seguiti] == ["nhl@sportsbots.xyz", "alice"]


def test_get_accounts_by_ids_omits_implausible_followers(conn):
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    account_id = upsert_account(conn, instance_id, {**_ALICE, "followers_count": 2147483647})

    anagrafica = get_accounts_by_ids(conn, [account_id])

    # None e non il numero: il profilo esiste, il suo contatore no.
    assert anagrafica[account_id]["followers"] is None


def test_get_accounts_by_ids_returns_profile_and_post_count(conn):
    topic_id = upsert_topic(conn, "ai")
    instance_id = upsert_instance(conn, "mastodon.social", 100, topic_id)
    # Il profilo con i follower va passato anche allo status: `upsert_status`
    # riscrive `accounts.raw` con l'oggetto account che trova nel post, quindi
    # inserirlo dopo cancellerebbe il contatore appena scritto.
    alice = {**_ALICE, "followers_count": 7}
    account_id = upsert_account(conn, instance_id, alice)
    _status_by(conn, instance_id, "s1", "<p>a</p>", alice)

    anagrafica = get_accounts_by_ids(conn, [account_id])

    assert anagrafica[account_id]["acct"] == "alice"
    assert anagrafica[account_id]["domain"] == "mastodon.social"
    assert anagrafica[account_id]["followers"] == 7
    assert anagrafica[account_id]["posts"] == 1


def test_get_accounts_by_ids_returns_empty_for_no_ids(conn):
    assert get_accounts_by_ids(conn, []) == {}
