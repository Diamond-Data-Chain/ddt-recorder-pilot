import { createHash } from "node:crypto";
import type { DDTNormalizedRecord } from "../normalize/normalize";
import {
  verifyIdentityAuthoritySignatureProof,
} from "./verifyRecord";

export const HISTORICAL_IDENTITY_AUTHORITY_AXES = [
  "SIGNING_KEY_IDENTITY",
  "SIGNING_KEY_LIFECYCLE",
  "REGISTRANT_IDENTITY",
  "REGISTRANT_AUTHORITY",
] as const;

export type DDTHistoricalIdentityAuthorityAxis =
  (typeof HISTORICAL_IDENTITY_AUTHORITY_AXES)[number];

export const HISTORICAL_IDENTITY_AUTHORITY_EVIDENCE_TYPES = [
  "VERIFICATION_METHOD_DESCRIPTOR",
  "KEY_LIFECYCLE_EVENT",
  "IDENTITY_BINDING",
  "IDENTITY_BINDING_STATUS_EVENT",
  "AUTHORITY_GRANT",
  "AUTHORITY_STATUS_EVENT",
] as const;

export type DDTHistoricalIdentityAuthorityEvidenceType =
  (typeof HISTORICAL_IDENTITY_AUTHORITY_EVIDENCE_TYPES)[number];

export type DDTHistoricalIdentityAuthorityEvidence = {
  evidenceId: string;
  evidenceType: DDTHistoricalIdentityAuthorityEvidenceType;
  evidenceVersion: "0.1.0-draft.1";
  issuer: {
    identityRef: string;
    verificationMethod: string;
    proofRef: string;
    authorityEvidenceRefs: string[];
  };
  effectiveOrder: {
    basis:
      | "INDEPENDENT_TIME_PROOF"
      | "DDT_NETWORK_ORDER"
      | "AUTHORITATIVE_SEQUENCE"
      | "ISSUER_TIME_CLAIM_ONLY";
    effectiveFromClaim?: string;
    effectiveUntilClaim?: string;
    sequence?: number;
    evidenceRefs: string[];
  };
  body: unknown;
};

export type DDTHistoricalKeyLifecycleEvent = {
  verificationMethodId: string;
  eventType:
    | "ACTIVATE"
    | "SUSPEND"
    | "RESUME"
    | "ROTATE_OUT"
    | "REVOKE"
    | "EXPIRE"
    | "COMPROMISE_DECLARED";
  sequence: number;
  previousEvent?: {
    evidenceId: string;
    digest: {
      algorithm: string;
      value: string;
    };
  };
  replacementVerificationMethodId?: string;
  effect?: "PROSPECTIVE" | "RETROACTIVE_CLAIM";
  reasonCode: string;
  supportingEvidenceRefs: string[];
};

export type DDTHistoricalIdentityBinding = {
  bindingId: string;
  cryptographicControllerRef: string;
  boundIdentityRef: string;
  identityNamespace: string;
  bindingScopes: string[];
  assuranceProfile: unknown;
  supportingEvidenceRefs: string[];
};

export type DDTHistoricalIdentityBindingStatusEvent = {
  bindingId: string;
  eventType:
    | "ACTIVATE"
    | "SUSPEND"
    | "RESUME"
    | "REVOKE"
    | "EXPIRE"
    | "SUPERSEDE";
  sequence: number;
  previousEvent?: {
    evidenceId: string;
    digest: {
      algorithm: string;
      value: string;
    };
  };
  successorBindingId?: string;
  effect?: "PROSPECTIVE" | "RETROACTIVE_CLAIM";
  reasonCode: string;
  supportingEvidenceRefs: string[];
};

export type DDTHistoricalAuthorityScope = {
  proofPurposes: string[];
  actions: string[];
  recordTypes: string[];
  subjectNamespaces: string[];
  organizationScopes: string[];
  domainScopes: string[];
  constraints?: Record<string, unknown>;
};

export type DDTHistoricalAuthorityDelegation = {
  permitted: boolean;
  remainingDepth: number;
  scopeAmplificationForbidden: true;
};

export type DDTHistoricalAuthorityGrant = {
  grantId: string;
  grantorIdentityRef: string;
  granteeIdentityRef: string;
  role: string;
  scope: DDTHistoricalAuthorityScope;
  delegation: DDTHistoricalAuthorityDelegation;
  parentGrantRefs: string[];
  supportingEvidenceRefs: string[];
};

export type DDTHistoricalAuthorityStatusEvent = {
  grantId: string;
  eventType:
    | "ACTIVATE"
    | "SUSPEND"
    | "RESUME"
    | "REVOKE"
    | "TERMINATE"
    | "SUPERSEDE";
  sequence: number;
  previousEvent?: {
    evidenceId: string;
    digest: {
      algorithm: string;
      value: string;
    };
  };
  successorGrantId?: string;
  effect?: "PROSPECTIVE" | "RETROACTIVE_CLAIM";
  reasonCode: string;
  supportingEvidenceRefs: string[];
};

export type DDTHistoricalVerificationMethodDescriptor = {
  verificationMethodId: string;
  controllerRef: string;
  algorithm: string;
  publicKey: unknown;
  permittedPurposes: string[];
};

export type DDTHistoricalIdentityAuthorityEvidenceItem = {
  sourceEvidenceIndex: number;
  manifestEvidenceRef: string;
  manifestCommitment: {
    algorithm: string;
    value: string;
  };
  name: string;
  evidence: DDTHistoricalIdentityAuthorityEvidence;
};

export type DDTHistoricalIdentityAuthorityEvidenceCollection = {
  applicable: boolean;
  evidence: DDTHistoricalIdentityAuthorityEvidenceItem[];
  reasonCodes: string[];
};

function isObject(
  value: unknown
): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.every(isNonEmptyString)
  );
}

function parseAuthorityScope(
  value: unknown
): DDTHistoricalAuthorityScope | null {
  if (!isObject(value)) {
    return null;
  }

  if (
    !isStringArray(value.proofPurposes) ||
    !isStringArray(value.actions) ||
    value.actions.length === 0 ||
    !isStringArray(value.recordTypes) ||
    !isStringArray(value.subjectNamespaces) ||
    !isStringArray(value.organizationScopes) ||
    !isStringArray(value.domainScopes)
  ) {
    return null;
  }

  if (
    value.constraints !== undefined &&
    (!isObject(value.constraints) ||
      Object.keys(value.constraints).length > 1000)
  ) {
    return null;
  }

  return {
    proofPurposes: value.proofPurposes,
    actions: value.actions,
    recordTypes: value.recordTypes,
    subjectNamespaces: value.subjectNamespaces,
    organizationScopes: value.organizationScopes,
    domainScopes: value.domainScopes,
    ...(value.constraints !== undefined
      ? { constraints: value.constraints }
      : {}),
  };
}

function parseAuthorityDelegation(
  value: unknown
): DDTHistoricalAuthorityDelegation | null {
  if (
    !isObject(value) ||
    typeof value.permitted !== "boolean" ||
    typeof value.remainingDepth !== "number" ||
    !Number.isInteger(value.remainingDepth) ||
    value.remainingDepth < 0 ||
    value.remainingDepth > 100 ||
    value.scopeAmplificationForbidden !== true ||
    (value.permitted === false && value.remainingDepth !== 0)
  ) {
    return null;
  }

  return {
    permitted: value.permitted,
    remainingDepth: value.remainingDepth,
    scopeAmplificationForbidden: true,
  };
}

function parseAuthorityGrantBody(
  value: unknown
): DDTHistoricalAuthorityGrant | null {
  if (!isObject(value)) {
    return null;
  }

  const scope = parseAuthorityScope(value.scope);
  const delegation = parseAuthorityDelegation(value.delegation);

  if (
    !isNonEmptyString(value.grantId) ||
    !isNonEmptyString(value.grantorIdentityRef) ||
    !isNonEmptyString(value.granteeIdentityRef) ||
    !isNonEmptyString(value.role) ||
    !scope ||
    !delegation ||
    !isStringArray(value.parentGrantRefs) ||
    !isStringArray(value.supportingEvidenceRefs)
  ) {
    return null;
  }

  return {
    grantId: value.grantId,
    grantorIdentityRef: value.grantorIdentityRef,
    granteeIdentityRef: value.granteeIdentityRef,
    role: value.role,
    scope,
    delegation,
    parentGrantRefs: value.parentGrantRefs,
    supportingEvidenceRefs: value.supportingEvidenceRefs,
  };
}

function parseAuthorityStatusEventBody(
  value: unknown
): DDTHistoricalAuthorityStatusEvent | null {
  if (!isObject(value)) {
    return null;
  }

  const eventTypes = new Set([
    "ACTIVATE",
    "SUSPEND",
    "RESUME",
    "REVOKE",
    "TERMINATE",
    "SUPERSEDE",
  ]);

  if (
    !isNonEmptyString(value.grantId) ||
    !isNonEmptyString(value.eventType) ||
    !eventTypes.has(value.eventType) ||
    typeof value.sequence !== "number" ||
    !Number.isInteger(value.sequence) ||
    value.sequence < 0 ||
    !isNonEmptyString(value.reasonCode) ||
    !isStringArray(value.supportingEvidenceRefs)
  ) {
    return null;
  }

  let previousEvent:
    | DDTHistoricalAuthorityStatusEvent["previousEvent"]
    | undefined;

  if (value.previousEvent !== undefined) {
    if (
      !isObject(value.previousEvent) ||
      !isNonEmptyString(value.previousEvent.evidenceId) ||
      !isObject(value.previousEvent.digest) ||
      !isNonEmptyString(value.previousEvent.digest.algorithm) ||
      !isNonEmptyString(value.previousEvent.digest.value)
    ) {
      return null;
    }

    previousEvent = {
      evidenceId: value.previousEvent.evidenceId,
      digest: {
        algorithm: value.previousEvent.digest.algorithm,
        value: value.previousEvent.digest.value,
      },
    };
  }

  if (
    (value.sequence === 0 && previousEvent !== undefined) ||
    (value.sequence > 0 && previousEvent === undefined)
  ) {
    return null;
  }

  let successorGrantId: string | undefined;

  if (value.successorGrantId !== undefined) {
    if (!isNonEmptyString(value.successorGrantId)) {
      return null;
    }
    successorGrantId = value.successorGrantId;
  }

  if (
    value.eventType === "SUPERSEDE" &&
    successorGrantId === undefined
  ) {
    return null;
  }

  let effect: DDTHistoricalAuthorityStatusEvent["effect"] | undefined;

  if (value.effect !== undefined) {
    if (
      value.effect !== "PROSPECTIVE" &&
      value.effect !== "RETROACTIVE_CLAIM"
    ) {
      return null;
    }
    effect = value.effect;
  }

  return {
    grantId: value.grantId,
    eventType:
      value.eventType as DDTHistoricalAuthorityStatusEvent["eventType"],
    sequence: value.sequence,
    ...(previousEvent ? { previousEvent } : {}),
    ...(successorGrantId ? { successorGrantId } : {}),
    ...(effect ? { effect } : {}),
    reasonCode: value.reasonCode,
    supportingEvidenceRefs: value.supportingEvidenceRefs,
  };
}

function parseIdentityBindingBody(
  value: unknown
): DDTHistoricalIdentityBinding | null {
  if (!isObject(value)) {
    return null;
  }

  const allowedScopes = new Set([
    "KEY_CONTROLLER",
    "DDT_REGISTRANT",
    "VALIDATOR",
    "VERIFIER",
    "WITNESS",
    "AUTHORITY_ISSUER",
  ]);

  if (
    !isNonEmptyString(value.bindingId) ||
    !isNonEmptyString(value.cryptographicControllerRef) ||
    !isNonEmptyString(value.boundIdentityRef) ||
    !isNonEmptyString(value.identityNamespace) ||
    !Array.isArray(value.bindingScopes) ||
    value.bindingScopes.length === 0 ||
    !value.bindingScopes.every(
      (scope) =>
        isNonEmptyString(scope) &&
        allowedScopes.has(scope)
    ) ||
    new Set(value.bindingScopes).size !==
      value.bindingScopes.length ||
    !isObject(value.assuranceProfile) ||
    !isStringArray(value.supportingEvidenceRefs) ||
    value.supportingEvidenceRefs.length === 0
  ) {
    return null;
  }

  return {
    bindingId: value.bindingId,
    cryptographicControllerRef:
      value.cryptographicControllerRef,
    boundIdentityRef: value.boundIdentityRef,
    identityNamespace: value.identityNamespace,
    bindingScopes: value.bindingScopes as string[],
    assuranceProfile: value.assuranceProfile,
    supportingEvidenceRefs: value.supportingEvidenceRefs,
  };
}

