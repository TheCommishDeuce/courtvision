# Lab: `/lab`

**Purpose:** ask the database anything. Plain-English examples bring fans in;
editable SQL and CSV keep power users here.

**Sample data:** `samples/lab.json`: the schema, all 6 example queries with
real results, and a real error response.

## Blocks

### 1. Example questions
- The same 6 as Home's "Try asking", as a list or menu. Picking one loads its
  SQL into the editor **and runs it**.
- Room to grow to ~20 examples, grouped by theme later.

### 2. Query builder (optional helper)
- Pick a relation (matches, player-perspective matches, head-to-head,
  players), then filters using the shared vocabulary (tour, surface, level,
  round, years, player names, stat ranges), then columns and sort.
- It **writes SQL into the editor**. The builder is a way to learn SQL,
  not a separate mode: after generating, the user edits the SQL freely.

### 3. SQL editor
- Monospace editor with syntax highlighting; up to 20,000 characters.
- **Run** (and ⌘/Ctrl+Enter). **Copy link** puts the SQL in the URL.
- Only single read-only `SELECT` / `WITH` queries are allowed. Anything else
  returns an error, shown like any other error.

### 4. Results
- Status line: `12 rows · 38 ms`. When capped: "Showing the first 1,000 rows:
  download CSV for up to 50,000".
- Data table: sortable client-side, sticky header, horizontal scroll allowed
  here (arbitrary columns). Numbers right-aligned.
- **Download CSV** (up to 50,000 rows).
- Player and tournament names in results are links where the column is
  obviously a player name (`winner_name`, `loser_name`, `player_name`,
  `opponent_name`, `name`).

### 5. Errors
- The database's message verbatim (it's useful: it names candidate columns and
  the line), shown near the editor, e.g. `Binder Error: Referenced column
  "nope" not found… Candidate bindings: "score", "is_upset"…`.
- Timeout (20 s): "Query took longer than 20 seconds. Add a LIMIT or narrow
  the filters."

### 6. Schema reference
- The 4 relations: `matches_main` (1.07M rows), `player_match_view`,
  `h2h_view`, `players`. Each column with its type **and a plain-English
  meaning** (from 04-data-dictionary).
- Click a column name to insert it at the cursor.
- Visible next to the editor on desktop; a drawer on phones.

## Limits (show them where relevant, not as a wall of text)
1,000 rows on screen · 50,000 rows per CSV · 20 s per query · 20,000
characters of SQL.
