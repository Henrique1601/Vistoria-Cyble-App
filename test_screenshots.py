from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 390, "height": 844})
    
    page.goto('http://localhost:3000', timeout=60000)
    page.wait_for_load_state('networkidle', timeout=60000)
    time.sleep(2)
    
    # PIN screen
    page.screenshot(path='screenshots/01_pin.png', full_page=True)
    print("1. PIN screen")
    
    # Enter PIN
    try:
        pin = page.locator('input').first
        pin.fill('4821')
        time.sleep(0.5)
        page.keyboard.press('Enter')
        time.sleep(2)
    except:
        print("Could not enter PIN")
    
    # Home
    page.screenshot(path='screenshots/02_home.png', full_page=True)
    print("2. Home screen")
    
    # Click first block
    try:
        blocks = page.locator('button').all()
        for b in blocks:
            txt = b.inner_text()
            if 'Torre' in txt or 'Bloco' in txt or 'A' == txt.strip():
                b.click()
                time.sleep(1)
                break
        page.screenshot(path='screenshots/03_aptos.png', full_page=True)
        print("3. Apartment list")
    except Exception as e:
        print(f"Block click failed: {e}")
    
    browser.close()
    print("Done")
