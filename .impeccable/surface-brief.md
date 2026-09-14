Surface: VGC Forge main matchup workspace (team builder + damage calculator)

Approved visual direction: Matchup Field Map.
Approved composition: `.impeccable/mocks/comp-3-approved.png` (selected from comp-3 with the explicit steer “le forme simil pozzanghera non mi piacciono”).

Build contract:
- Desktop-first workspace with a thin utility bar, stacked calculator inspector on the left, matchup route across the top center, outcomes matrix below/right, and six-slot team rail at far right.
- Use a warm cream canvas (#F5F1E4), ink black (#2C2E2A), lime (#C4E94B), sky blue (#8CC7E8), coral (#FF705D), and warm yellow (#F5C94A). Solid fills only; no gradients, glass, shadows, or generic SaaS cards.
- Typography is bold, compact, and highly legible. Borders are crisp and slightly irregular. Map regions use angular cartographic panels with stepped corners and straight-ish coastlines, never puddle blobs.
- Real content must be visible in the first viewport: Flutter Mane, Incineroar, Moonblast, Regulation M-B, Stat Points, Electric Terrain, Reflect, and outcome percentages.
- The main result is one yellow KO capsule with detailed range and all-roll evidence; secondary moves are compact rows. Inputs must remain semantic HTML controls.
- Responsive behavior: preserve the route and result on narrow screens by stacking inspector, route, table, and team rail; never hide core evidence behind decorative motion.

Component inventory:
- `TopBar`: VGC Forge mark, format selector, IT/EN toggle, Save team.
- `SetupInspector`: selected Pokémon details, level, tera, item, ability, Stat Points 0–32 controls, nature, moves.
- `MatchupRoute`: attacker and defender cartographic panels, coral move connector, primary KO result, field-state chips.
- `OutcomesMatrix`: main move evidence plus compact alternatives and KO percentages across team targets.
- `TeamRail`: six numbered roster slots with selected state and add Pokémon action.

Behavior notes:
- Keep current draft state client-side for the visual prototype; API boundaries should be obvious for later REST integration.
- Use IT as default locale with a compact IT/EN toggle. Keep strings in a locale map so more languages can be added without component rewrites.
