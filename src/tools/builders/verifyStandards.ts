/**
 * Deterministic skill/standard verification.
 *
 * Logic delegated to bitbadgesjs-sdk's verifyStandardsCompliance() and
 * formatVerificationResult().
 *
 * This file re-exports those functions so the rest of the MCP codebase
 * (server.ts, builders/index.ts) can continue importing from this path.
 */

export {
  verifyStandardsCompliance,
  formatVerificationResult,
  type VerificationResult,
  type StandardViolation
} from 'bitbadgesjs-sdk';
