import pytest
from unittest.mock import MagicMock
from scraper.weworkremotely import scrape_weworkremotely

def test_scrape_weworkremotely_success(mocker):
    mock_urlopen = mocker.patch('urllib.request.urlopen')
    
    mock_response = MagicMock()
    mock_response.read.return_value = b"""<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>We Work Remotely</title>
    <item>
      <title>Company: Backend Engineer</title>
      <link>https://weworkremotely.com/jobs/1</link>
      <description>Great job</description>
      <pubDate>Mon, 01 Jan 2026 00:00:00 +0000</pubDate>
      <category>Programming</category>
    </item>
  </channel>
</rss>
"""
    # urlopen returns a context manager, so mock __enter__
    mock_urlopen.return_value.__enter__.return_value = mock_response
    
    results = scrape_weworkremotely()
    
    assert len(results) == 1
    assert results[0]['title'] == "Company: Backend Engineer"
    assert results[0]['link'] == "https://weworkremotely.com/jobs/1"
    assert results[0]['category'] == "Programming"

def test_scrape_weworkremotely_network_error(mocker):
    mocker.patch('urllib.request.urlopen', side_effect=Exception("Network error"))
    
    results = scrape_weworkremotely()
    assert results == []
