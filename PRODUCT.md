# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React frontend with a TypeScript/Node.js backend in a single lightweight monorepo. PostgreSQL is the canonical database, with JSONB for format-specific rule data and REST APIs under `/api/v1`.

## Users

Competitive Pokémon players preparing teams and matchup decisions for Pokémon Champions, initially in Italian and English.

## Product Purpose

Build legal Pokémon Champions teams and calculate damage accurately in Singles and Doubles scenarios. Success means a player can configure a complete team, test a matchup, and trust that the result uses the correct Champions rules and data release.

## Positioning

A team builder and calculator whose rules are format-aware, versioned, reproducible, and driven by a backend rules engine rather than a generic client-side approximation.

## Operating Context

Players assemble a six-Pokémon roster, configure each competitive set, import or export Showdown text, inspect matchups, and share read-only teams. A calculator can also be used standalone with ad-hoc Pokémon that respect official species/form/ability/item/learnset compatibility.

## Capabilities and Constraints

- Initial format: Pokémon Champions Regulation M-B Doubles; backend supports multiple future format profiles.
- Team builder stores six Pokémon without active/reserve state for now.
- Champions stat system: no IV field; Stat Points range from 0 to 32 per stat with a total cap of 66; level 50; stat alignment/nature; final stats are derived automatically.
- Illegal team combinations cannot be created. Imported illegal or unrepresentable teams are rejected with an error list.
- Calculator supports standalone 1-vs-1 and full 2-vs-2 scenarios, field state, spread damage, critical hits, KO/2HKO/3HKO probabilities, and a manually selected primary move with compact results for other moves.
- Calculator results are computed server-side and update automatically. Standalone scenarios are temporary and are not persisted or shared in v1.
- Team builder search is server-side and can filter by name, type, ability, and role.
- Rules stored in PostgreSQL have priority over imported data. Showdown is a technical oracle only where mechanics are explicitly compatible; Champions-specific rules require official data.
- Data is stored as versioned JSON releases and imported into PostgreSQL. Team revisions and the data release used by each calculation are retained for reproducibility.
- Anonymous teams use a secure browser identifier, support read-only links, and can later be attached to accounts. No login or admin panel in v1.
- Import/export supports Showdown text and structured JSON. Showdown EV/IV sets are converted automatically to Champions Stat Points; no conversion preview.
- Interface languages: Italian and English. Translation files are separate from language-independent domain data.
- Automated golden tests compare the damage engine to Showdown-compatible cases and official Champions examples.

## Brand Commitments

The product should feel like a serious, fast competitive analysis tool for Pokémon Champions. No official Pokémon logos or unverified competitive claims should be fabricated.

## Evidence on Hand

- Official Pokémon Champions site and Regulation M-B announcement: https://www.pokemon.com/us/pokemon-news/regulation-set-m-b-kicks-off-a-new-ranked-battles-season-and-battle-pass-in-pokemon-champions
- Official Champions strategy content showing Stat Points and competitive team composition: https://www.pokemon.com/it/approfondimenti/pokemon-champions-come-formare-una-squadra-intorno-a-megameganium
- Public product requirement decisions captured in the planning conversation.

## Product Principles

1. Format truth comes before convenience.
2. A result must be reproducible from immutable data and team revisions.
3. Legal team construction is enforced by design, not by a late validator.
4. The calculator stays useful both as a quick sandbox and as a team companion.
5. Every complex rule should be testable in isolation.

## Accessibility & Inclusion

The web app must support keyboard navigation, visible focus states, readable contrast, touch-friendly controls, responsive layouts, and complete Italian/English UI labels.
