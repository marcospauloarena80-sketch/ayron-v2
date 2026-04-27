"""Debug: captura HTML real de páginas problemáticas"""
import time
import httpx
import pytest
from playwright.sync_api import Page

BASE_URL = "http://localhost:3000"
API_URL  = "http://localhost:4000/api/v1"

def test_financial_debug(auth_page):
    page, _ = auth_page
    page.goto(f"{BASE_URL}/financial")
    page.wait_for_load_state("domcontentloaded")
    time.sleep(3)  # extra wait for hydration
    content = page.content()
    print(f"\nURL: {page.url}")
    print(f"Has 'Financeiro': {'Financeiro' in content}")
    print(f"Has 'Receita': {'Receita' in content}")
    print(f"Has 'Topbar': {'Topbar' in content}")
    # Save screenshot
    page.screenshot(path="/tmp/financial_debug.png")
    # Print a chunk of the body
    idx = content.find("Financeiro")
    if idx > 0:
        print(f"Context: ...{content[max(0,idx-100):idx+100]}...")
    else:
        print("'Financeiro' NOT found in raw HTML!")
        # Print first 2000 chars of body
        body_start = content.find("<body")
        print(f"Body start: {content[body_start:body_start+2000]}")
    assert True  # always pass — just for debugging

def test_inventory_debug(auth_page):
    page, _ = auth_page
    page.goto(f"{BASE_URL}/inventory")
    page.wait_for_load_state("domcontentloaded")
    time.sleep(3)
    content = page.content()
    print(f"\nURL: {page.url}")
    print(f"Has 'Novo Item': {'Novo Item' in content}")
    print(f"Has 'Estoque': {'Estoque' in content}")
    page.screenshot(path="/tmp/inventory_debug.png")
    # Count buttons
    btn_count = page.locator("button").count()
    print(f"Buttons on page: {btn_count}")
    for i in range(min(btn_count, 10)):
        try:
            txt = page.locator("button").nth(i).inner_text()
            print(f"  button[{i}]: '{txt}'")
        except Exception:
            pass
    assert True
