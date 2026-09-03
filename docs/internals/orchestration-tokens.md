# Orchestration Tokens

> Document type: **Internals** — read this page when changing the Arc Workshop clipboard format or its compatibility rules.

Creative sessions can transfer the selected tower's module sequence and targeting mode as one compact token. The clipboard contains only a case-sensitive Base62 string, using the alphabet `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz` without separators. This keeps the token opaque at a glance and lets ordinary text editors treat it as one selectable word.

## Version 1 layout

The decoded token is an unsigned big-endian byte sequence:

| Bytes | Contents |
| --- | --- |
| `0..1` | Magic bytes `50 42` |
| `2` | Format version `01` |
| `3` | Effective slot count in the high nibble; firing mode in the low nibble |
| `4` | Targeting code in the high three bits; reserved flags in the low five bits |
| `5..` | One unsigned 8-bit module code per effective slot |
| Final four | Big-endian CRC-32/ISO-HDLC of every preceding byte |

Trailing empty slots are omitted; empty slots inside the sequence use module code zero. Version 1 emits firing mode zero and reserved flags zero. A decoder must reject nonzero values as unsupported features rather than ignoring them. The four-bit slot count reserves capacity for 15 slots, the firing field reserves 16 modes, and the one-byte module code reserves identifiers 1 through 255.

`orchestration-codec.ts` owns the module codebook. Its order is wire protocol, not presentation order: never reorder, remove, or reuse an entry. New module identifiers are appended. Targeting codes similarly follow `TARGETING_MODES` and must retain their existing positions.

The CRC detects damaged or casually edited tokens; it is not an authenticity mechanism. Since the format and application are shipped to the browser, it does not attempt to prevent a determined author from producing another valid token.

## Application boundary

Decoding does not mutate combat state. `GameEngine.applyCreativeOrchestration` performs the mutation only after confirming a creative session, a selected tower, enough target slots, a known targeting mode, and registered modules. It clears unused target slots and publishes one configuration update. Any rejection leaves the tower unchanged.
