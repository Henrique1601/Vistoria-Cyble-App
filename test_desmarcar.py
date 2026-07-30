"""Test the desmarcar button behavior on AptoCard."""
from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 390, "height": 844})
    
    # Enable console logging
    page.on("console", lambda msg: print(f"[CONSOLE {msg.type}] {msg.text}"))
    page.on("pageerror", lambda err: print(f"[PAGE ERROR] {err}"))
    
    print("1. Navigating to app...")
    page.goto("http://localhost:3000")
    page.wait_for_load_state("networkidle")
    page.screenshot(path="test_01_login.png")
    
    print("2. Entering PIN...")
    pin_input = page.locator('input[type="password"]')
    pin_input.fill("4821")
    page.locator('button:has-text("Entrar")').click()
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(1000)
    page.screenshot(path="test_02_after_login.png")
    
    # Check what's on screen
    content = page.content()
    print(f"  Page title: {page.title()}")
    
    # Look for block buttons
    blocks = page.locator('button:has-text("Torre")').all()
    print(f"  Found {len(blocks)} tower buttons")
    
    if len(blocks) > 0:
        print("3. Clicking first tower...")
        blocks[0].click()
        page.wait_for_timeout(1000)
        page.screenshot(path="test_03_tower.png")
        
        # Look for apartment cards
        aptos = page.locator('[role="button"]').all()
        print(f"  Found {len(aptos)} elements with role=button")
        
        # Look for the Warning icon button (desmarcar)
        warning_buttons = page.locator('button[aria-label*="Desmarcar"]').all()
        print(f"  Found {len(warning_buttons)} desmarcar buttons")
        
        if len(warning_buttons) == 0:
            # Maybe no completed apartments in this tower, try another
            print("  No desmarcar buttons found. Looking for completed apartments...")
            # Take a full screenshot to see the state
            page.screenshot(path="test_04_no_desmarcar.png", full_page=True)
            
            # Let's check if there are any status dots that indicate completion
            green_dots = page.locator('.bg-success, [class*="success"]').all()
            print(f"  Found {len(green_dots)} success-colored elements")
        
        if len(warning_buttons) > 0:
            print("4. Found desmarcar button! Clicking it...")
            # Take screenshot before click
            page.screenshot(path="test_04_before_click.png")
            
            # Add a console log interceptor to see what happens
            events = []
            page.evaluate("""() => {
                const origConsole = console.log;
                console.log = function(...args) {
                    origConsole.apply(console, args);
                    window.__lastLog = args.join(' ');
                };
            }""")
            
            warning_buttons[0].click()
            page.wait_for_timeout(1000)
            page.screenshot(path="test_05_after_click.png")
            
            # Check if ConfirmDialog appeared
            confirm_dialog = page.locator('text=Desmarcar como concluido').all()
            print(f"  ConfirmDialog visible: {len(confirm_dialog) > 0}")
            
            # Check if we navigated away
            current_url = page.url
            print(f"  Current URL: {current_url}")
            
            # Check for any modal/dialog
            dialogs = page.locator('[class*="fixed"][class*="inset-0"]').all()
            print(f"  Fixed overlay elements: {len(dialogs)}")
    
    browser.close()
    print("\nDone! Check screenshots for visual inspection.")
