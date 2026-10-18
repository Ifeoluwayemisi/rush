#!/usr/bin/env python3
"""Capture all key Rush screens for visual verification."""
import subprocess
import time
import re
import os
import sys

OUT = "/home/z/my-project/download"
BASE = "http://localhost:3000/"


def run(args, timeout=20):
    """Run an agent-browser command and return its stdout."""
    try:
        r = subprocess.run(
            ["agent-browser", *args],
            capture_output=True,
            text=True,
            timeout=timeout,
        )
        return r.stdout + r.stderr
    except subprocess.TimeoutExpired:
        return ""


def snapshot_interactive():
    """Return the list of (ref, label) tuples from interactive snapshot."""
    out = run(["snapshot", "-i", "-c"])
    items = []
    for line in out.splitlines():
        m = re.search(r'\[ref=(e\d+)\]', line)
        if m:
            ref = m.group(1)
            # Strip the "- " prefix and " [ref=...]" suffix
            label = re.sub(r'^\s*-\s+', '', line)
            label = re.sub(r'\s*\[ref=e\d+\].*$', '', label)
            items.append((ref, label))
    return items


def find_ref(items, contains):
    """Find first ref whose label contains the substring."""
    for ref, label in items:
        if contains in label:
            return ref
    return None


def open_home():
    run(["open", BASE])
    time.sleep(2)
    run(["eval", "document.querySelectorAll('nextjs-portal').forEach(p=>p.remove());"])
    time.sleep(0.3)


def click_and_shot(ref, out_name, wait=1.5):
    if ref is None:
        print(f"  !! ref not found for {out_name}")
        return False
    run(["click", f"@{ref}"])
    time.sleep(wait)
    run(["screenshot", f"{OUT}/{out_name}"])
    print(f"  Captured {out_name}")
    return True


def main():
    os.makedirs(OUT, exist_ok=True)

    # 1. Home
    open_home()
    run(["screenshot", f"{OUT}/01-home.png"])
    print("Captured 01-home.png")

    # 2. Shop
    items = snapshot_interactive()
    ref = find_ref(items, "Shop Buy things")
    click_and_shot(ref, "02-shop.png")

    # 3. Product detail
    items = snapshot_interactive()
    ref = find_ref(items, "Wireless Bluetooth Headphones -32%")
    click_and_shot(ref, "03-product.png")

    # 4. Store (from home)
    open_home()
    items = snapshot_interactive()
    ref = find_ref(items, "Campus Gadgets Campus Gadgets Campus Gadgets")
    click_and_shot(ref, "04-store.png")

    # 5. Services
    open_home()
    items = snapshot_interactive()
    ref = find_ref(items, "Services Hire pros")
    click_and_shot(ref, "05-services.png")

    # 6. Ride booking
    open_home()
    items = snapshot_interactive()
    ref = find_ref(items, "Rides Get around")
    click_and_shot(ref, "06-ride.png")

    # 7. Sell hub
    open_home()
    items = snapshot_interactive()
    # bottom nav "Sell" tab
    ref = next((r for r, l in items if "Sell or earn" in l and "button" in l), None)
    click_and_shot(ref, "07-sell.png")

    # 8. Account
    items = snapshot_interactive()
    # bottom nav "Account" tab — need to match exact button
    ref = next((r for r, l in items if l.strip() == "Account" or l.strip() == "  - button \"Account\""), None)
    if not ref:
        ref = find_ref(items, "Account")
    # be specific: bottom nav, not top-right
    for r, l in items:
        if "Account" in l and r != "e5":  # e5 is top-right avatar
            ref = r
            break
    click_and_shot(ref, "08-account.png")

    # 9. Vendor dashboard
    items = snapshot_interactive()
    ref = find_ref(items, "My Store Campus Gadgets")
    click_and_shot(ref, "09-vendor-dashboard.png")

    # 10. Rider onboarding
    open_home()
    items = snapshot_interactive()
    ref = next((r for r, l in items if "Sell or earn" in l and "button" in l), None)
    run(["click", f"@{ref}"])
    time.sleep(1.5)
    items = snapshot_interactive()
    ref = find_ref(items, "Become a rider")
    click_and_shot(ref, "10-rider-onboarding.png")

    # 11. Order tracking (from Activity)
    open_home()
    items = snapshot_interactive()
    ref = next((r for r, l in items if l.strip().endswith('Activity')), None)
    run(["click", f"@{ref}"])
    time.sleep(1.5)
    items = snapshot_interactive()
    ref = find_ref(items, "Aunty Bisi Kitchen")
    click_and_shot(ref, "11-order-tracking.png")

    print("\nAll screenshots captured to", OUT)
    files = sorted(f for f in os.listdir(OUT) if f.endswith(".png"))
    for f in files:
        size = os.path.getsize(os.path.join(OUT, f))
        print(f"  {f}  ({size//1024} KB)")


if __name__ == "__main__":
    main()