function parseIdentityBindingStatusEventBody(
  value: unknown
): DDTHistoricalIdentityBindingStatusEvent | null {
  if (!isObject(value)) {
    return null;
  }

  const eventTypes = new Set([
    "ACTIVATE",
    "SUSPEND",
    "RESUME",
    "REVOKE",
    "EXPIRE",
    "SUPERSEDE",
  ]);

  if (
    !isNonEmptyString(value.bindingId) ||
    !isNonEmptyString(value.eventType) ||
    !eventTypes.has(value.eventType) ||
    typeof value.sequence !== "number" ||
    !Number.isInteger(value.sequence) ||
    value.sequence < 0 ||
    !isNonEmptyString(value.reasonCode) ||
    !isStringArray(value.supportingEvidenceRefs)
  ) {
    return null;
  }

  let previousEvent:
    | DDTHistoricalIdentityBindingStatusEvent["previousEvent"]
    | undefined;

  if (value.previousEvent !== undefined) {
    if (
      !isObject(value.previousEvent) ||
      !isNonEmptyString(value.previousEvent.evidenceId) ||
      !isObject(value.previousEvent.digest) ||
      !isNonEmptyString(value.previousEvent.digest.algorithm) ||
      !isNonEmptyString(value.previousEvent.digest.value)
    ) {
      return null;
    }

    previousEvent = {
      evidenceId: value.previousEvent.evidenceId,
      digest: {
        algorithm: value.previousEvent.digest.algorithm,
        value: value.previousEvent.digest.value,
      },
    };
  }

  if (
    (value.sequence === 0 && previousEvent !== undefined) ||
    (value.sequence > 0 && previousEvent === undefined)
  ) {
    return null;
  }

  let successorBindingId: string | undefined;

  if (value.successorBindingId !== undefined) {
    if (!isNonEmptyString(value.successorBindingId)) {
      return null;
    }

    successorBindingId = value.successorBindingId;
  }

  if (
    value.eventType === "SUPERSEDE" &&
    successorBindingId === undefined
  ) {
    return null;
  }

  let effect:
    | DDTHistoricalIdentityBindingStatusEvent["effect"]
    | undefined;

  if (value.effect !== undefined) {
    if (
      value.effect !== "PROSPECTIVE" &&
      value.effect !== "RETROACTIVE_CLAIM"
    ) {
      return null;
    }

    effect = value.effect;
  }

  return {
    bindingId: value.bindingId,
    eventType:
      value.eventType as DDTHistoricalIdentityBindingStatusEvent["eventType"],
    sequence: value.sequence,
    ...(previousEvent ? { previousEvent } : {}),
    ...(successorBindingId ? { successorBindingId } : {}),
    ...(effect ? { effect } : {}),
    reasonCode: value.reasonCode,
    supportingEvidenceRefs: value.supportingEvidenceRefs,
  };
}

function parseKeyLifecycleEventBody(
  value: unknown
): DDTHistoricalKeyLifecycleEvent | null {
  if (!isObject(value)) {
    return null;
  }

  const eventTypes = new Set([
    "ACTIVATE",
    "SUSPEND",
    "RESUME",
    "ROTATE_OUT",
    "REVOKE",
    "EXPIRE",
    "COMPROMISE_DECLARED",
  ]);

  if (
    !isNonEmptyString(value.verificationMethodId) ||
    !isNonEmptyString(value.eventType) ||
    !eventTypes.has(value.eventType) ||
    typeof value.sequence !== "number" ||
    !Number.isInteger(value.sequence) ||
    value.sequence < 0 ||
    !isNonEmptyString(value.reasonCode) ||
    !isStringArray(value.supportingEvidenceRefs)
  ) {
    return null;
  }

  let previousEvent:
    | DDTHistoricalKeyLifecycleEvent["previousEvent"]
    | undefined;

  if (value.previousEvent !== undefined) {
    if (
      !isObject(value.previousEvent) ||
      !isNonEmptyString(value.previousEvent.evidenceId) ||
      !isObject(value.previousEvent.digest) ||
      !isNonEmptyString(value.previousEvent.digest.algorithm) ||
      !isNonEmptyString(value.previousEvent.digest.value)
    ) {
      return null;
    }

    previousEvent = {
      evidenceId: value.previousEvent.evidenceId,
      digest: {
        algorithm: value.previousEvent.digest.algorithm,
        value: value.previousEvent.digest.value,
      },
    };
  }

  if (
    (value.sequence === 0 && previousEvent !== undefined) ||
    (value.sequence > 0 && previousEvent === undefined)
  ) {
    return null;
  }

  let replacementVerificationMethodId: string | undefined;

  if (value.replacementVerificationMethodId !== undefined) {
    if (!isNonEmptyString(value.replacementVerificationMethodId)) {
      return null;
    }

    replacementVerificationMethodId =
      value.replacementVerificationMethodId;
  }

  if (
    value.eventType === "ROTATE_OUT" &&
    replacementVerificationMethodId === undefined
  ) {
    return null;
  }

  let effect:
    | DDTHistoricalKeyLifecycleEvent["effect"]
    | undefined;

  if (value.effect !== undefined) {
    if (
      value.effect !== "PROSPECTIVE" &&
      value.effect !== "RETROACTIVE_CLAIM"
    ) {
      return null;
    }

    effect = value.effect;
  }

  return {
    verificationMethodId: value.verificationMethodId,
    eventType:
      value.eventType as DDTHistoricalKeyLifecycleEvent["eventType"],
    sequence: value.sequence,
    ...(previousEvent ? { previousEvent } : {}),
    ...(replacementVerificationMethodId
      ? { replacementVerificationMethodId }
      : {}),
    ...(effect ? { effect } : {}),
    reasonCode: value.reasonCode,
    supportingEvidenceRefs: value.supportingEvidenceRefs,
  };
}

type DDTRegistrantIdentityBindingResolution = {
  bindingItem?: DDTHistoricalIdentityAuthorityEvidenceItem;
  binding?: DDTHistoricalIdentityBinding;
  reasonCodes: string[];
};

function resolveRegistrantIdentityBinding(
  evidenceItems: readonly DDTHistoricalIdentityAuthorityEvidenceItem[],
  descriptorItems: readonly DDTHistoricalIdentityAuthorityEvidenceItem[],
  signingContext?: DDTHistoricalIdentityAuthoritySigningContext
): DDTRegistrantIdentityBindingResolution {
  if (!signingContext) {
    return {
      reasonCodes: ["IDENTITY_BINDING_UNRESOLVED"],
    };
  }

  const controllerRefs = [
    ...new Set(
      descriptorItems
        .map(({ evidence }) =>
          isObject(evidence.body) &&
          isNonEmptyString(evidence.body.controllerRef)
            ? evidence.body.controllerRef
            : null
        )
        .filter((value): value is string => value !== null)
    ),
  ];

  if (controllerRefs.length === 0) {
    return {
      reasonCodes: ["KEY_CONTROLLER_UNRESOLVED"],
    };
  }

  if (controllerRefs.length > 1) {
    return {
      reasonCodes: ["IDENTITY_BINDING_AMBIGUOUS"],
    };
  }

  const controllerRef = controllerRefs[0];

  const candidates = evidenceItems
    .filter(
      ({ evidence }) =>
        evidence.evidenceType === "IDENTITY_BINDING"
    )
    .map((item) => ({
      item,
      binding: parseIdentityBindingBody(item.evidence.body),
    }))
    .filter(
      (
        entry
      ): entry is {
        item: DDTHistoricalIdentityAuthorityEvidenceItem;
        binding: DDTHistoricalIdentityBinding;
      } =>
        entry.binding !== null &&
        entry.binding.cryptographicControllerRef === controllerRef &&
        entry.binding.boundIdentityRef ===
          signingContext.registrant.identityRef &&
        entry.binding.bindingScopes.includes("DDT_REGISTRANT")
    );

  if (candidates.length === 0) {
    return {
      reasonCodes: ["IDENTITY_BINDING_UNAVAILABLE"],
    };
  }

  if (candidates.length > 1) {
    return {
      reasonCodes: ["IDENTITY_BINDING_AMBIGUOUS"],
    };
  }

  return {
    bindingItem: candidates[0].item,
    binding: candidates[0].binding,
    reasonCodes: [],
  };
}

type DDTAuthorityStatusChainEvaluation = {
  items: Array<{
    item: DDTHistoricalIdentityAuthorityEvidenceItem;
    event: DDTHistoricalAuthorityStatusEvent;
  }>;
  reasonCodes: string[];
};

function evaluateAuthorityStatusChain(
  evidenceItems: readonly DDTHistoricalIdentityAuthorityEvidenceItem[],
  grantId: string
): DDTAuthorityStatusChainEvaluation {
  const parsedItems = evidenceItems
    .filter(
      ({ evidence }) =>
        evidence.evidenceType === "AUTHORITY_STATUS_EVENT"
    )
    .map((item) => ({
      item,
      event: parseAuthorityStatusEventBody(item.evidence.body),
    }))
    .filter(
      (entry): entry is {
        item: DDTHistoricalIdentityAuthorityEvidenceItem;
        event: DDTHistoricalAuthorityStatusEvent;
      } =>
        entry.event !== null &&
        entry.event.grantId === grantId
    );

  if (parsedItems.length === 0) {
    return {
      items: [],
      reasonCodes: ["AUTHORITY_STATUS_UNRESOLVED"],
    };
  }

  const bySequence = new Map<
    number,
    Array<(typeof parsedItems)[number]>
  >();

  for (const entry of parsedItems) {
    const existing =
      bySequence.get(entry.event.sequence) ?? [];
    existing.push(entry);
    bySequence.set(entry.event.sequence, existing);
  }

  if (
    [...bySequence.values()].some(
      (entries) => entries.length > 1
    )
  ) {
    return {
      items: parsedItems,
      reasonCodes: ["AUTHORITY_STATE_AMBIGUOUS"],
    };
  }

  const ordered = [...parsedItems].sort(
    (a, b) => a.event.sequence - b.event.sequence
  );

  if (ordered[0].event.sequence !== 0) {
    return {
      items: ordered,
      reasonCodes: ["AUTHORITY_GRANT_CHAIN_INCOMPLETE"],
    };
  }

  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];

    if (
      current.event.sequence !==
      previous.event.sequence + 1
    ) {
      return {
        items: ordered,
        reasonCodes: ["AUTHORITY_GRANT_CHAIN_INCOMPLETE"],
      };
    }

    const previousLink = current.event.previousEvent;

    if (
      !previousLink ||
      previousLink.evidenceId !==
        previous.item.evidence.evidenceId ||
      previousLink.digest.algorithm !==
        previous.item.manifestCommitment.algorithm ||
      previousLink.digest.value !==
        previous.item.manifestCommitment.value
    ) {
      return {
        items: ordered,
        reasonCodes: ["AUTHORITY_GRANT_CHAIN_INCOMPLETE"],
      };
    }
  }

  return {
    items: ordered,
    reasonCodes: [],
  };
}

function selectAuthorityStatusAtRelevantMoment(
  chain: DDTAuthorityStatusChainEvaluation,
  relevantMoment?: DDTHistoricalIdentityAuthorityRelevantMoment
): DDTAuthorityStatusChainEvaluation {
  if (chain.reasonCodes.length > 0 || !relevantMoment) {
    return chain;
  }

  if (
    relevantMoment.orderBasis !== "AUTHORITATIVE_SEQUENCE" ||
    typeof relevantMoment.sequence !== "number" ||
    !Number.isInteger(relevantMoment.sequence) ||
    relevantMoment.sequence < 0
  ) {
    return {
      items: [],
      reasonCodes: ["HISTORICAL_MOMENT_UNRESOLVED"],
    };
  }

  if (
    chain.items.some(({ item }) =>
      item.evidence.effectiveOrder.basis !==
        "AUTHORITATIVE_SEQUENCE" ||
      typeof item.evidence.effectiveOrder.sequence !== "number" ||
      !Number.isInteger(item.evidence.effectiveOrder.sequence) ||
      item.evidence.effectiveOrder.sequence < 0
    )
  ) {
    return {
      items: [],
      reasonCodes: ["HISTORICAL_ORDER_EVIDENCE_UNRESOLVED"],
    };
  }

  const selected = chain.items.filter(
    ({ item }) =>
      item.evidence.effectiveOrder.sequence! <=
      relevantMoment.sequence!
  );

  if (selected.length === 0) {
    return {
      items: [],
      reasonCodes: ["HISTORICAL_MOMENT_UNRESOLVED"],
    };
  }

  const selectedIds = new Set(
    selected.map(({ item }) => item.evidence.evidenceId)
  );

  const prefix = chain.items.slice(0, selected.length);

  if (
    prefix.some(
      ({ item }) => !selectedIds.has(item.evidence.evidenceId)
    )
  ) {
    return {
      items: [],
      reasonCodes: ["HISTORICAL_ORDER_EVIDENCE_UNRESOLVED"],
    };
  }

  return {
    items: prefix,
    reasonCodes: [],
  };
}

