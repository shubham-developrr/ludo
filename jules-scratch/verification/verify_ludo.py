import asyncio
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        # --- Setup ---
        browser = await p.chromium.launch()
        context1 = await browser.new_context()
        page1 = await context1.new_page() # Host

        context2 = await browser.new_context()
        page2 = await context2.new_page() # Player 2

        # --- Test Steps ---

        # 1. Host navigates to lobby and takes screenshot
        await page1.goto("http://localhost:3000")
        await expect(page1.get_by_role("heading", name="Ludo Game")).to_be_visible()
        await page1.screenshot(path="jules-scratch/verification/01_lobby.png")
        print("Screenshot 1: Lobby - Captured")

        # 2. Host creates a game
        await page1.get_by_role("button", name="Create Game").click()
        await expect(page1.get_by_text("Room Code:")).to_be_visible()
        room_code_element = page1.locator("#room-code-display")
        room_code = await room_code_element.inner_text()
        print(f"Host created room: {room_code}")

        # 3. Player 2 joins the game
        await page2.goto("http://localhost:3000")
        await page2.get_by_placeholder("Enter Room Code").fill(room_code)
        await page2.get_by_role("button", name="Join Game").click()
        await expect(page2.get_by_text(f"Room Code: {room_code}")).to_be_visible()
        print("Player 2 joined the room.")

        # 4. Host takes screenshot of the waiting room
        await expect(page1.get_by_text("Player (yellow)")).to_be_visible() # Wait for P2 to show up
        await page1.screenshot(path="jules-scratch/verification/02_waiting_room.png")
        print("Screenshot 2: Waiting Room - Captured")

        # 5. Host starts the game
        await page1.get_by_role("button", name="Start Game").click()

        # 6. Wait for game to load and take in-game screenshot
        await expect(page1.locator("#ludo-board")).to_be_visible()
        await expect(page2.locator("#ludo-board")).to_be_visible()
        await expect(page1.get_by_text("red's turn")).to_be_visible()
        print("Game started.")

        # 7. Player 2 sends a chat message
        await page2.locator("#chat-input").fill("Hello from Player 2!")
        await page2.get_by_role("button", name="Send").click()
        await expect(page1.get_by_text("yellow: Hello from Player 2!")).to_be_visible()
        print("Chat message sent and received.")

        await page1.screenshot(path="jules-scratch/verification/03_in_game.png")
        print("Screenshot 3: In-Game - Captured")

        # --- Teardown ---
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
