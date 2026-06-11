import pytest
from unittest.mock import MagicMock
from scraper.apify import scrape_indeed, scrape_linkedin


@pytest.fixture
def mock_apify_client(mocker):
    """Mocks the ApifyClient and its chained method calls."""
    # We patch the _get_client function to return our MagicMock
    mock_client = MagicMock()
    mocker.patch("scraper.apify._get_client", return_value=mock_client)
    return mock_client


def test_scrape_indeed(mock_apify_client, mocker):
    """Tests that scrape_indeed correctly calls the ApifyClient and normalizes the output list."""
    # We only want to test the loop once, so mock the constants
    mocker.patch("scraper.apify.INDEED_COUNTRIES", ["US"])
    mocker.patch("scraper.apify.SEARCH_KEYWORDS", ["Developer"])

    # Setup the mock dataset items that will be returned
    mock_run = MagicMock()
    mock_run.default_dataset_id = "test-dataset-id"

    # Mock the client.actor(...).call() -> mock_run
    mock_apify_client.actor.return_value.call.return_value = mock_run

    # Mock the client.dataset(...).iterate_items() -> List of dicts
    mock_apify_client.dataset.return_value.iterate_items.return_value = [
        {"jobUrl": "https://indeed.com/job/1", "title": "React Dev"},
        {"jobUrl": "https://indeed.com/job/2", "title": "Node Dev"},
        {"jobUrl": "https://indeed.com/job/1", "title": "React Dev Duplicate"},
    ]

    results = scrape_indeed()

    # Verify calls
    mock_apify_client.actor.assert_called_with("borderline/indeed-scraper")
    assert mock_apify_client.actor.called
    mock_apify_client.dataset.assert_called_with("test-dataset-id")

    # Verify results logic (deduplication & _source tag)
    assert len(results) == 2  # 3 items, but 1 duplicate jobUrl
    assert results[0]["_source"] == "indeed"
    assert results[0]["jobUrl"] == "https://indeed.com/job/1"
    assert results[1]["jobUrl"] == "https://indeed.com/job/2"


def test_scrape_linkedin(mock_apify_client, mocker):
    """Tests that scrape_linkedin correctly calls the ApifyClient and deduplicates jobs."""
    mocker.patch("scraper.apify.LINKEDIN_SEARCH_URLS", ["https://linkedin.com/search"])

    mock_run = MagicMock()
    mock_run.default_dataset_id = "linkedin-dataset"
    mock_apify_client.actor.return_value.call.return_value = mock_run

    mock_apify_client.dataset.return_value.iterate_items.return_value = [
        {"link": "https://linkedin.com/job/10", "title": "Frontend Engineer"},
        {"link": "https://linkedin.com/job/10", "title": "Duplicate URL"},
        {"title": "No URL Job"},
    ]

    results = scrape_linkedin()

    assert mock_apify_client.actor.called
    assert mock_apify_client.dataset.assert_called_with("linkedin-dataset") is None

    assert len(results) == 2  # One unique with URL, one without URL
    assert results[0]["_source"] == "linkedin"
    assert results[0]["link"] == "https://linkedin.com/job/10"
    assert results[1]["title"] == "No URL Job"
