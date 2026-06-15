# EtsyOrchestrator: Autonomous Etsy Store Operator

## Architecture & Structure
* This repository powers an autonomous operator for a single Etsy store. Agents continuously add new products and refresh existing listings based on performance signals.
* Maintain clear boundaries between `/frontend`, `/backend`, and `/agents` directories.

## Workflow & Dependencies
* Backend software development explicitly waits for and builds upon finalized design handoffs. Do not begin backend execution until the design parameters are fully confirmed.
* Utilize test-driven development for all agent handoff scripts.

## Tech Stack
* LLM Orchestration: Anthropic (Claude Sonnet & Opus)
* Image Generation: Nano Banana API
* Dropshipping Integration: Printify API