type DDTAuthorityDerivedState =
  | "ACTIVE"
  | "SUSPENDED"
  | "REVOKED"
  | "TERMINATED"
  | "SUPERSEDED"
  | "UNRESOLVED";

type DDTAuthorityStateEvaluation = {
  state: DDTAuthorityDerivedState;
  reasonCodes: string[];
};

function deriveAuthorityState(
  chain: DDTAuthorityStatusChainEvaluation
): DDTAuthorityStateEvaluation {
  if (
    chain.reasonCodes.length > 0 ||
    chain.items.length === 0
  ) {
    return {
      state: "UNRESOLVED",
      reasonCodes:
        chain.reasonCodes.length > 0
          ? chain.reasonCodes
          : ["AUTHORITY_STATUS_UNRESOLVED"],
    };
  }

  let state: DDTAuthorityDerivedState = "UNRESOLVED";

  for (const { event } of chain.items) {
    if (event.effect === "RETROACTIVE_CLAIM") {
      return {
        state: "UNRESOLVED",
        reasonCodes: ["RETROACTIVE_EFFECT_UNRESOLVED"],
      };
    }

    if (
      state === "REVOKED" ||
      state === "TERMINATED" ||
      state === "SUPERSEDED"
    ) {
      return {
        state: "UNRESOLVED",
        reasonCodes: ["AUTHORITY_STATE_AMBIGUOUS"],
      };
    }

    switch (event.eventType) {
      case "ACTIVATE":
        if (state !== "UNRESOLVED") {
          return {
            state: "UNRESOLVED",
            reasonCodes: ["AUTHORITY_STATE_AMBIGUOUS"],
          };
        }
        state = "ACTIVE";
        break;

      case "SUSPEND":
        if (state !== "ACTIVE") {
          return {
            state: "UNRESOLVED",
            reasonCodes: ["AUTHORITY_STATE_AMBIGUOUS"],
          };
        }
        state = "SUSPENDED";
        break;

      case "RESUME":
        if (state !== "SUSPENDED") {
          return {
            state: "UNRESOLVED",
            reasonCodes: ["AUTHORITY_STATE_AMBIGUOUS"],
          };
        }
        state = "ACTIVE";
        break;

      case "REVOKE":
        state = "REVOKED";
        break;

      case "TERMINATE":
        state = "TERMINATED";
        break;

      case "SUPERSEDE":
        state = "SUPERSEDED";
        break;
    }
  }

  return {
    state,
    reasonCodes:
      state === "ACTIVE"
        ? []
        : ["AUTHORITY_GRANT_INVALID"],
  };
}

type DDTAuthorityGrantChainEvaluation = {
  items: Array<{
    item: DDTHistoricalIdentityAuthorityEvidenceItem;
    grant: DDTHistoricalAuthorityGrant;
  }>;
  reasonCodes: string[];
};

function evaluateAuthorityGrantChain(
  evidenceItems: readonly DDTHistoricalIdentityAuthorityEvidenceItem[],
  leafGrant: {
    item: DDTHistoricalIdentityAuthorityEvidenceItem;
    grant: DDTHistoricalAuthorityGrant;
  }
): DDTAuthorityGrantChainEvaluation {
  const grants = evidenceItems
    .filter(
      ({ evidence }) =>
        evidence.evidenceType === "AUTHORITY_GRANT"
    )
    .map((item) => ({
      item,
      grant: parseAuthorityGrantBody(item.evidence.body),
    }))
    .filter(
      (entry): entry is {
        item: DDTHistoricalIdentityAuthorityEvidenceItem;
        grant: DDTHistoricalAuthorityGrant;
      } => entry.grant !== null
    );

  const byEvidenceId = new Map(
    grants.map((entry) => [
      entry.item.evidence.evidenceId,
      entry,
    ])
  );

  const chain: typeof grants = [];
  const visited = new Set<string>();

  let current:
    | (typeof grants)[number]
    | undefined = leafGrant;

  while (current) {
    const evidenceId =
      current.item.evidence.evidenceId;

    if (visited.has(evidenceId)) {
      return {
        items: chain,
        reasonCodes: ["AUTHORITY_GRANT_INVALID"],
      };
    }

    visited.add(evidenceId);
    chain.push(current);

    const parentRefs =
      current.grant.parentGrantRefs;

    if (parentRefs.length === 0) {
      break;
    }

    if (parentRefs.length !== 1) {
      return {
        items: chain,
        reasonCodes: ["AUTHORITY_GRANT_CHAIN_INCOMPLETE"],
      };
    }

    const parent = byEvidenceId.get(parentRefs[0]);

    if (!parent) {
      return {
        items: chain,
        reasonCodes: ["AUTHORITY_GRANT_CHAIN_INCOMPLETE"],
      };
    }

    if (
      parent.grant.granteeIdentityRef !==
      current.grant.grantorIdentityRef
    ) {
      return {
        items: chain,
        reasonCodes: ["AUTHORITY_GRANT_INVALID"],
      };
    }

    if (!parent.grant.delegation.permitted) {
      return {
        items: chain,
        reasonCodes: ["AUTHORITY_GRANT_INVALID"],
      };
    }

    if (
      parent.grant.delegation.remainingDepth <= 0
    ) {
      return {
        items: chain,
        reasonCodes: ["AUTHORITY_GRANT_INVALID"],
      };
    }

    if (
      current.grant.delegation.remainingDepth >=
      parent.grant.delegation.remainingDepth
    ) {
      return {
        items: chain,
        reasonCodes: ["AUTHORITY_GRANT_INVALID"],
      };
    }

    current = parent;
  }

  return {
    items: chain,
    reasonCodes: [],
  };
}

function evaluateAuthorityRoot(
  chain: DDTAuthorityGrantChainEvaluation,
  trustConfiguration?: DDTHistoricalIdentityAuthorityTrustConfiguration
): string[] {
  if (chain.reasonCodes.length > 0) {
    return chain.reasonCodes;
  }

  if (chain.items.length === 0) {
    return ["AUTHORITY_GRANT_CHAIN_INCOMPLETE"];
  }

  const roots = trustConfiguration?.authorityRoots;

  if (!roots || roots.length === 0) {
    return ["TRUST_CONFIGURATION_UNAVAILABLE"];
  }

  const rootGrant = chain.items[chain.items.length - 1].grant;

  if (rootGrant.parentGrantRefs.length !== 0) {
    return ["AUTHORITY_GRANT_CHAIN_INCOMPLETE"];
  }

  const matchedRoot = roots.some(
    (root) =>
      root.identityRef === rootGrant.grantorIdentityRef &&
      root.acceptedGrantorRoles.includes(rootGrant.role)
  );

  if (!matchedRoot) {
    return ["AUTHORITY_GRANT_CHAIN_INCOMPLETE"];
  }

  return [];
}

function authorityScopeArrayIsSubset(
  child: readonly string[],
  parent: readonly string[],
  emptyArrayMeaning: "NO_VALUES_PERMITTED" | "UNRESTRICTED"
): boolean {
  if (parent.length === 0) {
    return emptyArrayMeaning === "UNRESTRICTED" || child.length === 0;
  }

  if (child.length === 0) {
    return emptyArrayMeaning === "NO_VALUES_PERMITTED";
  }

  const parentValues = new Set(parent);
  return child.every((value) => parentValues.has(value));
}

function authorityConstraintsEqual(
  child: Record<string, unknown> | undefined,
  parent: Record<string, unknown> | undefined
): boolean {
  const normalize = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(normalize);
    }

    if (value !== null && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, nested]) => [key, normalize(nested)])
      );
    }

    return value;
  };

  return (
    JSON.stringify(normalize(child ?? {})) ===
    JSON.stringify(normalize(parent ?? {}))
  );
}

function evaluateRegistrationAgainstAuthorityScope(
  record: DDTNormalizedRecord,
  resolution: DDTRegistrantAuthorityGrantResolution,
  trustConfiguration?: DDTHistoricalIdentityAuthorityTrustConfiguration,
  referenceRecorderPolicy?: DDTReferenceRecorderHistoricalIAPolicy
): string[] {
  if (resolution.reasonCodes.length > 0) {
    return resolution.reasonCodes;
  }

  if (!resolution.grant) {
    return ["AUTHORITY_EVIDENCE_UNAVAILABLE"];
  }

  const policy = trustConfiguration?.scopeMatchingPolicy;

  if (
    !policy ||
    policy.arraySemantics !==
      "CHILD_VALUES_MUST_BE_SUBSET_OF_PARENT" ||
    !referenceRecorderPolicy
  ) {
    return ["TRUST_CONFIGURATION_UNAVAILABLE"];
  }

  const scope = resolution.grant.scope;
  const registrationScope =
    referenceRecorderPolicy.registrationAuthorityScope;

  if (
    !authorityScopeArrayIsSubset(
      [registrationScope.action],
      scope.actions,
      policy.emptyArrayMeaning
    ) ||
    !authorityScopeArrayIsSubset(
      [registrationScope.proofPurpose],
      scope.proofPurposes,
      policy.emptyArrayMeaning
    ) ||
    !authorityScopeArrayIsSubset(
      [record.recordType],
      scope.recordTypes,
      policy.emptyArrayMeaning
    ) ||
    !authorityScopeArrayIsSubset(
      [record.subject.namespace],
      scope.subjectNamespaces,
      policy.emptyArrayMeaning
    ) ||
    !authorityScopeArrayIsSubset(
      registrationScope.organizationScopes,
      scope.organizationScopes,
      policy.emptyArrayMeaning
    ) ||
    !authorityScopeArrayIsSubset(
      registrationScope.domainScopes,
      scope.domainScopes,
      policy.emptyArrayMeaning
    )
  ) {
    return ["AUTHORITY_SCOPE_MISMATCH"];
  }

  return [];
}

function evaluateAuthorityScopeAmplification(
  chain: DDTAuthorityGrantChainEvaluation,
  trustConfiguration?: DDTHistoricalIdentityAuthorityTrustConfiguration
): string[] {
  if (chain.reasonCodes.length > 0) {
    return chain.reasonCodes;
  }

  const policy = trustConfiguration?.scopeMatchingPolicy;

  if (!policy) {
    return ["TRUST_CONFIGURATION_UNAVAILABLE"];
  }

  if (
    policy.arraySemantics !==
    "CHILD_VALUES_MUST_BE_SUBSET_OF_PARENT"
  ) {
    return ["TRUST_CONFIGURATION_UNAVAILABLE"];
  }

  for (let index = 0; index < chain.items.length - 1; index += 1) {
    const child = chain.items[index].grant.scope;
    const parent = chain.items[index + 1].grant.scope;

    const dimensions: Array<
      [readonly string[], readonly string[]]
    > = [
      [child.actions, parent.actions],
      [child.proofPurposes, parent.proofPurposes],
      [child.recordTypes, parent.recordTypes],
      [child.subjectNamespaces, parent.subjectNamespaces],
      [child.organizationScopes, parent.organizationScopes],
      [child.domainScopes, parent.domainScopes],
    ];

    if (
      dimensions.some(
        ([childValues, parentValues]) =>
          !authorityScopeArrayIsSubset(
            childValues,
            parentValues,
            policy.emptyArrayMeaning
          )
      )
    ) {
      return ["AUTHORITY_SCOPE_MISMATCH"];
    }

    if (policy.constraintsPolicy === "EXACT_MATCH") {
      if (!authorityConstraintsEqual(child.constraints, parent.constraints)) {
        return ["AUTHORITY_SCOPE_MISMATCH"];
      }
    } else {
      /*
       * Generic Historical IA cannot infer whether arbitrary domain-specific
       * constraints are narrower or broader. A bound Enterprise Profile must
       * define those semantics before CHILD_MUST_NOT_RELAX_PARENT can pass.
       */
      return ["TRUST_CONFIGURATION_UNAVAILABLE"];
    }
  }

  return [];
}

type DDTIdentityBindingStatusChainEvaluation = {
  items: Array<{
    item: DDTHistoricalIdentityAuthorityEvidenceItem;
    event: DDTHistoricalIdentityBindingStatusEvent;
  }>;
  reasonCodes: string[];
};

