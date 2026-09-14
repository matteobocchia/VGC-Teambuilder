# Rachel — English-first Showdown player

## Context

- Plays online events and follows international VGC discussions.
- Uses English as her only comfortable UI language.
- Treats Pokémon Showdown exports, damage calculations and team pastes as technical references.
- Works on desktop for team building and on mobile for quick matchup checks.

## Relationship with Showdown

Showdown is the canonical workflow she already trusts. She expects to paste a set, copy it back out, and recognize names such as `Tera Type`, `Held Item`, `Ability`, `Nature`, `Stat Points`, `Grassy Terrain` and `Trick Room` without partial translations.

## Main scenario

Rachel brings a public Showdown paste into the Champions builder, checks the format-specific constraints, then shares a read-only matchup with an Italian teammate. The teammate may switch the UI to Italian; the underlying Pokémon, set and result must stay identical.

## Goals

- Use the complete English UI without encountering Italian labels.
- Preserve the technical Showdown vocabulary at import/export boundaries.
- Edit one slot, one move or one spread while keeping all other set data intact.
- See whether a restriction comes from Champions rules or from an unsupported Showdown field.
- Share a scenario that opens in another locale without changing its meaning.

## Frictions to eliminate

- `Electric Terrain` written in full while another terrain is shortened to `Grassy`.
- A locale toggle that translates headings but leaves aria labels or error messages Italian.
- A Showdown paste accepted with silent fallback values.
- A link that serializes translated labels instead of stable canonical IDs.
- Static damage values that do not react to the selected attacker, defender or field.

## Ideal flow

1. Selects English and Regulation M-B Doubles.
2. Pastes or manually recreates the Showdown team.
3. Reviews a blocking issue list before saving.
4. Selects a slot and edits the complete active set.
5. Runs a matchup with explicit field conditions.
6. Shares the scenario; the recipient can switch to Italian without changing inputs.

## Success criterion

Rachel never needs to decode the interface. The canonical data remains stable, Showdown copy/paste stays predictable, and every visible assumption is written in consistent English.
