# POS Manual Testing Guide

## Quick Test Checklist

### 1. Product Operations

- [ ] Click a product tile → adds to cart
- [ ] Click same product again → increases quantity
- [ ] Search for product by name → filters products
- [ ] Search by SKU/barcode → filters products
- [ ] Clear search → shows all products
- [ ] Select category → filters by category
- [ ] Select "All" category → shows all products

### 2. Cart Operations

- [ ] Click + button → increases quantity
- [ ] Click - button → decreases quantity
- [ ] Click - when qty=1 → shows remove confirmation
- [ ] Click remove (trash icon) → removes immediately (if not last item)
- [ ] Click remove on last item → shows confirmation dialog
- [ ] Cart shows correct item count badge
- [ ] Subtotal calculates correctly

### 3. Customer Selection (F4 or button)

- [ ] Click Customer button → opens dialog
- [ ] Dialog loads customers from store
- [ ] Search customers by name → filters list
- [ ] Search customers by phone → filters list
- [ ] Click customer → selects and closes dialog
- [ ] Click Clear → removes selection
- [ ] Click Close → closes without selection
- [ ] Press Esc → closes dialog

### 4. Discount (F8 or button)

- [ ] Click Discount button → opens dialog
- [ ] Enter valid amount → applies to total
- [ ] Enter amount > subtotal → validation prevents
- [ ] Enter negative amount → validation prevents
- [ ] Press Enter in field → applies discount
- [ ] Click Cancel → closes without applying
- [ ] Press Esc → closes dialog

### 5. Note (button)

- [ ] Click Note button → opens dialog
- [ ] Type note → saves in memory
- [ ] Click Save → closes and saves note
- [ ] Click Clear → removes note
- [ ] Click Cancel → closes without saving
- [ ] Press Esc → closes dialog

### 6. Hold Sale (F2 or button)

- [ ] Empty cart + Click Hold → shows "cart empty" message
- [ ] With items + Click Hold → opens hold dialog
- [ ] Enter name (optional) → saves with name
- [ ] Leave name empty → saves with default name
- [ ] Click Hold → saves and clears cart
- [ ] Held sale appears in Resume dialog
- [ ] Refresh page → held sales still there

### 7. Resume Sale (F3 or More menu)

- [ ] Click More → opens menu
- [ ] Click Resume Held Sale → opens resume dialog
- [ ] Dialog shows held sales with item count and total
- [ ] Click held sale → restores to cart
- [ ] Restored sale removed from held list
- [ ] Click delete (trash) on held sale → confirms and deletes
- [ ] Press Esc → closes dialog

### 8. Clear Cart (F9 or button)

- [ ] Empty cart + Click Clear → nothing happens
- [ ] With items + Click Clear → opens confirmation
- [ ] Click Clear in dialog → clears cart and all data
- [ ] Click Cancel → keeps cart
- [ ] Press Esc → closes dialog

### 9. Complete Sale (Enter or Pay button)

- [ ] Empty cart + Click Pay → nothing happens
- [ ] With items + Click Pay → processes sale
- [ ] Shows "Sale completed" message
- [ ] Cart clears after successful sale
- [ ] Focus returns to search field
- [ ] Ask to view sale details → navigates if yes
- [ ] Customer, note, discount included in payload

### 10. Keyboard Shortcuts

- [ ] F1 → Resets sale (confirms if cart has items)
- [ ] F2 → Opens hold sale dialog
- [ ] F3 → Opens resume sale dialog
- [ ] F4 → Opens customer dialog
- [ ] F8 → Opens discount dialog
- [ ] F9 → Opens clear cart confirmation
- [ ] Enter → Completes sale (not in inputs)
- [ ] Enter in search → searches
- [ ] Enter in dialog input → submits dialog
- [ ] Esc with dialog open → closes dialog
- [ ] Esc with search text → clears search
- [ ] Esc with empty search → blurs search

### 11. Dialog Interactions

- [ ] Multiple dialogs don't overlap
- [ ] Hotkeys disabled when dialog open
- [ ] Esc closes dialog in correct order
- [ ] Dialog backdrops work
- [ ] Dialogs fullscreen on mobile
- [ ] Dialogs scrollable on overflow

### 12. Responsive Behavior

- [ ] Desktop: Cart left, products right
- [ ] Mobile: Products top, cart bottom
- [ ] Tablet: Proper column ratios
- [ ] Product grid adjusts (6 cols on mobile, 2 on desktop)
- [ ] Dialogs fullscreen on mobile
- [ ] All buttons touch-friendly
- [ ] Action buttons show icons only on mobile

### 13. Data Persistence

- [ ] Held sales survive page refresh
- [ ] Held sales survive browser restart
- [ ] Multiple held sales can coexist
- [ ] Held sales show correct data when resumed
- [ ] Deleted held sales don't reappear

### 14. Edge Cases

- [ ] Add product with $0 price → shows warning
- [ ] Complete sale with $0 total → processes
- [ ] Hold sale with no customer → works
- [ ] Hold sale with customer → customer preserved
- [ ] Resume sale with invalid data → handles gracefully
- [ ] Search with special characters → works
- [ ] Very long product names → truncates properly
- [ ] Many items in cart → scrolls properly

## Test Scenarios

### Scenario 1: Complete Sale Flow

1. Add 3 products to cart
2. Increase quantity of one item
3. Apply discount ($5)
4. Select customer
5. Add note ("Test order")
6. Complete sale (F9 or Pay button)
7. Verify success message
8. Verify cart is empty

### Scenario 2: Hold and Resume

1. Add 2 products to cart
2. Apply discount ($10)
3. Select customer
4. Click Hold (F2)
5. Name it "Table 5"
6. Verify cart is empty
7. Add different product
8. Click Hold
9. Name it "Table 7"
10. Open Resume dialog (F3)
11. Verify both sales listed
12. Click "Table 5"
13. Verify cart restored with correct items, discount, customer

### Scenario 3: Keyboard Power User

1. Press F4 → Select customer
2. Type to search, click customer
3. Press F1 → Focus search
4. Type product name, press Enter
5. Product appears in results
6. Click product
7. Press F8 → Apply discount
8. Enter amount, press Enter
9. Press Enter → Complete sale
10. Verify sale processed

### Scenario 4: Multi-Dialog Navigation

1. Open customer dialog (F4)
2. Press Esc → closes
3. Open discount dialog (F8)
4. Press Esc → closes
5. Open note dialog
6. Press Esc → closes
7. Add items to cart
8. Press F9 → Clear confirm
9. Press Esc → cancels

## Expected Results

### All Tests Pass Means:

✅ No console errors
✅ No TypeScript errors
✅ All hotkeys work correctly
✅ All dialogs open and close properly
✅ Data persists correctly
✅ Sale completes successfully
✅ Hold/Resume works reliably
✅ Customer selection integrates
✅ Discount applies correctly
✅ Notes save and send
✅ UI responsive on all screen sizes
✅ No duplicate hotkey triggers
✅ Focus management works smoothly