function evaluateIdentityBindingStatusChain(
  evidenceItems: readonly DDTHistoricalIdentityAuthorityEvidenceItem[],
  bindingId: string
): DDTIdentityBindingStatusChainEvaluation {
  const parsedItems = evidenceItems
    .filter(
      ({ evidence }) =>
        evidence.evidenceType ===
        "IDENTITY_BINDING_STATUS_EVENT"
    )
    .map((item) => ({
      item,
      event: parseIdentityBindingStatusEventBody(
        item.evidence.body
      ),
    }))
    .filter(
      (
        entry
      ): entry is {
        item: DDTHistoricalIdentityAuthorityEvidenceItem;
        event: DDTHistoricalIdentityBindingStatusEvent;
      } =>
        entry.event !== null &&
        entry.event.bindingId === bindingId
    );

  if (parsedItems.length === 0) {
    return {
      items: [],
      reasonCodes: ["IDENTITY_BINDING_UNRESOLVED"],
    };
  }

  const bySequence = new Map<
    number,
    Array<(typeof parsedItems)[number]>
  >();

  for (const entry of parsedItems) {
    const existing =
      bySequence.get(entry.event.sequence) ?? [];
    existing.push(entry);
    bySequence.set(entry.event.sequence, existing);
  }

  if (
    [...bySequence.values()].some(
      (entries) => entries.length > 1
    )
  ) {
    return {
      items: parsedItems,
      reasonCodes: ["IDENTITY_BINDING_AMBIGUOUS"],
    };
  }

  const ordered = [...parsedItems].sort(
    (a, b) => a.event.sequence - b.event.sequence
  );

  if (ordered[0].event.sequence !== 0) {
    return {
      items: ordered,
      reasonCodes: ["IDENTITY_BINDING_UNRESOLVED"],
    };
  }

  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];

    if (
      current.event.sequence !==
      previous.event.sequence + 1
    ) {
      return {
        items: ordered,
        reasonCodes: ["IDENTITY_BINDING_UNRESOLVED"],
      };
    }

    const previousLink = current.event.previousEvent;

    if (
      !previousLink ||
      previousLink.evidenceId !==
        previous.item.evidence.evidenceId ||
      previousLink.digest.algorithm !==
        previous.item.manifestCommitment.algorithm ||
      previousLink.digest.value !==
        previous.item.manifestCommitment.value
    ) {
      return {
        items: ordered,
        reasonCodes: ["IDENTITY_BINDING_UNRESOLVED"],
      };
    }
  }

  return {
    items: ordered,
    reasonCodes: [],
  };
}

function selectIdentityBindingStatusAtRelevantMoment(
  chain: DDTIdentityBindingStatusChainEvaluation,
  relevantMoment?: DDTHistoricalIdentityAuthorityRelevantMoment
): DDTIdentityBindingStatusChainEvaluation {
  if (chain.reasonCodes.length > 0 || !relevantMoment) {
    return chain;
  }

  if (
    relevantMoment.orderBasis !== "AUTHORITATIVE_SEQUENCE" ||
    typeof relevantMoment.sequence !== "number" ||
    !Number.isInteger(relevantMoment.sequence) ||
    relevantMoment.sequence < 0
  ) {
    return {
      items: [],
      reasonCodes: ["HISTORICAL_MOMENT_UNRESOLVED"],
    };
  }

  const unpositionable = chain.items.some(({ item }) => {
    const order = item.evidence.effectiveOrder;

    return (
      order.basis !== "AUTHORITATIVE_SEQUENCE" ||
      typeof order.sequence !== "number" ||
      !Number.isInteger(order.sequence) ||
      order.sequence < 0
    );
  });

  if (unpositionable) {
    return {
      items: [],
      reasonCodes: ["HISTORICAL_ORDER_EVIDENCE_UNRESOLVED"],
    };
  }

  const selected = chain.items.filter(
    ({ item }) =>
      item.evidence.effectiveOrder.sequence! <=
      relevantMoment.sequence!
  );

  if (selected.length === 0) {
    return {
      items: [],
      reasonCodes: ["HISTORICAL_MOMENT_UNRESOLVED"],
    };
  }

  const selectedEvidenceIds = new Set(
    selected.map(({ item }) => item.evidence.evidenceId)
  );

  const expectedPrefix = chain.items.slice(0, selected.length);

  if (
    expectedPrefix.some(
      ({ item }) =>
        !selectedEvidenceIds.has(item.evidence.evidenceId)
    )
  ) {
    return {
      items: [],
      reasonCodes: ["HISTORICAL_ORDER_EVIDENCE_UNRESOLVED"],
    };
  }

  return {
    items: expectedPrefix,
    reasonCodes: [],
  };
}

type DDTIdentityBindingDerivedState =
  | "ACTIVE"
  | "SUSPENDED"
  | "REVOKED"
  | "EXPIRED"
  | "SUPERSEDED"
  | "UNRESOLVED";

type DDTIdentityBindingStateEvaluation = {
  state: DDTIdentityBindingDerivedState;
  reasonCodes: string[];
};

function deriveIdentityBindingState(
  chain: DDTIdentityBindingStatusChainEvaluation
): DDTIdentityBindingStateEvaluation {
  if (chain.reasonCodes.length > 0 || chain.items.length === 0) {
    return {
      state: "UNRESOLVED",
      reasonCodes:
        chain.reasonCodes.length > 0
          ? chain.reasonCodes
          : ["IDENTITY_BINDING_UNRESOLVED"],
    };
  }

  let state: DDTIdentityBindingDerivedState = "UNRESOLVED";

  for (const { event } of chain.items) {
    if (event.effect === "RETROACTIVE_CLAIM") {
      return {
        state: "UNRESOLVED",
        reasonCodes: ["RETROACTIVE_EFFECT_UNRESOLVED"],
      };
    }

    if (
      state === "REVOKED" ||
      state === "EXPIRED" ||
      state === "SUPERSEDED"
    ) {
      return {
        state: "UNRESOLVED",
        reasonCodes: ["IDENTITY_BINDING_AMBIGUOUS"],
      };
    }

    switch (event.eventType) {
      case "ACTIVATE":
        if (state !== "UNRESOLVED") {
          return {
            state: "UNRESOLVED",
            reasonCodes: ["IDENTITY_BINDING_AMBIGUOUS"],
          };
        }
        state = "ACTIVE";
        break;

      case "SUSPEND":
        if (state !== "ACTIVE") {
          return {
            state: "UNRESOLVED",
            reasonCodes: ["IDENTITY_BINDING_AMBIGUOUS"],
          };
        }
        state = "SUSPENDED";
        break;

      case "RESUME":
        if (state !== "SUSPENDED") {
          return {
            state: "UNRESOLVED",
            reasonCodes: ["IDENTITY_BINDING_AMBIGUOUS"],
          };
        }
        state = "ACTIVE";
        break;

      case "REVOKE":
        state = "REVOKED";
        break;

      case "EXPIRE":
        state = "EXPIRED";
        break;

      case "SUPERSEDE":
        state = "SUPERSEDED";
        break;
    }
  }

  return {
    state,
    reasonCodes:
      state === "ACTIVE"
        ? []
        : ["IDENTITY_BINDING_INVALID"],
  };
}

type DDTKeyLifecycleChainEvaluation = {
  items: Array<{
    item: DDTHistoricalIdentityAuthorityEvidenceItem;
    event: DDTHistoricalKeyLifecycleEvent;
  }>;
  reasonCodes: string[];
};

function evaluateKeyLifecycleChain(
  evidenceItems: readonly DDTHistoricalIdentityAuthorityEvidenceItem[],
  verificationMethod: string
): DDTKeyLifecycleChainEvaluation {
  const parsedItems = evidenceItems
    .filter(
      ({ evidence }) =>
        evidence.evidenceType === "KEY_LIFECYCLE_EVENT"
    )
    .map((item) => ({
      item,
      event: parseKeyLifecycleEventBody(item.evidence.body),
    }))
    .filter(
      (
        entry
      ): entry is {
        item: DDTHistoricalIdentityAuthorityEvidenceItem;
        event: DDTHistoricalKeyLifecycleEvent;
      } =>
        entry.event !== null &&
        entry.event.verificationMethodId === verificationMethod
    );

  if (parsedItems.length === 0) {
    return {
      items: [],
      reasonCodes: ["KEY_LIFECYCLE_UNRESOLVED"],
    };
  }

  const bySequence = new Map<
    number,
    Array<(typeof parsedItems)[number]>
  >();

  for (const entry of parsedItems) {
    const existing = bySequence.get(entry.event.sequence) ?? [];
    existing.push(entry);
    bySequence.set(entry.event.sequence, existing);
  }

  if (
    [...bySequence.values()].some(
      (entries) => entries.length > 1
    )
  ) {
    return {
      items: parsedItems,
      reasonCodes: ["KEY_LIFECYCLE_CONFLICT"],
    };
  }

  const ordered = [...parsedItems].sort(
    (a, b) => a.event.sequence - b.event.sequence
  );

  if (ordered[0].event.sequence !== 0) {
    return {
      items: ordered,
      reasonCodes: ["KEY_LIFECYCLE_GAP"],
    };
  }

  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];

    if (
      current.event.sequence !==
      previous.event.sequence + 1
    ) {
      return {
        items: ordered,
        reasonCodes: ["KEY_LIFECYCLE_GAP"],
      };
    }

    const previousLink = current.event.previousEvent;

    if (
      !previousLink ||
      previousLink.evidenceId !==
        previous.item.evidence.evidenceId ||
      previousLink.digest.algorithm !==
        previous.item.manifestCommitment.algorithm ||
      previousLink.digest.value !==
        previous.item.manifestCommitment.value
    ) {
      return {
        items: ordered,
        reasonCodes: ["KEY_LIFECYCLE_GAP"],
      };
    }
  }

  return {
    items: ordered,
    reasonCodes: [],
  };
}

function selectKeyLifecycleAtRelevantMoment(
  chain: DDTKeyLifecycleChainEvaluation,
  relevantMoment?: DDTHistoricalIdentityAuthorityRelevantMoment
): DDTKeyLifecycleChainEvaluation {
  if (chain.reasonCodes.length > 0 || !relevantMoment) {
    return chain;
  }

  if (
    relevantMoment.orderBasis !== "AUTHORITATIVE_SEQUENCE" ||
    typeof relevantMoment.sequence !== "number" ||
    !Number.isInteger(relevantMoment.sequence) ||
    relevantMoment.sequence < 0
  ) {
    return {
      items: [],
      reasonCodes: ["HISTORICAL_MOMENT_UNRESOLVED"],
    };
  }

  const unpositionable = chain.items.some(({ item }) => {
    const order = item.evidence.effectiveOrder;

    return (
      order.basis !== "AUTHORITATIVE_SEQUENCE" ||
      typeof order.sequence !== "number" ||
      !Number.isInteger(order.sequence) ||
      order.sequence < 0
    );
  });

  if (unpositionable) {
    return {
      items: [],
      reasonCodes: ["HISTORICAL_ORDER_EVIDENCE_UNRESOLVED"],
    };
  }

  const selected = chain.items.filter(
    ({ item }) =>
      item.evidence.effectiveOrder.sequence! <=
      relevantMoment.sequence!
  );

  if (selected.length === 0) {
    return {
      items: [],
      reasonCodes: ["HISTORICAL_MOMENT_UNRESOLVED"],
    };
  }

  const selectedEvidenceIds = new Set(
    selected.map(({ item }) => item.evidence.evidenceId)
  );

  const expectedPrefix = chain.items.slice(0, selected.length);

  if (
    expectedPrefix.some(
      ({ item }) =>
        !selectedEvidenceIds.has(item.evidence.evidenceId)
    )
  ) {
    return {
      items: [],
      reasonCodes: ["HISTORICAL_ORDER_EVIDENCE_UNRESOLVED"],
    };
  }

  return {
    items: expectedPrefix,
    reasonCodes: [],
  };
}

function evaluateLaterKeyLifecycleEvidence(
  fullChain: DDTKeyLifecycleChainEvaluation,
  historicalChain: DDTKeyLifecycleChainEvaluation
): string[] {
  if (
    fullChain.reasonCodes.length > 0 ||
    historicalChain.reasonCodes.length > 0
  ) {
    return [];
  }

  const historicalEvidenceIds = new Set(
    historicalChain.items.map(
      ({ item }) => item.evidence.evidenceId
    )
  );

  const laterItems = fullChain.items.filter(
    ({ item }) =>
      !historicalEvidenceIds.has(item.evidence.evidenceId)
  );

  const laterCompromise = laterItems.some(
    ({ event }) =>
      event.eventType === "COMPROMISE_DECLARED"
  );

  return laterCompromise
    ? ["KEY_LIFECYCLE_UNRESOLVED"]
    : [];
}

