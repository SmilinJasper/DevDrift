import pytest
from unittest.mock import MagicMock, call
from scraper.db import sync_listings, get_system_crawler_profile_id


@pytest.fixture
def mock_supabase(mocker):
    """Mocks the Supabase Client."""
    return MagicMock()


def test_get_system_crawler_profile_id_existing(mock_supabase):
    """Tests that if the profile exists, its ID is returned without creating a new user."""
    # Mock the return value of supabase.table("profiles").select(...).eq(...).execute()
    mock_execute = MagicMock()
    mock_execute.data = [{"id": "existing-uuid-1234"}]
    
    mock_eq = MagicMock()
    mock_eq.execute.return_value = mock_execute
    
    mock_select = MagicMock()
    mock_select.eq.return_value = mock_eq
    
    mock_supabase.table.return_value.select.return_value = mock_select
    
    result = get_system_crawler_profile_id(mock_supabase)
    
    assert result == "existing-uuid-1234"
    # Ensure auth.admin.create_user was NOT called
    assert not mock_supabase.auth.admin.create_user.called


def test_sync_listings_insert_and_update_and_delete(mock_supabase):
    """Tests that sync_listings correctly identifies new, updated, and deleted listings."""
    # Mock existing listings in the DB
    mock_existing_execute = MagicMock()
    mock_existing_execute.data = [
        {"id": "uuid-1", "application_url": "https://url.com/1"},  # Will be updated
        {"id": "uuid-2", "application_url": "https://url.com/2"},  # Will be deleted
    ]
    
    # Setup for pagination: first call returns 2 items, second call returns []
    mock_range = MagicMock()
    mock_range.execute.side_effect = [
        mock_existing_execute,
        MagicMock(data=[])
    ]
    
    mock_supabase.table.return_value.select.return_value.range.return_value = mock_range
    
    # Mock listings to sync
    normalized_listings = [
        {"title": "Updated Job", "application_url": "https://url.com/1"}, # Match existing (uuid-1)
        {"title": "New Job", "application_url": "https://url.com/3"},     # New
    ]
    
    crawler_profile_id = "crawler-uuid"
    
    # Run sync
    sync_listings(mock_supabase, normalized_listings, crawler_profile_id)
    
    # Verifications
    
    # 1. Check Update
    # supabase.table("listings").update({...}).eq("id", "uuid-1").execute()
    mock_supabase.table.return_value.update.assert_called_once_with(
        {"title": "Updated Job", "application_url": "https://url.com/1", "created_by": crawler_profile_id}
    )
    mock_supabase.table.return_value.update.return_value.eq.assert_called_once_with("id", "uuid-1")
    assert mock_supabase.table.return_value.update.return_value.eq.return_value.execute.called
    
    # 2. Check Insert
    # supabase.table("listings").insert({...}).execute()
    mock_supabase.table.return_value.insert.assert_called_once_with(
        {"title": "New Job", "application_url": "https://url.com/3", "created_by": crawler_profile_id}
    )
    assert mock_supabase.table.return_value.insert.return_value.execute.called
    
    # 3. Check Delete
    # uuid-2 was not in normalized_listings, so it should be deleted
    # supabase.table("listings").delete().in_("id", ["uuid-2"]).execute()
    assert mock_supabase.table.return_value.delete.called
    mock_supabase.table.return_value.delete.return_value.in_.assert_called_once_with("id", ["uuid-2"])
    assert mock_supabase.table.return_value.delete.return_value.in_.return_value.execute.called
