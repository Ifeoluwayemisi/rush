#!/bin/bash
set -e
OUT=/home/z/my-project/download
agent-browser open http://localhost:3000/ > /dev/null 2>&1
sleep 2
agent-browser eval "document.querySelectorAll('nextjs-portal').forEach(p=>p.remove());" > /dev/null 2>&1

# 2. Shop
agent-browser snapshot -i -c > /tmp/snap.txt 2>&1
SHOP_BTN=$(grep -oE '@e[0-9]+' <(grep -E "Shop Buy things" /tmp/snap.txt) | head -1)
agent-browser click $SHOP_BTN > /dev/null 2>&1
sleep 1
agent-browser screenshot --full $OUT/02-shop.png > /dev/null 2>&1
echo "Shop captured"

# 3. Product detail
agent-browser snapshot -i -c > /tmp/snap.txt 2>&1
PROD_BTN=$(grep -oE '@e[0-9]+' <(grep -E "Wireless Bluetooth" /tmp/snap.txt) | head -1)
agent-browser click $PROD_BTN > /dev/null 2>&1
sleep 1
agent-browser screenshot --full $OUT/03-product.png > /dev/null 2>&1
echo "Product captured"

# 4. Store
agent-browser open http://localhost:3000/ > /dev/null 2>&1
sleep 2
agent-browser eval "document.querySelectorAll('nextjs-portal').forEach(p=>p.remove());" > /dev/null 2>&1
agent-browser snapshot -i -c > /tmp/snap.txt 2>&1
STORE_BTN=$(grep -oE '@e[0-9]+' <(grep -E "Campus Gadgets Campus Gadgets Campus Gadgets" /tmp/snap.txt) | head -1)
agent-browser click $STORE_BTN > /dev/null 2>&1
sleep 1
agent-browser screenshot --full $OUT/04-store.png > /dev/null 2>&1
echo "Store captured"

# 5. Services
agent-browser open http://localhost:3000/ > /dev/null 2>&1
sleep 2
agent-browser eval "document.querySelectorAll('nextjs-portal').forEach(p=>p.remove());" > /dev/null 2>&1
agent-browser snapshot -i -c > /tmp/snap.txt 2>&1
SVC_BTN=$(grep -oE '@e[0-9]+' <(grep -E "Services Hire pros" /tmp/snap.txt) | head -1)
agent-browser click $SVC_BTN > /dev/null 2>&1
sleep 1
agent-browser screenshot --full $OUT/05-services.png > /dev/null 2>&1
echo "Services captured"

# 6. Sell hub
agent-browser open http://localhost:3000/ > /dev/null 2>&1
sleep 2
agent-browser eval "document.querySelectorAll('nextjs-portal').forEach(p=>p.remove());" > /dev/null 2>&1
agent-browser snapshot -i -c > /tmp/snap.txt 2>&1
SELL_BTN=$(grep -oE '@e[0-9]+' <(grep -E "Sell or earn" /tmp/snap.txt) | head -1)
agent-browser click $SELL_BTN > /dev/null 2>&1
sleep 1
agent-browser screenshot --full $OUT/06-sell.png > /dev/null 2>&1
echo "Sell captured"

# 7. Account
agent-browser snapshot -i -c > /tmp/snap.txt 2>&1
ACCT_BTN=$(grep -oE '@e[0-9]+' <(grep -E "^  - button \"Account\"" /tmp/snap.txt) | head -1)
agent-browser click $ACCT_BTN > /dev/null 2>&1
sleep 1
agent-browser screenshot --full $OUT/07-account.png > /dev/null 2>&1
echo "Account captured"

# 8. Vendor dashboard
agent-browser snapshot -i -c > /tmp/snap.txt 2>&1
MYSTORE_BTN=$(grep -oE '@e[0-9]+' <(grep -E "My Store Campus Gadgets" /tmp/snap.txt) | head -1)
agent-browser click $MYSTORE_BTN > /dev/null 2>&1
sleep 1
agent-browser screenshot --full $OUT/08-vendor-dashboard.png > /dev/null 2>&1
echo "Vendor dashboard captured"

# 9. Ride booking
agent-browser open http://localhost:3000/ > /dev/null 2>&1
sleep 2
agent-browser eval "document.querySelectorAll('nextjs-portal').forEach(p=>p.remove());" > /dev/null 2>&1
agent-browser snapshot -i -c > /tmp/snap.txt 2>&1
RIDE_BTN=$(grep -oE '@e[0-9]+' <(grep -E "Rides Get around" /tmp/snap.txt) | head -1)
agent-browser click $RIDE_BTN > /dev/null 2>&1
sleep 1
agent-browser screenshot --full $OUT/09-ride.png > /dev/null 2>&1
echo "Ride captured"

# 10. Rider dashboard (go to Sell → Become a rider → onboarding)
agent-browser open http://localhost:3000/ > /dev/null 2>&1
sleep 2
agent-browser eval "document.querySelectorAll('nextjs-portal').forEach(p=>p.remove());" > /dev/null 2>&1
agent-browser snapshot -i -c > /tmp/snap.txt 2>&1
SELL_BTN=$(grep -oE '@e[0-9]+' <(grep -E "Sell or earn" /tmp/snap.txt) | head -1)
agent-browser click $SELL_BTN > /dev/null 2>&1
sleep 1
agent-browser snapshot -i -c > /tmp/snap.txt 2>&1
RIDER_BTN=$(grep -oE '@e[0-9]+' <(grep -E "Become a rider" /tmp/snap.txt) | head -1)
agent-browser click $RIDER_BTN > /dev/null 2>&1
sleep 1
agent-browser screenshot --full $OUT/10-rider-onboarding.png > /dev/null 2>&1
echo "Rider onboarding captured"

echo ""
ls -la $OUT/*.png