type DDTKeyLifecycleDerivedState =
  | "ACTIVE"
  | "SUSPENDED"
  | "ROTATED_OUT"
  | "REVOKED"
  | "EXPIRED"
  | "COMPROMISE_EFFECT_UNRESOLVED"
  | "UNRESOLVED";

export type DDTKeyLifecycleStateEvaluation = {
  state: DDTKeyLifecycleDerivedState;
  reasonCodes: string[];
};

function deriveKeyLifecycleState(
  chain: DDTKeyLifecycleChainEvaluation,
  closedCoverageEstablished = false
): DDTKeyLifecycleStateEvaluation {
  if (chain.reasonCodes.length > 0 || chain.items.length === 0) {
    return {
      state: "UNRESOLVED",
      reasonCodes:
        chain.reasonCodes.length > 0
          ? chain.reasonCodes
          : ["KEY_LIFECYCLE_UNRESOLVED"],
    };
  }

  let state: DDTKeyLifecycleDerivedState = "UNRESOLVED";

  for (const { event } of chain.items) {
    if (event.effect === "RETROACTIVE_CLAIM") {
      return {
        state: "UNRESOLVED",
        reasonCodes: ["RETROACTIVE_EFFECT_UNRESOLVED"],
      };
    }

    if (
      state === "ROTATED_OUT" ||
      state === "REVOKED" ||
      state === "EXPIRED"
    ) {
      return {
        state: "UNRESOLVED",
        reasonCodes: ["KEY_LIFECYCLE_CONFLICT"],
      };
    }

    switch (event.eventType) {
      case "ACTIVATE":
        if (state !== "UNRESOLVED") {
          return {
            state: "UNRESOLVED",
            reasonCodes: ["KEY_LIFECYCLE_CONFLICT"],
          };
        }
        state = "ACTIVE";
        break;

      case "SUSPEND":
        if (state !== "ACTIVE") {
          return {
            state: "UNRESOLVED",
            reasonCodes: ["KEY_LIFECYCLE_CONFLICT"],
          };
        }
        state = "SUSPENDED";
        break;

      case "RESUME":
        if (state !== "SUSPENDED") {
          return {
            state: "UNRESOLVED",
            reasonCodes: ["KEY_LIFECYCLE_CONFLICT"],
          };
        }
        state = "ACTIVE";
        break;

      case "ROTATE_OUT":
        state = "ROTATED_OUT";
        break;

      case "REVOKE":
        state = "REVOKED";
        break;

      case "EXPIRE":
        state = "EXPIRED";
        break;

      case "COMPROMISE_DECLARED":
        return {
          state: "COMPROMISE_EFFECT_UNRESOLVED",
          reasonCodes: ["KEY_LIFECYCLE_UNRESOLVED"],
        };
    }
  }

  if (state === "ACTIVE" && !closedCoverageEstablished) {
    return {
      state: "UNRESOLVED",
      reasonCodes: ["KEY_LIFECYCLE_UNRESOLVED"],
    };
  }

  return {
    state,
    reasonCodes: [],
  };
}

