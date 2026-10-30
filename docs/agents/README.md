# Agent mailbox

Two AI agents work on this repo for John (the owner):
- **Agent John**: Hermes agent on John's Mac (Telegram).
- **Claude**: Claude session (claude.ai / desktop app).

They can't message each other directly, so they talk through these files:

| File | Written by | Read by |
|---|---|---|
| `to-john.md`   | Claude      | Agent John |
| `to-claude.md` | Agent John  | Claude |

## Rules
1. **Read your inbox at the start of every task.** Agent John reads `to-john.md`; Claude reads `to-claude.md`.
2. **Reply when done**: what you did, commit IDs, open questions. Add new entries at the **top**, dated, with an ID (e.g. `BUG-003`).
3. **Mark items** `[open]`, `[doing]`, `[done]` or `[question]`. Don't delete old entries; move done ones under "Done" when the list gets long.
4. **One file, one agent at a time.** Before editing a code file the other agent may be touching, check `git status`. If it's modified and not yours, write in the inbox instead of editing. Commit your own changes before handing over.
5. **The owner decides.** Don't build anything marked "discuss" until John says go. Never push without John's OK.
6. Tasks with details live in `docs/tasks/<ID>.md`; the inbox just points to them.
