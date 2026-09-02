---
name: claude-g
description: >-
  Invoke and consult the specialized Claude-G reasoning harness for deep architectural auditing,
  WebMCP protocol validation, complex React state machine debugging, and 3D canvas edge-case verification.
---

# Claude-G Reasoning & Code Audit Skill

Use this skill when you need an expert, multi-perspective code audit, formal verification of complex asynchronous state flows, or specialized debugging for WebMCP shopping and 3D canvas interactions.

## Verification Checklist

1. **WebMCP Protocol Compliance**:
   - Check JSON-RPC 2.0 schema conformances (`initialize`, `tools/list`, `tools/call`, `ping`).
   - Validate that all tools have valid `inputSchema`, description, and error handling.
   - Verify that event broadcast payloads match the `WebMCPEvent` union types.

2. **React State Machine & Event Dispatching**:
   - Inspect `ProductDisplayManager` for transition race conditions, missing timer cleanups, and atomic mode switches.
   - Ensure `ProductDetailView` bidirectional synchronization with `SELECT_SIZE`, `ADD_TO_CART`, and `CART_UPDATED`.
   - Validate keyboard navigation (Escape, ArrowLeft, ArrowRight) and back navigation.

3. **3D Canvas & Pointer Interactions**:
   - Verify pointer discrimination (click vs drag panning).
   - Ensure clean flight cancellation when user interacts with canvas during animated transitions.

4. **Testing & Build Verification**:
   - Run `bun run check` (`check:types` and `check:biome`).
   - Run `bun test` to execute all unit and protocol test suites.
   - Run `bun run build` to verify clean production Vite bundling.
