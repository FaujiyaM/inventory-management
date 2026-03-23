# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Factory Inventory Management System Demo - Full-stack application with Vue 3 frontend, Python FastAPI backend, and in-memory mock data loaded from JSON files (no database).

## Critical Tool Usage Rules

### Subagents
Use the Task tool with these specialized subagents for appropriate tasks:

- **vue-expert**: Use for Vue 3 frontend features, UI components, styling, and client-side functionality
  - Examples: Creating components, fixing reactivity issues, performance optimization, complex state management
  - **MANDATORY RULE: ANY time you need to create or significantly modify a .vue file, you MUST delegate to vue-expert**
- **code-reviewer**: Use after writing significant code to review quality and best practices
- **Explore**: Use for understanding codebase structure, searching for patterns, or answering questions about how components work
- **general-purpose**: Use for complex multi-step tasks or when other agents don't fit

### Skills
- **backend-api-test** skill: Use when writing or modifying tests in `tests/backend` directory with pytest and FastAPI TestClient

### MCP Tools
- **ALWAYS use GitHub MCP tools** (`mcp__github__*`) for ALL GitHub operations
  - Exception: Local branches only - use `git checkout -b` instead of `mcp__github__create_branch`
- **ALWAYS use Playwright MCP tools** (`mcp__playwright__*`) for browser testing
  - Test against: `http://localhost:3000` (frontend), `http://localhost:8001` (API)

## Stack
- **Frontend**: Vue 3 + Composition API + Vite (port 3000)
- **Backend**: Python FastAPI (port 8001)
- **Data**: JSON files in `server/data/` loaded via `server/mock_data.py`

## Commands

```bash
# Backend (port 8001, with reload)
cd server
uv run uvicorn main:app --port 8001 --reload
# or without reload:
uv run python main.py

# Frontend (port 3000)
cd client
npm run dev

# Run all backend tests
cd tests
uv run pytest backend/ -v

# Run a single test file
cd tests
uv run pytest backend/test_inventory.py -v

# Run a single test
cd tests
uv run pytest backend/test_inventory.py::test_function_name -v

# API docs (when server is running)
# http://localhost:8001/docs
```

## Architecture

### Data Flow
Filters (in `useFilters.js` composable) → `FilterBar.vue` (UI) → view components watch filter changes → `client/src/api.js` (axios) → FastAPI `main.py` (query params) → in-memory Python filtering → Pydantic response models → Vue computed properties for display.

### Frontend Composables (`client/src/composables/`)
- `useFilters.js` — shared singleton filter state (warehouse, category, month, status); all views import this
- `useAuth.js` — auth state used by `ProfileMenu` and `App.vue`
- `useI18n.js` — i18n translations; `t('key')` used throughout templates

### Backend Data Loading
`mock_data.py` loads all JSON files from `server/data/` at startup into module-level variables. `main.py` imports these directly. **Data is read-only at runtime** — mutations (purchase orders, tasks) are in-memory only and reset on server restart.

### Filter Constraints
- `GET /api/inventory` does NOT support `month` filter (inventory has no time dimension)
- `GET /api/demand` and `GET /api/backlog` accept no filters
- Month filter values: `YYYY-MM` format or `Q1-2025`/`Q2-2025`/`Q3-2025`/`Q4-2025`

### API Endpoints Not in Current CLAUDE.md
- `POST /api/purchase-orders` — create purchase order (in-memory, resets on restart)
- `GET /api/purchase-orders/{backlog_item_id}` — get PO by backlog item
- `GET /api/tasks`, `POST /api/tasks`, `DELETE /api/tasks/{id}`, `PATCH /api/tasks/{id}` — tasks (in-memory)
- `GET /api/reports/quarterly` — computed from orders data
- `GET /api/reports/monthly-trends` — computed from orders data

### Tests
Tests live in `tests/backend/` and use FastAPI `TestClient` (sync, no running server needed). `conftest.py` adds `server/` to `sys.path` and provides `client`, `sample_inventory_item`, and `sample_order` fixtures.

## API Endpoints
- `GET /api/inventory` - Filters: warehouse, category
- `GET /api/orders` - Filters: warehouse, category, status, month
- `GET /api/dashboard/summary` - All filters
- `GET /api/demand`, `/api/backlog` - No filters
- `GET /api/spending/*` - Summary, monthly, categories, transactions

## Common Issues
1. Use unique keys in v-for (not `index`) - use `sku`, `month`, etc.
2. Validate dates before `.getMonth()` calls
3. Update Pydantic models when changing JSON data structure
4. Inventory filters don't support month (no time dimension)
5. Revenue goals: $800K/month single, $9.6M YTD all months

## File Locations
- Views: `client/src/views/*.vue`
- API Client: `client/src/api.js`
- Backend: `server/main.py`, `server/mock_data.py`
- Data: `server/data/*.json`
- Styles: `client/src/App.vue`

## Code Style
- Always document non-obvious logic changes with comments

## Design System
- Colors: Slate/gray (#0f172a, #64748b, #e2e8f0)
- Status: green/blue/yellow/red
- Charts: Custom SVG, CSS Grid for layouts
- No emojis in UI
