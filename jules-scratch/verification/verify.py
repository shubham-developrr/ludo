from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto("file:///app/index.html")

        # Wait for the board and tokens to be rendered
        page.wait_for_selector('.token')
        page.wait_for_timeout(500) # Extra delay for animations to settle

        # Open the theme menu
        theme_btn = page.locator('#theme-btn')
        theme_btn.click()

        # Wait for the menu to be visible
        theme_menu = page.locator('#theme-menu')
        expect(theme_menu).to_be_visible()

        # Take the screenshot
        page.screenshot(path="jules-scratch/verification/ludo-ui.png")

        browser.close()

run()
