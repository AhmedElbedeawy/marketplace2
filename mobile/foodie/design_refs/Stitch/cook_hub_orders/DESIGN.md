# Design System Document

## 1. Overview & Creative North Star: "The Digital Maître D’"

This design system is engineered to elevate a food marketplace from a utility to an editorial experience. The **Creative North Star** is "The Digital Maître D’"—a philosophy that balances warm hospitality with high-end architectural precision. 

To move beyond a "template" look, we move away from rigid, boxy layouts. Instead, we utilize **intentional asymmetry**, high-contrast typography scales, and **tonal layering**. We treat the mobile screen not as a flat canvas, but as a series of physical planes where high-quality food photography is the hero, and the UI acts as a sophisticated, quiet guide.

---

## 2. Colors: Warmth through Depth

Our palette is anchored in appetizing ambers (`primary`) and roasted earth tones (`tertiary`), set against a clinical yet soft background architecture.

### The "No-Line" Rule
**1px solid borders are strictly prohibited for sectioning.** To define boundaries, designers must use background color shifts or spacing. A section should be distinguished by moving from `surface` to `surface-container-low`.

### Surface Hierarchy & Nesting
We use Material 3 tonal tiers to create organic depth. Treat the UI like stacked sheets of fine paper:
- **Base Level:** `surface` (#f6f6f6) - The main stage.
- **Deepest Level:** `surface-container-low` (#f0f1f1) - Used for grouping secondary content areas.
- **Elevated Level:** `surface-container-lowest` (#ffffff) - Reserved for interactive cards and input fields to make them "pop" against the gray base.

### The "Glass & Gradient" Rule
Floating elements (like bottom navigation or top-right profile icons) should utilize **Glassmorphism**. Use a semi-transparent `surface` color with a 20px backdrop blur to allow food photography colors to bleed through, creating a "frosted glass" effect that feels premium and integrated.

### Signature Textures
Main CTAs and Hero accents should utilize a subtle linear gradient: `primary` (#904800) to `primary-container` (#f68a2f). This mimics the natural highlight on a glazed dish, adding "visual soul."

---

## 3. Typography: Editorial Authority

We use a dual-font strategy to balance character with extreme readability.

*   **Display & Headlines (Plus Jakarta Sans):** These are our "statement" pieces. We use high-contrast sizing (e.g., `display-lg` at 3.5rem) to create an editorial feel. Headlines should have tight letter-spacing (-0.02em) to feel authoritative and modern.
*   **Body & Labels (Manrope):** Chosen for its technical precision and readability at small sizes. Manrope handles the "labor" of the app—price points, ingredients, and descriptions—with a clean, Swiss-inspired aesthetic.

**Hierarchy Note:** Always lead with a `headline-md` for category titles. Use `label-md` in all-caps with 0.05em letter-spacing for "overlines" (e.g., "CHEF'S SPECIAL") to add a layer of professional branding.

---

## 4. Elevation & Depth: Tonal Layering

Traditional shadows are often "muddy." We achieve dimension through light and tone.

*   **The Layering Principle:** Place a `surface-container-lowest` (#ffffff) card on top of a `surface` (#f6f6f6) background. This creates a natural "lift" without a single drop shadow.
*   **Ambient Shadows:** For floating elements like the "Add to Cart" FAB, use a shadow with a 24px blur, 0px offset, and 6% opacity using the `on-surface` color. This mimics natural ambient light.
*   **The "Ghost Border" Fallback:** If a container lacks sufficient contrast against its background, use a **Ghost Border**: `outline-variant` (#acadad) at **15% opacity**. This provides a hint of structure without the harshness of a solid line.

---

## 5. Components: Bespoke Elements

### Cards & Lists
*   **Cards:** Use `xl` (1.5rem) rounded corners for main dish cards. **Forbid all divider lines.** Separate items in a list using the `3` (1rem) spacing token.
*   **Hero Cards:** Extend imagery to the very edge of the card, using a subtle internal gradient overlay (bottom-to-top, black at 40% to transparent) to ensure `title-sm` white text remains readable.

### Buttons
*   **Primary:** High-gloss. Use the signature primary gradient. `full` roundedness. 
*   **Secondary:** `surface-container-highest` (#dbdddd) background with `on-surface` text. This feels "stealth" and high-end.
*   **Tertiary:** No background. Bold `primary` text. Used for "See All" or "View Details."

### Category Chips
*   Instead of standard boxes, use `surface-container-lowest` with an `outline-variant` Ghost Border. When selected, transition to `secondary-container` (#fdd34d) to provide a warm, appetizing "glow."

### Input Fields
*   Use `surface-container-lowest` for the field background. The focus state should never be a thick border; instead, use a 2px `primary` bottom-bar or a subtle glow effect.

---

## 6. Do’s and Don’ts

### Do:
*   **Use Asymmetric Padding:** Allow images to "bleed" off the side of the screen in horizontal carousels to signal more content.
*   **Prioritize Photography:** UI elements should feel like they are floating *over* the food, not competing with it.
*   **Embrace White Space:** Use the `6` (2rem) and `8` (2.75rem) spacing tokens between major sections to let the design breathe.

### Don’t:
*   **Don't use 100% Black:** Use `on-surface` (#2d2f2f) for text. Pure black is too harsh for an appetizing food environment.
*   **Don't use Sharp Corners:** Nothing in this system should be sharper than the `DEFAULT` (0.5rem) radius. Sharpness suggests industrial; roundness suggests organic and culinary.
*   **Don't Over-Elevate:** If everything has a shadow, nothing is important. Use tonal shifts first, shadows last.

---

## 7. Spacing & Rhythm

All layouts must follow the defined spacing scale to maintain a rhythmic, musical quality to the scroll.
- **Section Gaps:** `8` (2.75rem)
- **Component Internal Padding:** `3` (1rem) or `4` (1.4rem)
- **Text-to-Image Proximity:** `2` (0.7rem)

By adhering to these principles, the design system ensures that the marketplace feels less like a database and more like a curated culinary magazine.