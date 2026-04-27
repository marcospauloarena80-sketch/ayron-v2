import re
import pytest
from playwright.sync_api import sync_playwright, Browser, Page, BrowserContext

BASE_URL = "http://localhost:3000"
API_URL  = "http://localhost:4000/api/v1"
EMAIL    = "master@ayron.health"
PASSWORD = "Ayron@Master2025!"

@pytest.fixture(scope="session")
def browser_instance():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        yield browser
        browser.close()

@pytest.fixture(scope="function")
def page(browser_instance: Browser):
    context = browser_instance.new_context(
        viewport={"width": 1280, "height": 800},
        ignore_https_errors=True,
    )
    context.set_default_timeout(15000)
    pg = context.new_page()
    yield pg
    pg.close()
    context.close()

@pytest.fixture(scope="function")
def auth_page(browser_instance: Browser):
    """Page already logged in via browser UI (sets both cookie + localStorage)."""
    context = browser_instance.new_context(
        viewport={"width": 1280, "height": 800},
        ignore_https_errors=True,
    )
    context.set_default_timeout(20000)
    pg = context.new_page()

    # Perform real UI login so that both cookie and localStorage are set
    pg.goto(f"http://localhost:3000/login")
    pg.wait_for_load_state("domcontentloaded")
    pg.fill('input[name="email"]', EMAIL)
    pg.fill('input[name="password"]', PASSWORD)
    pg.click('button[type="submit"]')
    pg.wait_for_url(re.compile(r"/dashboard"), timeout=15000)
    assert "/dashboard" in pg.url, f"Login failed in fixture: {pg.url}"

    # Extract token from cookie for API calls
    cookies = context.cookies()
    token = next((c["value"] for c in cookies if c["name"] == "ayron_token"), "")

    yield pg, token
    pg.close()
    context.close()