function decodeBase64urlStrict(
  value: string,
  expectedBytes: number
): Buffer | null {
  if (
    value.includes("=") ||
    /\\s/.test(value) ||
    !/^[A-Za-z0-9_-]+$/.test(value)
  ) {
    return null;
  }

  const pad =
    "=".repeat((4 - (value.length % 4)) % 4);

  const raw = Buffer.from(
    value.replace(/-/g, "+").replace(/_/g, "/") + pad,
    "base64"
  );

  const canonical = raw
    .toString("base64")
    .replace(/\\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  if (
    raw.length !== expectedBytes ||
    canonical !== value
  ) {
    return null;
  }

  return raw;
}

function evaluateSigningDescriptor(
  body: unknown,
  signingContext: DDTHistoricalIdentityAuthoritySigningContext
): string[] {
  if (!isObject(body)) {
    return ["KEY_DESCRIPTOR_UNAVAILABLE"];
  }

  if (
    body.verificationMethodId !==
    signingContext.verificationMethod
  ) {
    return ["VERIFICATION_METHOD_MISMATCH"];
  }

  if (body.algorithm !== "Ed25519") {
    return ["KEY_ALGORITHM_MISMATCH"];
  }

  if (
    !Array.isArray(body.permittedPurposes) ||
    !body.permittedPurposes.includes("DDT_REGISTRATION")
  ) {
    return ["KEY_PURPOSE_MISMATCH"];
  }

  if (!isObject(body.publicKey)) {
    return ["KEY_DESCRIPTOR_UNAVAILABLE"];
  }

  const publicKey = body.publicKey;

  if (
    publicKey.representation !== "INLINE" ||
    publicKey.encoding !== "BASE64URL" ||
    !isNonEmptyString(publicKey.value) ||
    !isObject(publicKey.fingerprint) ||
    publicKey.fingerprint.algorithm !== "SHA-256" ||
    typeof publicKey.fingerprint.value !== "string" ||
    !/^[0-9a-f]{64}$/.test(publicKey.fingerprint.value)
  ) {
    return ["KEY_DESCRIPTOR_UNAVAILABLE"];
  }

  const descriptorKey =
    decodeBase64urlStrict(publicKey.value, 32);

  const actualKey =
    decodeBase64urlStrict(
      signingContext.publicKeyBase64url,
      32
    );

  if (!descriptorKey || !actualKey) {
    return ["KEY_DESCRIPTOR_UNAVAILABLE"];
  }

  if (!descriptorKey.equals(actualKey)) {
    return ["PUBLIC_KEY_FINGERPRINT_MISMATCH"];
  }

  const expectedFingerprint =
    createHash("sha256")
      .update(descriptorKey)
      .digest("hex");

  if (
    expectedFingerprint !==
    publicKey.fingerprint.value
  ) {
    return ["PUBLIC_KEY_FINGERPRINT_MISMATCH"];
  }

  /*
   * Key bytes, algorithm, registration purpose and fingerprint are
   * resolved here. Descriptor evidence authenticity and issuer authority
   * are evaluated independently and merged into SIGNING_KEY_IDENTITY.
   */
  return [];
}

function isAcceptedEvidenceType(
  value: unknown
): value is DDTHistoricalIdentityAuthorityEvidenceType {
  return (
    typeof value === "string" &&
    (
      HISTORICAL_IDENTITY_AUTHORITY_EVIDENCE_TYPES as readonly string[]
    ).includes(value)
  );
}


function resolveHistoricalIdentityAuthorityProof(
  record: DDTNormalizedRecord,
  sourceEvidenceRefs: ReadonlyMap<
    number,
    {
      evidenceRef: string;
      commitment: {
        algorithm: string;
        value: string;
      };
    }
  >,
  proofRef: string
): {
  proof?: unknown;
  sourceEvidenceIndex?: number;
  manifestEvidenceRef?: string;
  manifestCommitment?: {
    algorithm: string;
    value: string;
  };
  reasonCodes: string[];
} {
  const matches = record.evidence
    .map((item, index) => ({
      item,
      index,
      manifestBinding: sourceEvidenceRefs.get(index),
    }))
    .filter(
      ({ manifestBinding }) =>
        manifestBinding?.evidenceRef === proofRef
    );

  if (matches.length !== 1) {
    return {
      reasonCodes: ["AUTHORITY_EVIDENCE_UNAVAILABLE"],
    };
  }

  const match = matches[0];

  try {
    const proof = JSON.parse(
      Buffer.from(match.item.bytes).toString("utf8")
    ) as unknown;

    return {
      proof,
      sourceEvidenceIndex: match.index,
      manifestEvidenceRef:
        match.manifestBinding!.evidenceRef,
      manifestCommitment:
        match.manifestBinding!.commitment,
      reasonCodes: [],
    };
  } catch {
    return {
      reasonCodes: ["AUTHORITY_EVIDENCE_UNAVAILABLE"],
    };
  }
}


function resolveHistoricalIdentityAuthorityIssuerPublicKey(
  evidenceItems: readonly DDTHistoricalIdentityAuthorityEvidenceItem[],
  verificationMethod: string
): string | undefined {
  const matches = evidenceItems.filter(({ evidence }) => {
    if (
      evidence.evidenceType !== "VERIFICATION_METHOD_DESCRIPTOR" ||
      !isObject(evidence.body)
    ) {
      return false;
    }

    return (
      evidence.body.verificationMethodId === verificationMethod
    );
  });

  if (matches.length !== 1) {
    return undefined;
  }

  const body = matches[0].evidence.body;

  if (
    !isObject(body) ||
    body.algorithm !== "Ed25519" ||
    !isObject(body.publicKey) ||
    body.publicKey.representation !== "INLINE" ||
    body.publicKey.encoding !== "BASE64URL" ||
    !isNonEmptyString(body.publicKey.value)
  ) {
    return undefined;
  }

  return body.publicKey.value;
}

async function verifyHistoricalIdentityAuthorityEvidenceAuthenticity(
  record: DDTNormalizedRecord,
  item: DDTHistoricalIdentityAuthorityEvidenceItem,
  sourceEvidenceRefs: ReadonlyMap<
    number,
    {
      evidenceRef: string;
      commitment: {
        algorithm: string;
        value: string;
      };
    }
  >,
  signingContext?: DDTHistoricalIdentityAuthoritySigningContext,
  issuerPublicKeyBase64url?: string
): Promise<string[]> {
  const binding = (() => {
    switch (item.evidence.evidenceType) {
      case "VERIFICATION_METHOD_DESCRIPTOR":
      case "IDENTITY_BINDING":
      case "IDENTITY_BINDING_STATUS_EVENT":
        return {
          purpose: "IDENTITY_EVIDENCE_ISSUANCE" as const,
          targetType: "IDENTITY_EVIDENCE_HASH" as const,
        };

      case "KEY_LIFECYCLE_EVENT":
        return {
          purpose: "LIFECYCLE_EVIDENCE_ISSUANCE" as const,
          targetType: "LIFECYCLE_EVIDENCE_HASH" as const,
        };

      case "AUTHORITY_GRANT":
      case "AUTHORITY_STATUS_EVENT":
        return {
          purpose: "AUTHORITY_EVIDENCE_ISSUANCE" as const,
          targetType: "AUTHORITY_EVIDENCE_HASH" as const,
        };
    }
  })();

  if (!binding) {
    return ["AUTHORITY_EVIDENCE_UNAVAILABLE"];
  }

  const resolved = resolveHistoricalIdentityAuthorityProof(
    record,
    sourceEvidenceRefs,
    item.evidence.issuer.proofRef
  );

  if (!resolved.proof) {
    return resolved.reasonCodes;
  }

  if (!issuerPublicKeyBase64url) {
    return ["TRUST_CONFIGURATION_UNAVAILABLE"];
  }

  let rawPublicKey: Buffer;

  try {
    rawPublicKey = Buffer.from(
      issuerPublicKeyBase64url,
      "base64url"
    );
  } catch {
    return ["TRUST_CONFIGURATION_UNAVAILABLE"];
  }

  if (rawPublicKey.length !== 32) {
    return ["TRUST_CONFIGURATION_UNAVAILABLE"];
  }

  try {
    await verifyIdentityAuthoritySignatureProof(
      resolved.proof as never,
      {
        expectedDigest: {
          algorithm: item.manifestCommitment.algorithm as "SHA-256",
          value: item.manifestCommitment.value,
        },
        purpose: binding.purpose,
        targetType: binding.targetType,
        ddtRoot: process.cwd() + "/docs/ddt",
        keyring: new Map([
          [
            item.evidence.issuer.verificationMethod,
            rawPublicKey,
          ],
        ]),
      }
    );
  } catch {
    return ["AUTHORITY_EVIDENCE_UNAVAILABLE"];
  }

  return [];
}

function parseHistoricalEvidence(
  bytes: Uint8Array
): DDTHistoricalIdentityAuthorityEvidence | null {
  let value: unknown;

  try {
    value = JSON.parse(
      Buffer.from(bytes).toString("utf8")
    );
  } catch {
    return null;
  }

  if (!isObject(value)) {
    return null;
  }

  if (
    !isNonEmptyString(value.evidenceId) ||
    !isAcceptedEvidenceType(value.evidenceType) ||
    value.evidenceVersion !== "0.1.0-draft.1" ||
    !isObject(value.issuer) ||
    !isObject(value.effectiveOrder) ||
    !("body" in value)
  ) {
    return null;
  }

  const issuer = value.issuer;
  const effectiveOrder = value.effectiveOrder;

  if (
    !isNonEmptyString(issuer.identityRef) ||
    !isNonEmptyString(issuer.verificationMethod) ||
    !isNonEmptyString(issuer.proofRef) ||
    !isStringArray(issuer.authorityEvidenceRefs)
  ) {
    return null;
  }

  if (
    !isNonEmptyString(effectiveOrder.basis) ||
    !isStringArray(effectiveOrder.evidenceRefs)
  ) {
    return null;
  }

  if (
    ![
      "INDEPENDENT_TIME_PROOF",
      "DDT_NETWORK_ORDER",
      "AUTHORITATIVE_SEQUENCE",
      "ISSUER_TIME_CLAIM_ONLY",
    ].includes(effectiveOrder.basis)
  ) {
    return null;
  }

  if (
    effectiveOrder.basis === "AUTHORITATIVE_SEQUENCE" &&
    (
      typeof effectiveOrder.sequence !== "number" ||
      !Number.isInteger(effectiveOrder.sequence) ||
      effectiveOrder.sequence < 0
    )
  ) {
    return null;
  }

  if (
    (
      effectiveOrder.basis === "INDEPENDENT_TIME_PROOF" ||
      effectiveOrder.basis === "DDT_NETWORK_ORDER"
    ) &&
    effectiveOrder.evidenceRefs.length === 0
  ) {
    return null;
  }

  return value as DDTHistoricalIdentityAuthorityEvidence;
}

export type DDTHistoricalIdentityAuthorityTrustConfiguration = {
  configurationId: string;
  configurationVersion: "0.1.0-draft.1";
  authoritativeSequenceSources: Array<{
    sourceId: string;
    evidenceTypes: DDTHistoricalIdentityAuthorityEvidenceType[];
    issuerIdentityRef: string;
    issuerVerificationMethod: string;
    sequenceScope:
      | "VERIFICATION_METHOD"
      | "IDENTITY_BINDING"
      | "AUTHORITY_GRANT";
  }>;
  authorityRoots?: Array<{
    rootId: string;
    identityRef: string;
    acceptedGrantorRoles: string[];
  }>;
  scopeMatchingPolicy?: {
    arraySemantics: "CHILD_VALUES_MUST_BE_SUBSET_OF_PARENT";
    emptyArrayMeaning:
      | "NO_VALUES_PERMITTED"
      | "UNRESTRICTED";
    constraintsPolicy:
      | "EXACT_MATCH"
      | "CHILD_MUST_NOT_RELAX_PARENT";
  };
};

function authoritativeSequenceScopeForEvidence(
  evidenceType: DDTHistoricalIdentityAuthorityEvidenceType
):
  | "VERIFICATION_METHOD"
  | "IDENTITY_BINDING"
  | "AUTHORITY_GRANT"
  | null {
  switch (evidenceType) {
    case "KEY_LIFECYCLE_EVENT":
      return "VERIFICATION_METHOD";
    case "IDENTITY_BINDING_STATUS_EVENT":
      return "IDENTITY_BINDING";
    case "AUTHORITY_STATUS_EVENT":
      return "AUTHORITY_GRANT";
    default:
      return null;
  }
}

function evaluateHistoricalOrder(
  evidence: DDTHistoricalIdentityAuthorityEvidence,
  availableEvidenceIds: ReadonlySet<string>,
  trustConfiguration?: DDTHistoricalIdentityAuthorityTrustConfiguration
): string[] {
  const order = evidence.effectiveOrder;

  if (order.basis === "ISSUER_TIME_CLAIM_ONLY") {
    return ["HISTORICAL_MOMENT_UNRESOLVED"];
  }

  if (order.basis === "AUTHORITATIVE_SEQUENCE") {
    if (
      typeof order.sequence !== "number" ||
      !Number.isInteger(order.sequence) ||
      order.sequence < 0
    ) {
      return ["HISTORICAL_MOMENT_UNRESOLVED"];
    }

    if (!trustConfiguration) {
      return ["TRUST_CONFIGURATION_UNAVAILABLE"];
    }

    const requiredScope =
      authoritativeSequenceScopeForEvidence(evidence.evidenceType);

    if (!requiredScope) {
      return ["TRUST_CONFIGURATION_UNAVAILABLE"];
    }

    const trustedSource =
      trustConfiguration.authoritativeSequenceSources.some(
        (source) =>
          source.evidenceTypes.includes(evidence.evidenceType) &&
          source.issuerIdentityRef === evidence.issuer.identityRef &&
          source.issuerVerificationMethod ===
            evidence.issuer.verificationMethod &&
          source.sequenceScope === requiredScope
      );

    return trustedSource
      ? []
      : ["TRUST_CONFIGURATION_UNAVAILABLE"];
  }

  if (
    order.basis === "DDT_NETWORK_ORDER" ||
    order.basis === "INDEPENDENT_TIME_PROOF"
  ) {
    if (order.evidenceRefs.length === 0) {
      return ["HISTORICAL_MOMENT_UNRESOLVED"];
    }

    const unresolvedRefs = order.evidenceRefs.filter(
      (ref) => !availableEvidenceIds.has(ref)
    );

    return unresolvedRefs.length > 0
      ? ["HISTORICAL_ORDER_EVIDENCE_UNAVAILABLE"]
      : ["HISTORICAL_ORDER_EVIDENCE_UNRESOLVED"];
  }

  return ["HISTORICAL_MOMENT_UNRESOLVED"];
}

export function collectHistoricalIdentityAuthorityEvidence(
  record: DDTNormalizedRecord,
  sourceEvidenceRefs: ReadonlyMap<
    number,
    {
      evidenceRef: string;
      commitment: {
        algorithm: string;
        value: string;
      };
    }
  > = new Map()
): DDTHistoricalIdentityAuthorityEvidenceCollection {
  const authorityInputs = record.evidence
    .map((item, index) => ({ item, index }))
    .filter(
      ({ item }) =>
        item.bindings?.includes("ACTOR_AUTHORITY") === true
    );

  if (authorityInputs.length === 0) {
    return {
      applicable: false,
      evidence: [],
      reasonCodes: [],
    };
  }

  const evidence: DDTHistoricalIdentityAuthorityEvidenceItem[] = [];
  const reasonCodes: string[] = [];

  for (const { item, index } of authorityInputs) {
    const parsed = parseHistoricalEvidence(item.bytes);

    if (!parsed) {
      reasonCodes.push("AUTHORITY_EVIDENCE_UNAVAILABLE");
      continue;
    }

    const manifestBinding = sourceEvidenceRefs.get(index);

    if (!manifestBinding) {
      reasonCodes.push("EVIDENCE_DIGEST_MISMATCH");
      continue;
    }

    evidence.push({
      sourceEvidenceIndex: index,
      manifestEvidenceRef: manifestBinding.evidenceRef,
      manifestCommitment: manifestBinding.commitment,
      name: item.name,
      evidence: parsed,
    });
  }

  return {
    applicable: true,
    evidence,
    reasonCodes: [...new Set(reasonCodes)].sort(),
  };
}

import type { DDTRuleResult } from "../producer/conformanceReceipt";

export type DDTHistoricalIdentityAuthorityRelevantMoment = {
  momentType:
    | "UPSTREAM_EVENT_TIME"
    | "SOURCE_SIGNING_TIME"
    | "SUBMISSION_TIME"
    | "REGISTRATION_TIME"
    | "PROFILE_DEFINED_ACTION_TIME";
  orderBasis:
    | "AUTHORITATIVE_SEQUENCE"
    | "DDT_NETWORK_ORDER"
    | "INDEPENDENT_TIME_PROOF";
  evidenceRefs: string[];
  sequence?: number;
  timeClaim?: string;
};

export type DDTHistoricalIdentityAuthorityEvaluation = {
  applicable: boolean;
  ruleResults: DDTRuleResult[];
  signingKeyLifecycle?: DDTKeyLifecycleStateEvaluation;
};

export type DDTReferenceRecorderHistoricalIAPolicy = {
  acceptedIdentityAssuranceProfiles: readonly {
    artifactId: string;
    version: string;
    digest: {
      algorithm: string;
      value: string;
    };
  }[];
  identityAssurance: {
    identityNamespace: string;
    acceptedRegistrantIdentityTypes: readonly string[];
    requiredBindingScopes: readonly string[];
  };
  registrationAuthorityScope: {
    action: string;
    proofPurpose: string;
    recordTypes: readonly string[];
    subjectNamespaces: readonly string[];
    organizationScopes: readonly string[];
    domainScopes: readonly string[];
  };
};


const AXIS_REASON_CODES: Record<
  DDTHistoricalIdentityAuthorityAxis,
  string[]
> = {
  SIGNING_KEY_IDENTITY: [
    "KEY_DESCRIPTOR_UNAVAILABLE",
    "VERIFICATION_METHOD_MISMATCH",
    "KEY_ALGORITHM_MISMATCH",
    "KEY_PURPOSE_MISMATCH",
    "PUBLIC_KEY_FINGERPRINT_MISMATCH",
    "TRUST_CONFIGURATION_UNAVAILABLE",
  ],
  SIGNING_KEY_LIFECYCLE: [
    "KEY_LIFECYCLE_UNRESOLVED",
    "KEY_LIFECYCLE_GAP",
    "KEY_LIFECYCLE_CONFLICT",
    "RETROACTIVE_EFFECT_UNRESOLVED",
    "HISTORICAL_MOMENT_UNRESOLVED",
    "HISTORICAL_ORDER_EVIDENCE_UNRESOLVED",
    "HISTORICAL_ORDER_EVIDENCE_UNAVAILABLE",
    "TRUST_CONFIGURATION_UNAVAILABLE",
  ],
  REGISTRANT_IDENTITY: [
    "IDENTITY_BINDING_UNAVAILABLE",
    "IDENTITY_BINDING_UNRESOLVED",
    "IDENTITY_BINDING_AMBIGUOUS",
    "IDENTITY_BINDING_INVALID",
    "KEY_CONTROLLER_UNRESOLVED",
    "RETROACTIVE_EFFECT_UNRESOLVED",
    "HISTORICAL_MOMENT_UNRESOLVED",
    "HISTORICAL_ORDER_EVIDENCE_UNRESOLVED",
    "HISTORICAL_ORDER_EVIDENCE_UNAVAILABLE",
    "TRUST_CONFIGURATION_UNAVAILABLE",
  ],
  REGISTRANT_AUTHORITY: [
    "AUTHORITY_EVIDENCE_UNAVAILABLE",
    "AUTHORITY_GRANT_CHAIN_INCOMPLETE",
    "AUTHORITY_GRANT_INVALID",
    "AUTHORITY_SCOPE_MISMATCH",
    "AUTHORITY_STATE_AMBIGUOUS",
    "AUTHORITY_STATUS_UNRESOLVED",
    "RETROACTIVE_EFFECT_UNRESOLVED",
    "HISTORICAL_MOMENT_UNRESOLVED",
    "HISTORICAL_ORDER_EVIDENCE_UNRESOLVED",
    "HISTORICAL_ORDER_EVIDENCE_UNAVAILABLE",
    "TRUST_CONFIGURATION_UNAVAILABLE",
  ],
};

function historicalIdentityAuthorityRuleStatus(
  axis: DDTHistoricalIdentityAuthorityAxis,
  reasonCodes: readonly string[]
): DDTRuleResult["status"] {
  if (
    axis !== "SIGNING_KEY_LIFECYCLE" &&
    reasonCodes.length === 0
  ) {
    return "PASS";
  }

  if (axis === "SIGNING_KEY_IDENTITY") {
    if (
      reasonCodes.includes("VERIFICATION_METHOD_MISMATCH") ||
      reasonCodes.includes("KEY_ALGORITHM_MISMATCH") ||
      reasonCodes.includes("KEY_PURPOSE_MISMATCH") ||
      reasonCodes.includes("PUBLIC_KEY_FINGERPRINT_MISMATCH")
    ) {
      return "FAIL";
    }

    return "INDETERMINATE";
  }

  if (axis === "REGISTRANT_IDENTITY") {
    if (reasonCodes.includes("IDENTITY_BINDING_INVALID")) {
      return "FAIL";
    }

    return "INDETERMINATE";
  }

  if (axis === "REGISTRANT_AUTHORITY") {
    if (
      reasonCodes.includes("AUTHORITY_GRANT_INVALID") ||
      reasonCodes.includes("AUTHORITY_SCOPE_MISMATCH")
    ) {
      return "FAIL";
    }

    /*
     * REGISTRANT_AUTHORITY cannot become PASS yet:
     * the current Recorder runtime does not expose authoritative mappings
     * for every required authority-scope dimension (notably actions,
     * organizationScopes and domainScopes). Missing/incomplete authority
     * resolution must remain INDETERMINATE, never be restated as failure.
     */
    return "INDETERMINATE";
  }

  /*
   * SIGNING_KEY_LIFECYCLE remains INDETERMINATE until a complete
   * historical lifecycle can distinguish a proven unusable key state
   * from incomplete, conflicting or insufficiently ordered history.
   */
  return "INDETERMINATE";
}

export type DDTHistoricalIdentityAuthoritySigningContext = {
  registrant: {
    identityRef: string;
    identityType: string;
    authorityEvidenceRefs?: string[];
  };
  verificationMethod: string;
  publicKeyBase64url: string;
};

type DDTRegistrantAuthorityGrantResolution = {
  item?: DDTHistoricalIdentityAuthorityEvidenceItem;
  grant?: DDTHistoricalAuthorityGrant;
  trustedRoot?: boolean;
  reasonCodes: string[];
};

function resolveAuthorityGrantForIdentity(
  evidenceItems: readonly DDTHistoricalIdentityAuthorityEvidenceItem[],
  identityRef: string,
  authorityEvidenceRefs: readonly string[] = []
): DDTRegistrantAuthorityGrantResolution {
  const allowedRefs = new Set(authorityEvidenceRefs);

  const candidates = evidenceItems
    .filter(
      ({ evidence }) =>
        evidence.evidenceType === "AUTHORITY_GRANT"
    )
    .map((item) => ({
      item,
      grant: parseAuthorityGrantBody(item.evidence.body),
    }))
    .filter(
      (entry): entry is {
        item: DDTHistoricalIdentityAuthorityEvidenceItem;
        grant: DDTHistoricalAuthorityGrant;
      } =>
        entry.grant !== null &&
        entry.grant.granteeIdentityRef === identityRef
    )
    .filter(
      ({ item }) =>
        allowedRefs.size === 0 ||
        allowedRefs.has(item.evidence.evidenceId) ||
        allowedRefs.has(item.manifestEvidenceRef)
    );

  if (candidates.length === 0) {
    return {
      reasonCodes: ["AUTHORITY_EVIDENCE_UNAVAILABLE"],
    };
  }

  if (candidates.length > 1) {
    return {
      reasonCodes: ["AUTHORITY_STATE_AMBIGUOUS"],
    };
  }

  return {
    item: candidates[0].item,
    grant: candidates[0].grant,
    reasonCodes: [],
  };
}



function evaluateResolvedAuthorityGrant(
  evidenceItems: readonly DDTHistoricalIdentityAuthorityEvidenceItem[],
  resolution: DDTRegistrantAuthorityGrantResolution,
  relevantMoment: DDTHistoricalIdentityAuthorityRelevantMoment | undefined,
  trustConfiguration: DDTHistoricalIdentityAuthorityTrustConfiguration | undefined,
  availableHistoricalEvidenceIds: ReadonlySet<string>,
  relevantMomentReasonCodes: readonly string[]
): string[] {
  if (resolution.reasonCodes.length > 0) {
    return resolution.reasonCodes;
  }

  if (resolution.trustedRoot === true) {
    return [...new Set(relevantMomentReasonCodes)].sort();
  }

  if (!resolution.grant || !resolution.item) {
    return ["AUTHORITY_EVIDENCE_UNAVAILABLE"];
  }

  const grantChain = evaluateAuthorityGrantChain(
    evidenceItems,
    {
      item: resolution.item,
      grant: resolution.grant,
    }
  );

  if (grantChain.reasonCodes.length > 0) {
    return grantChain.reasonCodes;
  }

  const rootReasonCodes = evaluateAuthorityRoot(
    grantChain,
    trustConfiguration
  );

  if (rootReasonCodes.length > 0) {
    return rootReasonCodes;
  }

  const scopeReasonCodes =
    evaluateAuthorityScopeAmplification(
      grantChain,
      trustConfiguration
    );

  if (scopeReasonCodes.length > 0) {
    return scopeReasonCodes;
  }

  const statusReasonCodes: string[] = [];

  for (const { grant } of grantChain.items) {
    const statusChain = evaluateAuthorityStatusChain(
      evidenceItems,
      grant.grantId
    );

    const statusAtRelevantMoment =
      selectAuthorityStatusAtRelevantMoment(
        statusChain,
        relevantMoment
      );

    const state = deriveAuthorityState(
      statusAtRelevantMoment
    );

    statusReasonCodes.push(...state.reasonCodes);

    statusReasonCodes.push(
      ...[
        ...new Set(
          evidenceItems
            .filter(({ evidence }) => {
              if (
                evidence.evidenceType !==
                "AUTHORITY_STATUS_EVENT"
              ) {
                return false;
              }

              const event =
                parseAuthorityStatusEventBody(
                  evidence.body
                );

              return (
                event !== null &&
                event.grantId === grant.grantId
              );
            })
            .flatMap(({ evidence }) =>
              evaluateHistoricalOrder(
                evidence,
                availableHistoricalEvidenceIds,
                trustConfiguration
              )
            )
        ),
      ]
    );
  }

  return [
    ...new Set([
      ...statusReasonCodes,
      ...relevantMomentReasonCodes,
    ]),
  ].sort();
}

function resolveEvidenceIssuerAuthorityGrant(
  evidenceItems: readonly DDTHistoricalIdentityAuthorityEvidenceItem[],
  item: DDTHistoricalIdentityAuthorityEvidenceItem,
  trustConfiguration?: DDTHistoricalIdentityAuthorityTrustConfiguration
): DDTRegistrantAuthorityGrantResolution {
  const authorityEvidenceRefs =
    item.evidence.issuer.authorityEvidenceRefs;

  if (authorityEvidenceRefs.length === 0) {
    const configuredTrustRoot =
      trustConfiguration?.authorityRoots?.some(
        (root) =>
          root.identityRef === item.evidence.issuer.identityRef
      ) ?? false;

    return {
      reasonCodes: configuredTrustRoot
        ? ["TRUST_CONFIGURATION_UNAVAILABLE"]
        : ["AUTHORITY_GRANT_CHAIN_INCOMPLETE"],
    };
  }

  return resolveAuthorityGrantForIdentity(
    evidenceItems,
    item.evidence.issuer.identityRef,
    authorityEvidenceRefs
  );
}

function resolveRegistrantAuthorityGrant(
  evidenceItems: readonly DDTHistoricalIdentityAuthorityEvidenceItem[],
  signingContext?: DDTHistoricalIdentityAuthoritySigningContext
): DDTRegistrantAuthorityGrantResolution {
  if (!signingContext) {
    return {
      reasonCodes: ["AUTHORITY_EVIDENCE_UNAVAILABLE"],
    };
  }

  return resolveAuthorityGrantForIdentity(
    evidenceItems,
    signingContext.registrant.identityRef,
    signingContext.registrant.authorityEvidenceRefs ?? []
  );
}

export async function evaluateHistoricalIdentityAuthority(
  record: DDTNormalizedRecord,
  signingContext?: DDTHistoricalIdentityAuthoritySigningContext,
  sourceEvidenceRefs: ReadonlyMap<
    number,
    {
      evidenceRef: string;
      commitment: {
        algorithm: string;
        value: string;
      };
    }
  > = new Map(),
  relevantMoment?: DDTHistoricalIdentityAuthorityRelevantMoment,
  trustConfiguration?: DDTHistoricalIdentityAuthorityTrustConfiguration,
  referenceRecorderPolicy?: DDTReferenceRecorderHistoricalIAPolicy
): Promise<DDTHistoricalIdentityAuthorityEvaluation> {
  const collected =
    collectHistoricalIdentityAuthorityEvidence(
      record,
      sourceEvidenceRefs
    );

  if (!collected.applicable) {
    return {
      applicable: false,
      ruleResults: [],
    };
  }

  const authenticityReasonCodesByEvidenceId =
    new Map<string, string[]>(
      await Promise.all(
        collected.evidence.map(async (item) => {
          const issuerPublicKeyBase64url =
            resolveHistoricalIdentityAuthorityIssuerPublicKey(
              collected.evidence,
              item.evidence.issuer.verificationMethod
            );

          return [
            item.evidence.evidenceId,
            [
              ...new Set(
                await verifyHistoricalIdentityAuthorityEvidenceAuthenticity(
                  record,
                  item,
                  sourceEvidenceRefs,
                  signingContext,
                  issuerPublicKeyBase64url
                )
              ),
            ].sort(),
          ] as const;
        })
      )
    );

  const authenticityEvidenceTypesByAxis: Record<
    DDTHistoricalIdentityAuthorityAxis,
    readonly DDTHistoricalIdentityAuthorityEvidenceType[]
  > = {
    SIGNING_KEY_IDENTITY: [
      "VERIFICATION_METHOD_DESCRIPTOR",
    ],
    SIGNING_KEY_LIFECYCLE: [
      "KEY_LIFECYCLE_EVENT",
    ],
    REGISTRANT_IDENTITY: [
      "IDENTITY_BINDING",
      "IDENTITY_BINDING_STATUS_EVENT",
    ],
    REGISTRANT_AUTHORITY: [
      "AUTHORITY_GRANT",
      "AUTHORITY_STATUS_EVENT",
    ],
  };

  function authenticityReasonCodesForAxis(
    axis: DDTHistoricalIdentityAuthorityAxis
  ): string[] {
    const relevantTypes = new Set(
      authenticityEvidenceTypesByAxis[axis]
    );

    return [
      ...new Set(
        collected.evidence
          .filter((item) => {
            if (!relevantTypes.has(item.evidence.evidenceType)) {
              return false;
            }

            if (
              axis === "SIGNING_KEY_IDENTITY" &&
              signingContext &&
              item.evidence.evidenceType ===
                "VERIFICATION_METHOD_DESCRIPTOR"
            ) {
              return (
                isObject(item.evidence.body) &&
                item.evidence.body.verificationMethodId ===
                  signingContext.verificationMethod
              );
            }

            return true;
          })
          .flatMap(
            (item) =>
              authenticityReasonCodesByEvidenceId.get(
                item.evidence.evidenceId
              ) ?? []
          )
      ),
    ].sort();
  }



  const descriptorItems = collected.evidence.filter(
    ({ evidence }) =>
      evidence.evidenceType === "VERIFICATION_METHOD_DESCRIPTOR"
  );

  const matchingDescriptorItems = signingContext
    ? descriptorItems.filter(({ evidence }) => {
        if (!isObject(evidence.body)) {
          return false;
        }

        return (
          evidence.body.verificationMethodId ===
          signingContext.verificationMethod
        );
      })
    : [];

  const availableHistoricalEvidenceIds = new Set(
    collected.evidence.map(({ evidence }) => evidence.evidenceId)
  );

  const relevantMomentReasonCodes = (() => {
    if (!relevantMoment) {
      return ["HISTORICAL_MOMENT_UNRESOLVED"];
    }

    if (
      relevantMoment.orderBasis !== "AUTHORITATIVE_SEQUENCE" &&
      relevantMoment.orderBasis !== "DDT_NETWORK_ORDER" &&
      relevantMoment.orderBasis !== "INDEPENDENT_TIME_PROOF"
    ) {
      return ["HISTORICAL_MOMENT_UNRESOLVED"];
    }

    if (
      relevantMoment.orderBasis === "AUTHORITATIVE_SEQUENCE" &&
      (
        typeof relevantMoment.sequence !== "number" ||
        !Number.isInteger(relevantMoment.sequence) ||
        relevantMoment.sequence < 0
      )
    ) {
      return ["HISTORICAL_MOMENT_UNRESOLVED"];
    }

    return [];
  })();

  const issuerAuthorityReasonCodesByEvidenceId =
    new Map<string, string[]>(
      collected.evidence.map((item) => {
        const resolution =
          resolveEvidenceIssuerAuthorityGrant(
            collected.evidence,
            item,
            trustConfiguration
          );

        const reasonCodes =
          evaluateResolvedAuthorityGrant(
            collected.evidence,
            resolution,
            relevantMoment,
            trustConfiguration,
            availableHistoricalEvidenceIds,
            relevantMomentReasonCodes
          );

        return [
          item.evidence.evidenceId,
          [...new Set(reasonCodes)].sort(),
        ];
      })
    );

  const signingKeyLifecycleHistoricalOrderReasonCodes = [
    ...new Set(
      collected.evidence
        .filter(({ evidence }) => {
          if (
            !signingContext ||
            evidence.evidenceType !== "KEY_LIFECYCLE_EVENT"
          ) {
            return false;
          }

          const event = parseKeyLifecycleEventBody(evidence.body);

          return (
            event !== null &&
            event.verificationMethodId ===
              signingContext.verificationMethod
          );
        })
        .flatMap(({ evidence }) =>
          evaluateHistoricalOrder(
            evidence,
            availableHistoricalEvidenceIds,
            trustConfiguration
          )
        )
    ),
  ].sort();

  const signingKeyLifecycleEvaluation = signingContext
    ? evaluateKeyLifecycleChain(
        collected.evidence,
        signingContext.verificationMethod
      )
    : {
        items: [],
        reasonCodes: ["KEY_LIFECYCLE_UNRESOLVED"],
      };

  const signingKeyLifecycleAtRelevantMoment =
    selectKeyLifecycleAtRelevantMoment(
      signingKeyLifecycleEvaluation,
      relevantMoment
    );

  const signingKeyLifecycleState =
    deriveKeyLifecycleState(
      signingKeyLifecycleAtRelevantMoment
    );

  const laterKeyLifecycleReasonCodes =
    evaluateLaterKeyLifecycleEvidence(
      signingKeyLifecycleEvaluation,
      signingKeyLifecycleAtRelevantMoment
    );

  const signingKeyLifecycleReasonCodes = [
    ...new Set([
      ...signingKeyLifecycleState.reasonCodes,
      ...laterKeyLifecycleReasonCodes,
      ...relevantMomentReasonCodes,
      ...signingKeyLifecycleHistoricalOrderReasonCodes,
    ]),
  ].sort();

  const registrantIdentityBindingResolution =
    resolveRegistrantIdentityBinding(
      collected.evidence,
      matchingDescriptorItems,
      signingContext
    );

  const registrantIdentityReasonCodes = (() => {
    if (
      registrantIdentityBindingResolution.reasonCodes.length > 0 ||
      !registrantIdentityBindingResolution.binding ||
      !registrantIdentityBindingResolution.bindingItem
    ) {
      return registrantIdentityBindingResolution.reasonCodes.length > 0
        ? registrantIdentityBindingResolution.reasonCodes
        : ["IDENTITY_BINDING_UNRESOLVED"];
    }

    const binding =
      registrantIdentityBindingResolution.binding;

    const bindingStatusChain =
      evaluateIdentityBindingStatusChain(
        collected.evidence,
        binding.bindingId
      );

    const bindingStatusAtRelevantMoment =
      selectIdentityBindingStatusAtRelevantMoment(
        bindingStatusChain,
        relevantMoment
      );

    const bindingState =
      deriveIdentityBindingState(
        bindingStatusAtRelevantMoment
      );

    const bindingHistoricalOrderReasonCodes = [
      ...new Set(
        collected.evidence
          .filter(({ evidence }) => {
            if (
              evidence.evidenceType !==
              "IDENTITY_BINDING_STATUS_EVENT"
            ) {
              return false;
            }

            const event =
              parseIdentityBindingStatusEventBody(
                evidence.body
              );

            return (
              event !== null &&
              event.bindingId === binding.bindingId
            );
          })
          .flatMap(({ evidence }) =>
            evaluateHistoricalOrder(
              evidence,
              availableHistoricalEvidenceIds,
              trustConfiguration
            )
          )
      ),
    ].sort();

    const structuralReasonCodes = [
      ...new Set([
        ...bindingState.reasonCodes,
        ...relevantMomentReasonCodes,
        ...bindingHistoricalOrderReasonCodes,
      ]),
    ].sort();

    if (structuralReasonCodes.length > 0) {
      return structuralReasonCodes;
    }

    if (!referenceRecorderPolicy || !signingContext) {
      return ["TRUST_CONFIGURATION_UNAVAILABLE"];
    }

    const assurance = referenceRecorderPolicy.identityAssurance;

    const boundAssuranceProfile =
      isObject(binding.assuranceProfile) &&
      typeof binding.assuranceProfile.artifactId === "string" &&
      typeof binding.assuranceProfile.version === "string" &&
      isObject(binding.assuranceProfile.digest) &&
      typeof binding.assuranceProfile.digest.algorithm === "string" &&
      typeof binding.assuranceProfile.digest.value === "string"
        ? {
            artifactId: binding.assuranceProfile.artifactId,
            version: binding.assuranceProfile.version,
            digest: {
              algorithm: binding.assuranceProfile.digest.algorithm,
              value: binding.assuranceProfile.digest.value,
            },
          }
        : null;

    if (
      !boundAssuranceProfile ||
      binding.identityNamespace !== assurance.identityNamespace ||
      !assurance.acceptedRegistrantIdentityTypes.includes(
        signingContext.registrant.identityType
      ) ||
      !assurance.requiredBindingScopes.every((scope) =>
        binding.bindingScopes.includes(scope)
      ) ||
      !referenceRecorderPolicy.acceptedIdentityAssuranceProfiles.some(
        (profile) =>
          profile.artifactId === boundAssuranceProfile.artifactId &&
          profile.version === boundAssuranceProfile.version &&
          profile.digest.algorithm ===
            boundAssuranceProfile.digest.algorithm &&
          profile.digest.value === boundAssuranceProfile.digest.value
      )
    ) {
      return ["IDENTITY_BINDING_INVALID"];
    }

    return [];
  })();

  const registrantAuthorityGrantResolution =
    resolveRegistrantAuthorityGrant(
      collected.evidence,
      signingContext
    );

  const registrantAuthorityReasonCodes = (() => {
    if (
      registrantAuthorityGrantResolution.reasonCodes.length > 0 ||
      !registrantAuthorityGrantResolution.grant ||
      !registrantAuthorityGrantResolution.item
    ) {
      return registrantAuthorityGrantResolution.reasonCodes.length > 0
        ? registrantAuthorityGrantResolution.reasonCodes
        : ["AUTHORITY_EVIDENCE_UNAVAILABLE"];
    }

    const leafGrant =
      registrantAuthorityGrantResolution.grant;

    const grantChain =
      evaluateAuthorityGrantChain(
        collected.evidence,
        {
          item: registrantAuthorityGrantResolution.item,
          grant: leafGrant,
        }
      );

    if (grantChain.reasonCodes.length > 0) {
      return grantChain.reasonCodes;
    }

    const rootReasonCodes =
      evaluateAuthorityRoot(
        grantChain,
        trustConfiguration
      );

    if (rootReasonCodes.length > 0) {
      return rootReasonCodes;
    }

    const scopeReasonCodes =
      evaluateAuthorityScopeAmplification(
        grantChain,
        trustConfiguration
      );

    if (scopeReasonCodes.length > 0) {
      return scopeReasonCodes;
    }

    const registrationScopeReasonCodes =
      evaluateRegistrationAgainstAuthorityScope(
        record,
        registrantAuthorityGrantResolution,
        trustConfiguration,
        referenceRecorderPolicy
      );

    if (registrationScopeReasonCodes.length > 0) {
      return registrationScopeReasonCodes;
    }

    const statusReasonCodes: string[] = [];

    for (const { grant } of grantChain.items) {
      const statusChain =
        evaluateAuthorityStatusChain(
          collected.evidence,
          grant.grantId
        );

      const statusAtRelevantMoment =
        selectAuthorityStatusAtRelevantMoment(
          statusChain,
          relevantMoment
        );

      const state =
        deriveAuthorityState(
          statusAtRelevantMoment
        );

      statusReasonCodes.push(
        ...state.reasonCodes
      );

      const historicalOrderReasonCodes = [
        ...new Set(
          collected.evidence
            .filter(({ evidence }) => {
              if (
                evidence.evidenceType !==
                "AUTHORITY_STATUS_EVENT"
              ) {
                return false;
              }

              const event =
                parseAuthorityStatusEventBody(
                  evidence.body
                );

              return (
                event !== null &&
                event.grantId === grant.grantId
              );
            })
            .flatMap(({ evidence }) =>
              evaluateHistoricalOrder(
                evidence,
                availableHistoricalEvidenceIds,
                trustConfiguration
              )
            )
        ),
      ].sort();

      statusReasonCodes.push(
        ...historicalOrderReasonCodes
      );
    }

    const structuralReasonCodes = [
      ...new Set([
        ...statusReasonCodes,
        ...relevantMomentReasonCodes,
      ]),
    ].sort();

    if (structuralReasonCodes.length > 0) {
      return structuralReasonCodes;
    }

    /*
     * Structural authority is resolved here. Evidence authenticity
     * and issuer authority are evaluated independently and merged
     * into the REGISTRANT_AUTHORITY axis result below.
     */
    return [];
  })();

  const signingKeyIdentityReasonCodes = (() => {
    if (!signingContext || descriptorItems.length === 0) {
      return ["KEY_DESCRIPTOR_UNAVAILABLE"];
    }

    if (matchingDescriptorItems.length === 0) {
      return ["VERIFICATION_METHOD_MISMATCH"];
    }

    const descriptorResults =
      matchingDescriptorItems.map(({ evidence }) =>
        evaluateSigningDescriptor(
          evidence.body,
          signingContext
        )
      );

    const firstFailure = descriptorResults.find(
      (codes) => codes.length > 0
    );

    if (firstFailure) {
      return firstFailure;
    }

    /*
     * Descriptor key identity is structurally resolved here.
     * Evidence authenticity and issuer authority are merged into
     * SIGNING_KEY_IDENTITY independently below.
     */
    return [];
  })();

  const issuerAuthorityReasonCodesForAxis = (
    axis: DDTHistoricalIdentityAuthorityAxis
  ): string[] => {
    const evidenceTypes =
      axis === "SIGNING_KEY_IDENTITY"
        ? new Set(["VERIFICATION_METHOD_DESCRIPTOR"])
        : axis === "SIGNING_KEY_LIFECYCLE"
          ? new Set(["KEY_LIFECYCLE_EVENT"])
          : axis === "REGISTRANT_IDENTITY"
            ? new Set([
                "IDENTITY_BINDING",
                "IDENTITY_BINDING_STATUS_EVENT",
              ])
            : new Set([
                "AUTHORITY_GRANT",
                "AUTHORITY_STATUS_EVENT",
              ]);

    return [
      ...new Set(
        collected.evidence
          .filter(({ evidence }) => {
            if (!evidenceTypes.has(evidence.evidenceType)) {
              return false;
            }

            if (
              axis === "SIGNING_KEY_IDENTITY" &&
              signingContext &&
              evidence.evidenceType ===
                "VERIFICATION_METHOD_DESCRIPTOR"
            ) {
              return (
                isObject(evidence.body) &&
                evidence.body.verificationMethodId ===
                  signingContext.verificationMethod
              );
            }

            return true;
          })
          .flatMap(({ evidence }) => {
            const issuerReasons =
              issuerAuthorityReasonCodesByEvidenceId.get(
                evidence.evidenceId
              ) ?? [];

            if (
              evidence.effectiveOrder.basis ===
              "AUTHORITATIVE_SEQUENCE"
            ) {
              const orderReasons = evaluateHistoricalOrder(
                evidence,
                availableHistoricalEvidenceIds,
                trustConfiguration
              );

              if (
                !orderReasons.includes(
                  "TRUST_CONFIGURATION_UNAVAILABLE"
                )
              ) {
                return issuerReasons.filter(
                  (reason) =>
                    reason !==
                    "TRUST_CONFIGURATION_UNAVAILABLE"
                );
              }
            }

            return issuerReasons;
          })
      ),
    ].sort();
  };

  const ruleResults: DDTRuleResult[] =
    HISTORICAL_IDENTITY_AUTHORITY_AXES.map((axis) => {
      const reasonCodes = [
        ...new Set([
          ...(
            axis === "SIGNING_KEY_IDENTITY"
              ? signingKeyIdentityReasonCodes
              : axis === "SIGNING_KEY_LIFECYCLE"
                ? signingKeyLifecycleReasonCodes
                : axis === "REGISTRANT_IDENTITY"
                  ? registrantIdentityReasonCodes
                  : axis === "REGISTRANT_AUTHORITY"
                    ? registrantAuthorityReasonCodes
                    : [...AXIS_REASON_CODES[axis]]
          ),
          ...authenticityReasonCodesForAxis(axis),
          ...issuerAuthorityReasonCodesForAxis(axis),
        ]),
      ].sort();

      return {
        resultId:
          `identity-authority.${axis.toLowerCase().replaceAll("_", "-")}`,
        sourceType: "PROFILE_RULE",
        sourceId:
          `ddt.identity-authority.historical-v1.${axis}`,
        requirement: "REQUIRED",
        applicability: "APPLICABLE",
        status: historicalIdentityAuthorityRuleStatus(
          axis,
          reasonCodes
        ),
        reasonCodes,
        targetRefs:
          axis === "SIGNING_KEY_IDENTITY" && signingContext
            ? [signingContext.verificationMethod]
            : [],
        evidenceRefs:
          axis === "SIGNING_KEY_IDENTITY" &&
          matchingDescriptorItems.length > 0
            ? matchingDescriptorItems
                .map(({ manifestEvidenceRef }) => manifestEvidenceRef)
                .sort()
            : collected.evidence
                .map(({ evidence }) => evidence.evidenceId)
                .sort(),
      };
    });

  return {
    applicable: true,
    ruleResults,
    signingKeyLifecycle: signingKeyLifecycleState,
  };
}
