#!/usr/bin/env python3
"""
Functional tests for search_club_website.py
"""

import pytest
from api.search_club_website import search_club_website


def test_search_panama_dive_center():
    """Test that searching for 'panama divers santa catalina' returns the correct website."""
    result = search_club_website("panama divers santa catalina")

    assert result["success"] is True
    assert result["url"] == "https://panamadivecenter.com/"
    assert result["query"] == "panama divers santa catalina"


if __name__ == "__main__":
    pytest.main([__file__])