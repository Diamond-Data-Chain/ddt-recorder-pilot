import {
  createHash,
  generateKeyPairSync,
} from "node:crypto";

import {
  evaluateHistoricalIdentityAuthority,
  type DDTHistoricalIdentityAuthorityEvidence,
  type DDTHistoricalIdentityAuthorityRelevantMoment,
  type DDTHistoricalIdentityAuthoritySigningContext,
  type DDTHistoricalIdentityAuthorityTrustConfiguration,
} from "../../lib/ddt-recorder/validation/historicalIdentityAuthorityEvaluator";

import type { DDTNormalizedRecord } from "../../lib/ddt-recorder/normalize/normalize";

import {
  createIdentityAuthorityEd25519Proof,
} from "../../lib/ddt-recorder/signing/ed25519";


async function main() {
  type LifecycleEventType =
    | "ACTIVATE"
    | "SUSPEND"
    | "RESUME"
    | "ROTATE_OUT"
    | "REVOKE"
    | "EXPIRE"
    | "COMPROMISE_DECLARED";

  const VERIFICATION_METHOD = "did:example:issuer#key-1";

  const iaTestKeys = new Map<
    string,
    {
      privateKeyPem: string;
      publicKeyBase64url: string;
    }
  >();

  function iaTestKey(verificationMethod: string): {
    privateKeyPem: string;
    publicKeyBase64url: string;
  } {
    const existing = iaTestKeys.get(verificationMethod);

    if (existing) {
      return existing;
    }

    const { privateKey, publicKey } =
      generateKeyPairSync("ed25519");

    const privateKeyPem = privateKey.export({
      type: "pkcs8",
      format: "pem",
    }).toString();

    const publicKeyDer = publicKey.export({
      type: "spki",
      format: "der",
    });

    const rawPublicKey = publicKeyDer.subarray(-32);

    if (rawPublicKey.length !== 32) {
      throw new Error(
        `Invalid Ed25519 fixture public key for ${verificationMethod}`
      );
    }

    const generated = {
      privateKeyPem,
      publicKeyBase64url:
        rawPublicKey.toString("base64url"),
    };

    iaTestKeys.set(verificationMethod, generated);

    return generated;
  }

  iaTestKey(VERIFICATION_METHOD);

  const signingContext: DDTHistoricalIdentityAuthoritySigningContext = {
    registrant: {
      identityRef: "did:example:recorder",
      identityType: "ORGANIZATION_SERVICE",
    },
    verificationMethod: VERIFICATION_METHOD,
    publicKeyBase64url:
      iaTestKey(VERIFICATION_METHOD).publicKeyBase64url,
  };

  function sha256(bytes: Uint8Array) {
    return {
      algorithm: "SHA-256",
      value: createHash("sha256").update(bytes).digest("hex"),
    };
  }

  function makeLifecycleEvidence(
    evidenceId: string,
    eventType: LifecycleEventType,
    sequence: number,
    orderSequence: number,
    previous?: {
      evidenceId: string;
      digest: {
        algorithm: string;
        value: string;
      };
    },
    authorityEvidenceRefs: string[] = []
  ): DDTHistoricalIdentityAuthorityEvidence {
    return {
      evidenceId,
      evidenceType: "KEY_LIFECYCLE_EVENT",
      evidenceVersion: "0.1.0-draft.1",
      issuer: {
        identityRef: "did:example:authority",
        verificationMethod: "did:example:authority#key-1",
        proofRef: `urn:test:proof:${sequence}`,
        authorityEvidenceRefs,
      },
      effectiveOrder: {
        basis: "AUTHORITATIVE_SEQUENCE",
        sequence: orderSequence,
        evidenceRefs: [],
      },
      body: {
        verificationMethodId: VERIFICATION_METHOD,
        eventType,
        sequence,
        ...(previous ? { previousEvent: previous } : {}),
        ...(eventType === "ROTATE_OUT"
          ? {
              replacementVerificationMethodId:
                "did:example:issuer#key-2",
            }
          : {}),
        effect: "PROSPECTIVE",
        reasonCode: `TEST_${eventType}`,
        supportingEvidenceRefs: [],
      },
    };
  }

  function encodeEvidence(evidence: unknown): Uint8Array {
    return new TextEncoder().encode(JSON.stringify(evidence));
  }

  function makeIssuerDescriptorEvidence(
    verificationMethod: string,
    identityRef: string
  ): DDTHistoricalIdentityAuthorityEvidence {
    const key = iaTestKey(verificationMethod);
    const keyBytes = Buffer.from(
      key.publicKeyBase64url,
      "base64url"
    );

    return {
      evidenceId:
        `urn:test:issuer-descriptor:${encodeURIComponent(verificationMethod)}`,
      evidenceType: "VERIFICATION_METHOD_DESCRIPTOR",
      evidenceVersion: "0.1.0-draft.1",
      issuer: {
        identityRef,
        verificationMethod,
        proofRef:
          `urn:test:proof:issuer-descriptor:${encodeURIComponent(verificationMethod)}`,
        authorityEvidenceRefs: [],
      },
      effectiveOrder: {
        basis: "AUTHORITATIVE_SEQUENCE",
        sequence: 0,
        evidenceRefs: [],
      },
      body: {
        verificationMethodId: verificationMethod,
        controllerRef: identityRef,
        algorithm: "Ed25519",
        publicKey: {
          representation: "INLINE",
          encoding: "BASE64URL",
          value: key.publicKeyBase64url,
          fingerprint: {
            algorithm: "SHA-256",
            value: createHash("sha256")
              .update(keyBytes)
              .digest("hex"),
          },
        },
        permittedPurposes: [
          "IDENTITY_EVIDENCE_ISSUANCE",
          "AUTHORITY_EVIDENCE_ISSUANCE",
          "LIFECYCLE_EVIDENCE_ISSUANCE",
        ],
      },
    };
  }

  async function makeRecord(
    evidenceObjects: DDTHistoricalIdentityAuthorityEvidence[]
  ): Promise<{
    record: DDTNormalizedRecord;
    refs: Map<
      number,
      {
        evidenceRef: string;
        commitment: {
          algorithm: string;
          value: string;
        };
      }
    >;
  }> {
    const expandedEvidenceObjects = [...evidenceObjects];

    for (const item of evidenceObjects) {
      const verificationMethod =
        item.issuer.verificationMethod;

      const alreadyDescribed =
        expandedEvidenceObjects.some(
          (candidate) =>
            candidate.evidenceType ===
              "VERIFICATION_METHOD_DESCRIPTOR" &&
            typeof candidate.body === "object" &&
            candidate.body !== null &&
            "verificationMethodId" in candidate.body &&
            candidate.body.verificationMethodId ===
              verificationMethod
        );

      if (!alreadyDescribed) {
        expandedEvidenceObjects.push(
          makeIssuerDescriptorEvidence(
            verificationMethod,
            item.issuer.identityRef
          )
        );
      }
    }

    const iaEvidence = expandedEvidenceObjects.map((item) => ({
      name: `${item.evidenceId}.json`,
      mediaType: "application/json",
      bytes: encodeEvidence(item),
      role: "AUTHORITY_EVIDENCE" as const,
      bindings: ["ACTOR_AUTHORITY" as const],
    }));

    const purposeForEvidenceType = (
      evidenceType: DDTHistoricalIdentityAuthorityEvidence["evidenceType"]
    ) => {
      switch (evidenceType) {
        case "VERIFICATION_METHOD_DESCRIPTOR":
        case "IDENTITY_BINDING":
        case "IDENTITY_BINDING_STATUS_EVENT":
          return "IDENTITY_EVIDENCE_ISSUANCE" as const;

        case "KEY_LIFECYCLE_EVENT":
          return "LIFECYCLE_EVIDENCE_ISSUANCE" as const;

        case "AUTHORITY_GRANT":
        case "AUTHORITY_STATUS_EVENT":
          return "AUTHORITY_EVIDENCE_ISSUANCE" as const;
      }
    };

    const proofEvidence = await Promise.all(
      expandedEvidenceObjects.map(async (item, index) => {
        const issuerKey =
          iaTestKey(item.issuer.verificationMethod);

        const digest =
          sha256(iaEvidence[index].bytes);

        const targetDigest = {
          algorithm: "SHA-256" as const,
          value: digest.value,
        };

        const proof =
          await createIdentityAuthorityEd25519Proof({
            proofId: `${item.issuer.proofRef}:signature`,
            purpose: purposeForEvidenceType(
              item.evidenceType
            ),
            targetDigest,
            verificationMethod:
              item.issuer.verificationMethod,
            privateKeyPem: issuerKey.privateKeyPem,
          });

        return {
          name: `${item.evidenceId}.proof.json`,
          mediaType: "application/json",
          bytes: encodeEvidence(proof),
          role: "VALIDATION_ARTIFACT" as const,
          bindings: [],
          evidenceRef: item.issuer.proofRef,
        };
      })
    );

    const evidence = [
      ...iaEvidence,
      ...proofEvidence.map(
        ({ evidenceRef: _evidenceRef, ...item }) => item
      ),
    ];

    const refs = new Map<
      number,
      {
        evidenceRef: string;
        commitment: {
          algorithm: string;
          value: string;
        };
      }
    >();

    iaEvidence.forEach((item, index) => {
      refs.set(index, {
        evidenceRef: `urn:ddt:manifest:test:${index}`,
        commitment: sha256(item.bytes),
      });
    });

    proofEvidence.forEach((item, proofIndex) => {
      const index = iaEvidence.length + proofIndex;

      refs.set(index, {
        evidenceRef: item.evidenceRef,
        commitment: sha256(item.bytes),
      });
    });

    const record: DDTNormalizedRecord = {
      ddtRecordId: "urn:uuid:test-record",
      ddtFamilyId: "urn:uuid:test-family",
      subject: {
        namespace: "urn:test",
        reference: "subject-1",
      },
      recordType: "TEST_RECORD",
      publisher: {
        name: "Regression Harness",
      },
      source: {
        type: "SYSTEM",
        reference: "urn:test:source",
      },
      eventTime: "2026-01-01T00:00:00.000Z",
      description: "Historical IA lifecycle regression test",
      evidence,
    };

    return { record, refs };
  }

  function link(
    previousEvidence: DDTHistoricalIdentityAuthorityEvidence
  ) {
    const bytes = encodeEvidence(previousEvidence);

    return {
      evidenceId: previousEvidence.evidenceId,
      digest: sha256(bytes),
    };
  }

  async function lifecycleEvaluation(
    evidenceObjects: DDTHistoricalIdentityAuthorityEvidence[],
    relevantSequence: number,
    trustConfiguration?: DDTHistoricalIdentityAuthorityTrustConfiguration
  ) {
    const { record, refs } = await makeRecord(evidenceObjects);

    const relevantMoment: DDTHistoricalIdentityAuthorityRelevantMoment = {
      momentType: "SOURCE_SIGNING_TIME",
      orderBasis: "AUTHORITATIVE_SEQUENCE",
      sequence: relevantSequence,
      evidenceRefs: [],
    };

    const result = await evaluateHistoricalIdentityAuthority(
      record,
      signingContext,
      refs,
      relevantMoment,
      trustConfiguration
    );

    const lifecycle = result.ruleResults.find(
      (item) =>
        item.resultId === "identity-authority.signing-key-lifecycle"
    );

    if (!lifecycle || !result.signingKeyLifecycle) {
      throw new Error("SIGNING_KEY_LIFECYCLE result missing");
    }

    return {
      state: result.signingKeyLifecycle.state,
      reasonCodes: lifecycle.reasonCodes,
    };
  }

  async function lifecycleReasons(
    evidenceObjects: DDTHistoricalIdentityAuthorityEvidence[],
    relevantSequence: number,
    trustConfiguration?: DDTHistoricalIdentityAuthorityTrustConfiguration
  ): Promise<string[]> {
    return (
      await lifecycleEvaluation(
        evidenceObjects,
        relevantSequence,
        trustConfiguration
      )
    ).reasonCodes;
  }

  function expectIncludes(
    name: string,
    actual: string[],
    expected: string
  ) {
    if (!actual.includes(expected)) {
      throw new Error(
        `${name}: expected ${expected}, got ${JSON.stringify(actual)}`
      );
    }

    console.log(`PASS: ${name}`);
  }

  function expectNotIncludes(
    name: string,
    actual: string[],
    unexpected: string
  ) {
    if (actual.includes(unexpected)) {
      throw new Error(
        `${name}: unexpected ${unexpected}, got ${JSON.stringify(actual)}`
      );
    }

    console.log(`PASS: ${name}`);
  }

  // 1. ACTIVE without closed coverage must remain unresolved.
  {
    const activate = makeLifecycleEvidence(
      "urn:test:lifecycle:0",
      "ACTIVATE",
      0,
      10
    );

    const reasons = await lifecycleReasons([activate], 10);

    expectIncludes(
      "ACTIVE without closed coverage remains unresolved",
      reasons,
      "KEY_LIFECYCLE_UNRESOLVED"
    );
  }

  // 2. Missing lifecycle sequence must be detected.
  {
    const activate = makeLifecycleEvidence(
      "urn:test:lifecycle:0",
      "ACTIVATE",
      0,
      10
    );

    const revoke = makeLifecycleEvidence(
      "urn:test:lifecycle:2",
      "REVOKE",
      2,
      30,
      link(activate)
    );

    const reasons = await lifecycleReasons([activate, revoke], 30);

    expectIncludes(
      "missing lifecycle sequence",
      reasons,
      "KEY_LIFECYCLE_GAP"
    );
  }

  // 3. Broken predecessor digest must be detected.
  {
    const activate = makeLifecycleEvidence(
      "urn:test:lifecycle:0",
      "ACTIVATE",
      0,
      10
    );

    const revoke = makeLifecycleEvidence(
      "urn:test:lifecycle:1",
      "REVOKE",
      1,
      20,
      {
        evidenceId: activate.evidenceId,
        digest: {
          algorithm: "SHA-256",
          value: "0".repeat(64),
        },
      }
    );

    const reasons = await lifecycleReasons([activate, revoke], 20);

    expectIncludes(
      "broken predecessor digest",
      reasons,
      "KEY_LIFECYCLE_GAP"
    );
  }

  // 4. Later prospective revocation must not invalidate earlier use.
  {
    const activate = makeLifecycleEvidence(
      "urn:test:lifecycle:0",
      "ACTIVATE",
      0,
      10
    );

    const revoke = makeLifecycleEvidence(
      "urn:test:lifecycle:1",
      "REVOKE",
      1,
      20,
      link(activate)
    );

    const reasons = await lifecycleReasons([activate, revoke], 10);

    expectNotIncludes(
      "later revocation does not invalidate earlier use",
      reasons,
      "KEY_LIFECYCLE_CONFLICT"
    );

    expectIncludes(
      "earlier ACTIVE still requires closed coverage",
      reasons,
      "KEY_LIFECYCLE_UNRESOLVED"
    );
  }

  // 5. Later compromise must make earlier lifecycle unresolved.
  {
    const activate = makeLifecycleEvidence(
      "urn:test:lifecycle:0",
      "ACTIVATE",
      0,
      10
    );

    const compromise = makeLifecycleEvidence(
      "urn:test:lifecycle:1",
      "COMPROMISE_DECLARED",
      1,
      20,
      link(activate)
    );

    const reasons = await lifecycleReasons(
      [activate, compromise],
      10
    );

    expectIncludes(
      "later compromise affects earlier lifecycle",
      reasons,
      "KEY_LIFECYCLE_UNRESOLVED"
    );
  }

  // 6. Bound authoritative sequence source must resolve trust configuration.
  {
    const activate = makeLifecycleEvidence(
      "urn:test:lifecycle:trusted:0",
      "ACTIVATE",
      0,
      10
    );

    const trustConfiguration: DDTHistoricalIdentityAuthorityTrustConfiguration = {
      configurationId: "urn:test:trust-config",
      configurationVersion: "0.1.0-draft.1",
      authoritativeSequenceSources: [
        {
          sourceId: "urn:test:lifecycle-authority",
          evidenceTypes: ["KEY_LIFECYCLE_EVENT"],
          issuerIdentityRef: "did:example:authority",
          issuerVerificationMethod: "did:example:authority#key-1",
          sequenceScope: "VERIFICATION_METHOD",
        },
      ],
      authorityRoots: [
        {
          rootId: "urn:test:authority-root",
          identityRef: "did:example:authority",
          acceptedGrantorRoles: ["DDT_REGISTRAR"],
        },
      ],
    };

    const reasons = await lifecycleReasons(
      [activate],
      10,
      trustConfiguration
    );

    expectNotIncludes(
      "trusted authoritative sequence source",
      reasons,
      "TRUST_CONFIGURATION_UNAVAILABLE"
    );
  }

  // 7. Wrong authoritative sequence issuer must remain unresolved.
  {
    const activate = makeLifecycleEvidence(
      "urn:test:lifecycle:untrusted:0",
      "ACTIVATE",
      0,
      10
    );

    const trustConfiguration: DDTHistoricalIdentityAuthorityTrustConfiguration = {
      configurationId: "urn:test:trust-config-wrong-issuer",
      configurationVersion: "0.1.0-draft.1",
      authoritativeSequenceSources: [
        {
          sourceId: "urn:test:other-authority",
          evidenceTypes: ["KEY_LIFECYCLE_EVENT"],
          issuerIdentityRef: "did:example:wrong-authority",
          issuerVerificationMethod: "did:example:wrong-authority#key-1",
          sequenceScope: "VERIFICATION_METHOD",
        },
      ],
    };

    const reasons = await lifecycleReasons(
      [activate],
      10,
      trustConfiguration
    );

    expectIncludes(
      "untrusted authoritative sequence source",
      reasons,
      "TRUST_CONFIGURATION_UNAVAILABLE"
    );
  }

  // 8. Use during suspension must resolve to SUSPENDED.
  {
    const activate = makeLifecycleEvidence(
      "urn:test:lifecycle:suspend:0",
      "ACTIVATE",
      0,
      10
    );

    const suspend = makeLifecycleEvidence(
      "urn:test:lifecycle:suspend:1",
      "SUSPEND",
      1,
      20,
      link(activate)
    );

    const evaluation = await lifecycleEvaluation(
      [activate, suspend],
      20
    );

    if (evaluation.state !== "SUSPENDED") {
      throw new Error(
        `use during suspension: expected SUSPENDED, got ${evaluation.state}`
      );
    }

    console.log("PASS: use during suspension resolves to SUSPENDED");
  }

  // 9. RESUME after SUSPEND restores ACTIVE semantics.
  // ACTIVE still requires closed coverage, so the final derived state
  // must remain UNRESOLVED rather than falsely claiming proven ACTIVE.
  {
    const activate = makeLifecycleEvidence(
      "urn:test:lifecycle:resume:0",
      "ACTIVATE",
      0,
      10
    );

    const suspend = makeLifecycleEvidence(
      "urn:test:lifecycle:resume:1",
      "SUSPEND",
      1,
      20,
      link(activate)
    );

    const resume = makeLifecycleEvidence(
      "urn:test:lifecycle:resume:2",
      "RESUME",
      2,
      30,
      link(suspend)
    );

    const evaluation = await lifecycleEvaluation(
      [activate, suspend, resume],
      30
    );

    if (evaluation.state !== "UNRESOLVED") {
      throw new Error(
        `resume after suspension: expected UNRESOLVED pending closed coverage, got ${evaluation.state}`
      );
    }

    expectIncludes(
      "resume after suspension still requires closed coverage",
      evaluation.reasonCodes,
      "KEY_LIFECYCLE_UNRESOLVED"
    );
  }

  // 10. ROTATE_OUT is a terminal historical state.
  {
    const activate = makeLifecycleEvidence(
      "urn:test:lifecycle:rotate:0",
      "ACTIVATE",
      0,
      10
    );

    const rotate = makeLifecycleEvidence(
      "urn:test:lifecycle:rotate:1",
      "ROTATE_OUT",
      1,
      20,
      link(activate)
    );

    const evaluation = await lifecycleEvaluation(
      [activate, rotate],
      20
    );

    if (evaluation.state !== "ROTATED_OUT") {
      throw new Error(
        `rotation: expected ROTATED_OUT, got ${evaluation.state}`
      );
    }

    console.log("PASS: rotation resolves to ROTATED_OUT");
  }

  // 11. REVOKE at the relevant moment resolves to REVOKED.
  {
    const activate = makeLifecycleEvidence(
      "urn:test:lifecycle:revoked:0",
      "ACTIVATE",
      0,
      10
    );

    const revoke = makeLifecycleEvidence(
      "urn:test:lifecycle:revoked:1",
      "REVOKE",
      1,
      20,
      link(activate)
    );

    const evaluation = await lifecycleEvaluation(
      [activate, revoke],
      20
    );

    if (evaluation.state !== "REVOKED") {
      throw new Error(
        `revocation at use: expected REVOKED, got ${evaluation.state}`
      );
    }

    console.log("PASS: revocation at relevant moment resolves to REVOKED");
  }

  // 12. EXPIRE at the relevant moment resolves to EXPIRED.
  {
    const activate = makeLifecycleEvidence(
      "urn:test:lifecycle:expired:0",
      "ACTIVATE",
      0,
      10
    );

    const expire = makeLifecycleEvidence(
      "urn:test:lifecycle:expired:1",
      "EXPIRE",
      1,
      20,
      link(activate)
    );

    const evaluation = await lifecycleEvaluation(
      [activate, expire],
      20
    );

    if (evaluation.state !== "EXPIRED") {
      throw new Error(
        `expired key: expected EXPIRED, got ${evaluation.state}`
      );
    }

    console.log("PASS: expired key resolves to EXPIRED");
  }

  // 13. A terminal lifecycle state must not be silently reversed.
  {
    const activate = makeLifecycleEvidence(
      "urn:test:lifecycle:terminal:0",
      "ACTIVATE",
      0,
      10
    );

    const revoke = makeLifecycleEvidence(
      "urn:test:lifecycle:terminal:1",
      "REVOKE",
      1,
      20,
      link(activate)
    );

    const resume = makeLifecycleEvidence(
      "urn:test:lifecycle:terminal:2",
      "RESUME",
      2,
      30,
      link(revoke)
    );

    const evaluation = await lifecycleEvaluation(
      [activate, revoke, resume],
      30
    );

    if (evaluation.state !== "UNRESOLVED") {
      throw new Error(
        `terminal-state reversal: expected UNRESOLVED, got ${evaluation.state}`
      );
    }

    expectIncludes(
      "terminal lifecycle state cannot be silently reversed",
      evaluation.reasonCodes,
      "KEY_LIFECYCLE_CONFLICT"
    );
  }

  // 14. Conflicting lifecycle events at the same sequence must be detected.
  {
    const activate = makeLifecycleEvidence(
      "urn:test:lifecycle:conflict:0",
      "ACTIVATE",
      0,
      10
    );

    const revoke = makeLifecycleEvidence(
      "urn:test:lifecycle:conflict:1-revoke",
      "REVOKE",
      1,
      20,
      link(activate)
    );

    const expire = makeLifecycleEvidence(
      "urn:test:lifecycle:conflict:1-expire",
      "EXPIRE",
      1,
      20,
      link(activate)
    );

    const evaluation = await lifecycleEvaluation(
      [activate, revoke, expire],
      20
    );

    if (evaluation.state !== "UNRESOLVED") {
      throw new Error(
        `conflicting lifecycle events: expected UNRESOLVED, got ${evaluation.state}`
      );
    }

    expectIncludes(
      "conflicting valid lifecycle events",
      evaluation.reasonCodes,
      "KEY_LIFECYCLE_CONFLICT"
    );
  }

  console.log("PASS: historical IA lifecycle regression suite");

  const VALID_DESCRIPTOR_KEY_BYTES = Buffer.alloc(32, 1);
  const VALID_DESCRIPTOR_KEY_BASE64URL =
    VALID_DESCRIPTOR_KEY_BYTES.toString("base64url");
  const VALID_DESCRIPTOR_KEY_FINGERPRINT =
    createHash("sha256")
      .update(VALID_DESCRIPTOR_KEY_BYTES)
      .digest("hex");

  function makeValidSigningKeyDescriptorEvidence(): DDTHistoricalIdentityAuthorityEvidence {
    return {
      evidenceId: "urn:test:signing-key-descriptor:valid",
      evidenceType: "VERIFICATION_METHOD_DESCRIPTOR",
      evidenceVersion: "0.1.0-draft.1",
      issuer: {
        identityRef: "did:example:authority",
        verificationMethod: "did:example:authority#key-1",
        proofRef: "urn:test:proof:signing-key-descriptor",
        authorityEvidenceRefs: [],
      },
      effectiveOrder: {
        basis: "AUTHORITATIVE_SEQUENCE",
        sequence: 1,
        evidenceRefs: [],
      },
      body: {
        verificationMethodId: VERIFICATION_METHOD,
        controllerRef: "did:example:controller",
        algorithm: "Ed25519",
        publicKey: {
          representation: "INLINE",
          encoding: "BASE64URL",
          value: VALID_DESCRIPTOR_KEY_BASE64URL,
          fingerprint: {
            algorithm: "SHA-256",
            value: VALID_DESCRIPTOR_KEY_FINGERPRINT,
          },
        },
        permittedPurposes: ["DDT_REGISTRATION"],
      },
    };
  }

  async function signingKeyIdentityResult(
    descriptor: DDTHistoricalIdentityAuthorityEvidence,
    context: DDTHistoricalIdentityAuthoritySigningContext
  ) {
    const { record, refs } = await makeRecord([descriptor]);

    const result = await evaluateHistoricalIdentityAuthority(
      record,
      {
        ...context,
        publicKeyBase64url:
          context.publicKeyBase64url ===
          signingContext.publicKeyBase64url
            ? VALID_DESCRIPTOR_KEY_BASE64URL
            : context.publicKeyBase64url,
      },
      refs
    );

    const keyIdentity = result.ruleResults.find(
      (item) =>
        item.resultId === "identity-authority.signing-key-identity"
    );

    if (!keyIdentity) {
      throw new Error("SIGNING_KEY_IDENTITY result missing");
    }

    return {
      status: keyIdentity.status,
      reasonCodes: keyIdentity.reasonCodes,
    };
  }

  // SIGNING_KEY_IDENTITY: a descriptor for another verification
  // method is a proven mismatch and must map to FAIL.
  {
    const descriptor = makeValidSigningKeyDescriptorEvidence();

    const body = descriptor.body as Record<string, unknown>;
    body.verificationMethodId = "did:example:other#key-1";

    const result = await signingKeyIdentityResult(
      descriptor,
      {
        ...signingContext,
        publicKeyBase64url: VALID_DESCRIPTOR_KEY_BASE64URL,
      }
    );

    expectIncludes(
      "verification method mismatch",
      result.reasonCodes,
      "VERIFICATION_METHOD_MISMATCH"
    );

    if (result.status !== "FAIL") {
      throw new Error(
        `verification method mismatch: expected FAIL, got ${result.status}`
      );
    }

    console.log("PASS: verification method mismatch maps to FAIL");
  }

  // SIGNING_KEY_IDENTITY: a descriptor using another key
  // algorithm is a proven mismatch and must map to FAIL.
  {
    const descriptor = makeValidSigningKeyDescriptorEvidence();

    const body = descriptor.body as Record<string, unknown>;
    body.algorithm = "ECDSA";

    const result = await signingKeyIdentityResult(
      descriptor,
      {
        ...signingContext,
        publicKeyBase64url: VALID_DESCRIPTOR_KEY_BASE64URL,
      }
    );

    expectIncludes(
      "key algorithm mismatch",
      result.reasonCodes,
      "KEY_ALGORITHM_MISMATCH"
    );

    if (result.status !== "FAIL") {
      throw new Error(
        `key algorithm mismatch: expected FAIL, got ${result.status}`
      );
    }

    console.log("PASS: key algorithm mismatch maps to FAIL");
  }

  // SIGNING_KEY_IDENTITY: a key not permitted for DDT_REGISTRATION
  // is a proven purpose mismatch and must map to FAIL.
  {
    const descriptor = makeValidSigningKeyDescriptorEvidence();

    const body = descriptor.body as Record<string, unknown>;
    body.permittedPurposes = ["CONFORMANCE_ATTESTATION"];

    const result = await signingKeyIdentityResult(
      descriptor,
      {
        ...signingContext,
        publicKeyBase64url: VALID_DESCRIPTOR_KEY_BASE64URL,
      }
    );

    expectIncludes(
      "key purpose mismatch",
      result.reasonCodes,
      "KEY_PURPOSE_MISMATCH"
    );

    if (result.status !== "FAIL") {
      throw new Error(
        `key purpose mismatch: expected FAIL, got ${result.status}`
      );
    }

    console.log("PASS: key purpose mismatch maps to FAIL");
  }

  // SIGNING_KEY_IDENTITY: descriptor key bytes that differ from the
  // actual signing key are a proven mismatch and must map to FAIL.
  {
    const descriptor = makeValidSigningKeyDescriptorEvidence();
    const differentKeyBase64url =
      Buffer.alloc(32, 2).toString("base64url");

    const result = await signingKeyIdentityResult(
      descriptor,
      {
        ...signingContext,
        publicKeyBase64url: differentKeyBase64url,
      }
    );

    expectIncludes(
      "public key fingerprint mismatch",
      result.reasonCodes,
      "PUBLIC_KEY_FINGERPRINT_MISMATCH"
    );

    if (result.status !== "FAIL") {
      throw new Error(
        `public key fingerprint mismatch: expected FAIL, got ${result.status}`
      );
    }

    console.log(
      "PASS: public key fingerprint mismatch maps to FAIL"
    );
  }

  type IdentityBindingEventType =
    | "ACTIVATE"
    | "SUSPEND"
    | "RESUME"
    | "REVOKE"
    | "EXPIRE"
    | "SUPERSEDE";

  const CONTROLLER_REF = "did:example:controller";

  function makeDescriptorEvidence(): DDTHistoricalIdentityAuthorityEvidence {
    return {
      evidenceId: "urn:test:descriptor:1",
      evidenceType: "VERIFICATION_METHOD_DESCRIPTOR",
      evidenceVersion: "0.1.0-draft.1",
      issuer: {
        identityRef: "did:example:authority",
        verificationMethod: "did:example:authority#key-1",
        proofRef: "urn:test:proof:descriptor",
        authorityEvidenceRefs: [],
      },
      effectiveOrder: {
        basis: "AUTHORITATIVE_SEQUENCE",
        sequence: 1,
        evidenceRefs: [],
      },
      body: {
        verificationMethodId: VERIFICATION_METHOD,
        controllerRef: CONTROLLER_REF,
        algorithm: "Ed25519",
        publicKey: {},
        permittedPurposes: ["DDT_REGISTRATION"],
      },
    };
  }

  function makeIdentityBindingEvidence(
    bindingId = "urn:test:binding:1",
    boundIdentityRef = signingContext.registrant.identityRef
  ): DDTHistoricalIdentityAuthorityEvidence {
    return {
      evidenceId: "urn:test:identity-binding:1",
      evidenceType: "IDENTITY_BINDING",
      evidenceVersion: "0.1.0-draft.1",
      issuer: {
        identityRef: "did:example:identity-authority",
        verificationMethod: "did:example:identity-authority#key-1",
        proofRef: "urn:test:proof:identity-binding",
        authorityEvidenceRefs: [],
      },
      effectiveOrder: {
        basis: "AUTHORITATIVE_SEQUENCE",
        sequence: 2,
        evidenceRefs: [],
      },
      body: {
        bindingId,
        cryptographicControllerRef: CONTROLLER_REF,
        boundIdentityRef,
        identityNamespace: "did:example",
        bindingScopes: ["DDT_REGISTRANT"],
        assuranceProfile: {
          artifactId: "TEST-ASSURANCE-PROFILE",
          version: "0.1.0",
          digest: {
            algorithm: "SHA-256",
            value: "1".repeat(64),
          },
          mediaType: "application/json",
        },
        supportingEvidenceRefs: ["urn:test:identity-support:1"],
      },
    };
  }

  function makeIdentityBindingStatusEvidence(
    evidenceId: string,
    bindingId: string,
    eventType: IdentityBindingEventType,
    sequence: number,
    orderSequence: number,
    previous?: {
      evidenceId: string;
      digest: {
        algorithm: string;
        value: string;
      };
    }
  ): DDTHistoricalIdentityAuthorityEvidence {
    return {
      evidenceId,
      evidenceType: "IDENTITY_BINDING_STATUS_EVENT",
      evidenceVersion: "0.1.0-draft.1",
      issuer: {
        identityRef: "did:example:identity-authority",
        verificationMethod: "did:example:identity-authority#key-1",
        proofRef: `urn:test:proof:binding-status:${sequence}`,
        authorityEvidenceRefs: [],
      },
      effectiveOrder: {
        basis: "AUTHORITATIVE_SEQUENCE",
        sequence: orderSequence,
        evidenceRefs: [],
      },
      body: {
        bindingId,
        eventType,
        sequence,
        ...(previous ? { previousEvent: previous } : {}),
        ...(eventType === "SUPERSEDE"
          ? { successorBindingId: "urn:test:binding:2" }
          : {}),
        effect: "PROSPECTIVE",
        reasonCode: `TEST_${eventType}`,
        supportingEvidenceRefs: [],
      },
    };
  }

  async function registrantIdentityReasons(
    evidenceObjects: DDTHistoricalIdentityAuthorityEvidence[],
    relevantSequence: number,
    trustConfiguration?: DDTHistoricalIdentityAuthorityTrustConfiguration
  ): Promise<string[]> {
    const { record, refs } = await makeRecord(evidenceObjects);

    const relevantMoment: DDTHistoricalIdentityAuthorityRelevantMoment = {
      momentType: "SOURCE_SIGNING_TIME",
      orderBasis: "AUTHORITATIVE_SEQUENCE",
      sequence: relevantSequence,
      evidenceRefs: [],
    };

    const result = await evaluateHistoricalIdentityAuthority(
      record,
      signingContext,
      refs,
      relevantMoment,
      trustConfiguration
    );

    const identity = result.ruleResults.find(
      (item) =>
        item.resultId === "identity-authority.registrant-identity"
    );

    if (!identity) {
      throw new Error("REGISTRANT_IDENTITY result missing");
    }

    return identity.reasonCodes;
  }

  async function registrantIdentityResult(
    evidenceObjects: DDTHistoricalIdentityAuthorityEvidence[],
    relevantSequence: number,
    trustConfiguration?: DDTHistoricalIdentityAuthorityTrustConfiguration
  ) {
    const { record, refs } = await makeRecord(evidenceObjects);

    const relevantMoment: DDTHistoricalIdentityAuthorityRelevantMoment = {
      momentType: "SOURCE_SIGNING_TIME",
      orderBasis: "AUTHORITATIVE_SEQUENCE",
      sequence: relevantSequence,
      evidenceRefs: [],
    };

    const result = await evaluateHistoricalIdentityAuthority(
      record,
      signingContext,
      refs,
      relevantMoment,
      trustConfiguration
    );

    const identity = result.ruleResults.find(
      (item) =>
        item.resultId === "identity-authority.registrant-identity"
    );

    if (!identity) {
      throw new Error("REGISTRANT_IDENTITY result missing");
    }

    return {
      status: identity.status,
      reasonCodes: identity.reasonCodes,
    };
  }

  // 8. Exact ACTIVE binding resolves structurally but must not
  // become VERIFIED without issuer/assurance trust resolution.
  {
    const descriptor = makeDescriptorEvidence();
    const binding = makeIdentityBindingEvidence();
    const activate = makeIdentityBindingStatusEvidence(
      "urn:test:binding-status:0",
      "urn:test:binding:1",
      "ACTIVATE",
      0,
      10
    );

    const trustConfiguration: DDTHistoricalIdentityAuthorityTrustConfiguration = {
      configurationId: "urn:test:identity-trust-config",
      configurationVersion: "0.1.0-draft.1",
      authoritativeSequenceSources: [
        {
          sourceId: "urn:test:identity-status-authority",
          evidenceTypes: ["IDENTITY_BINDING_STATUS_EVENT"],
          issuerIdentityRef: "did:example:identity-authority",
          issuerVerificationMethod:
            "did:example:identity-authority#key-1",
          sequenceScope: "IDENTITY_BINDING",
        },
      ],
    };

    const reasons = await registrantIdentityReasons(
      [descriptor, binding, activate],
      10,
      trustConfiguration
    );

    expectIncludes(
      "ACTIVE identity binding remains trust unresolved",
      reasons,
      "TRUST_CONFIGURATION_UNAVAILABLE"
    );

    expectNotIncludes(
      "ACTIVE identity binding is structurally valid",
      reasons,
      "IDENTITY_BINDING_INVALID"
    );
  }

  // 9. Revoked binding at the relevant moment must be invalid.
  {
    const descriptor = makeDescriptorEvidence();
    const binding = makeIdentityBindingEvidence();

    const activate = makeIdentityBindingStatusEvidence(
      "urn:test:binding-revoked:0",
      "urn:test:binding:1",
      "ACTIVATE",
      0,
      10
    );

    const revoke = makeIdentityBindingStatusEvidence(
      "urn:test:binding-revoked:1",
      "urn:test:binding:1",
      "REVOKE",
      1,
      20,
      link(activate)
    );

    const reasons = await registrantIdentityReasons(
      [descriptor, binding, activate, revoke],
      20
    );

    expectIncludes(
      "revoked identity binding",
      reasons,
      "IDENTITY_BINDING_INVALID"
    );

    const result = await registrantIdentityResult(
      [descriptor, binding, activate, revoke],
      20
    );

    if (result.status !== "FAIL") {
      throw new Error(
        `revoked identity status: expected FAIL, got ${result.status}`
      );
    }

    console.log("PASS: revoked identity maps to FAIL");
  }

  // 10. Expired binding at the relevant moment must be invalid.
  {
    const descriptor = makeDescriptorEvidence();
    const binding = makeIdentityBindingEvidence();

    const activate = makeIdentityBindingStatusEvidence(
      "urn:test:binding-expired:0",
      "urn:test:binding:1",
      "ACTIVATE",
      0,
      10
    );

    const expire = makeIdentityBindingStatusEvidence(
      "urn:test:binding-expired:1",
      "urn:test:binding:1",
      "EXPIRE",
      1,
      20,
      link(activate)
    );

    const reasons = await registrantIdentityReasons(
      [descriptor, binding, activate, expire],
      20
    );

    expectIncludes(
      "expired identity binding",
      reasons,
      "IDENTITY_BINDING_INVALID"
    );

    const result = await registrantIdentityResult(
      [descriptor, binding, activate, expire],
      20
    );

    if (result.status !== "FAIL") {
      throw new Error(
        `expired identity status: expected FAIL, got ${result.status}`
      );
    }

    console.log("PASS: expired identity maps to FAIL");
  }

  // 11. Superseded binding at the relevant moment must be invalid;
  // successor does not inherit verification automatically.
  {
    const descriptor = makeDescriptorEvidence();
    const binding = makeIdentityBindingEvidence();

    const activate = makeIdentityBindingStatusEvidence(
      "urn:test:binding-superseded:0",
      "urn:test:binding:1",
      "ACTIVATE",
      0,
      10
    );

    const supersede = makeIdentityBindingStatusEvidence(
      "urn:test:binding-superseded:1",
      "urn:test:binding:1",
      "SUPERSEDE",
      1,
      20,
      link(activate)
    );

    const reasons = await registrantIdentityReasons(
      [descriptor, binding, activate, supersede],
      20
    );

    expectIncludes(
      "superseded identity binding",
      reasons,
      "IDENTITY_BINDING_INVALID"
    );

    const result = await registrantIdentityResult(
      [descriptor, binding, activate, supersede],
      20
    );

    if (result.status !== "FAIL") {
      throw new Error(
        `superseded identity status: expected FAIL, got ${result.status}`
      );
    }

    console.log("PASS: superseded identity maps to FAIL");
  }

  // 12. A binding to another identity must not verify the registrant.
  {
    const descriptor = makeDescriptorEvidence();
    const binding = makeIdentityBindingEvidence(
      "urn:test:binding:wrong-identity",
      "did:example:someone-else"
    );

    const activate = makeIdentityBindingStatusEvidence(
      "urn:test:binding-wrong:0",
      "urn:test:binding:wrong-identity",
      "ACTIVATE",
      0,
      10
    );

    const reasons = await registrantIdentityReasons(
      [descriptor, binding, activate],
      10
    );

    expectIncludes(
      "identity self-assertion cannot substitute exact binding",
      reasons,
      "IDENTITY_BINDING_UNAVAILABLE"
    );
  }

  console.log("PASS: historical IA identity-binding regression suite");

  function makeAuthorityGrantEvidence(
    evidenceId: string,
    grantId: string,
    grantorIdentityRef: string,
    granteeIdentityRef: string,
    role: string,
    parentGrantRefs: string[] = [],
    delegation = {
      permitted: true,
      remainingDepth: 3,
      scopeAmplificationForbidden: true as const,
    },
    actions: string[] = ["DDT_REGISTER"],
    recordTypes: string[] = ["TEST_RECORD"],
    subjectNamespaces: string[] = ["urn:test"]
  ): DDTHistoricalIdentityAuthorityEvidence {
    return {
      evidenceId,
      evidenceType: "AUTHORITY_GRANT",
      evidenceVersion: "0.1.0-draft.1",
      issuer: {
        identityRef: grantorIdentityRef,
        verificationMethod: `${grantorIdentityRef}#key-1`,
        proofRef: `urn:test:proof:${grantId}`,
        authorityEvidenceRefs: parentGrantRefs,
      },
      effectiveOrder: {
        basis: "AUTHORITATIVE_SEQUENCE",
        sequence: 1,
        evidenceRefs: [],
      },
      body: {
        grantId,
        grantorIdentityRef,
        granteeIdentityRef,
        role,
        scope: {
          proofPurposes: ["DDT_REGISTRATION"],
          actions,
          recordTypes,
          subjectNamespaces,
          organizationScopes: ["urn:test:organization"],
          domainScopes: ["urn:test:domain"],
          constraints: {},
        },
        delegation,
        parentGrantRefs,
        supportingEvidenceRefs: [],
      },
    };
  }

  function makeAuthorityStatusEvidence(
    evidenceId: string,
    grantId: string,
    eventType:
      | "ACTIVATE"
      | "SUSPEND"
      | "RESUME"
      | "REVOKE"
      | "TERMINATE"
      | "SUPERSEDE",
    sequence: number,
    orderSequence: number,
    previous?: {
      evidenceId: string;
      digest: {
        algorithm: string;
        value: string;
      };
    },
    authorityEvidenceRefs: string[] = []
  ): DDTHistoricalIdentityAuthorityEvidence {
    return {
      evidenceId,
      evidenceType: "AUTHORITY_STATUS_EVENT",
      evidenceVersion: "0.1.0-draft.1",
      issuer: {
        identityRef: "did:example:authority-status",
        verificationMethod: "did:example:authority-status#key-1",
        proofRef: `urn:test:proof:authority-status:${grantId}:${sequence}`,
        authorityEvidenceRefs,
      },
      effectiveOrder: {
        basis: "AUTHORITATIVE_SEQUENCE",
        sequence: orderSequence,
        evidenceRefs: [],
      },
      body: {
        grantId,
        eventType,
        sequence,
        ...(previous ? { previousEvent: previous } : {}),
        ...(eventType === "SUPERSEDE"
          ? { successorGrantId: `${grantId}:successor` }
          : {}),
        effect: "PROSPECTIVE",
        reasonCode: `TEST_${eventType}`,
        supportingEvidenceRefs: [],
      },
    };
  }

  function authorityTrust(
    roots: Array<{
      rootId: string;
      identityRef: string;
      acceptedGrantorRoles: string[];
    }>
  ): DDTHistoricalIdentityAuthorityTrustConfiguration {
    return {
      configurationId: "urn:test:authority-trust-config",
      configurationVersion: "0.1.0-draft.1",
      authoritativeSequenceSources: [
        {
          sourceId: "urn:test:authority-status-source",
          evidenceTypes: ["AUTHORITY_STATUS_EVENT"],
          issuerIdentityRef: "did:example:authority-status",
          issuerVerificationMethod:
            "did:example:authority-status#key-1",
          sequenceScope: "AUTHORITY_GRANT",
        },
      ],
      authorityRoots: roots,
      scopeMatchingPolicy: {
        arraySemantics:
          "CHILD_VALUES_MUST_BE_SUBSET_OF_PARENT",
        emptyArrayMeaning: "NO_VALUES_PERMITTED",
        constraintsPolicy: "EXACT_MATCH",
      },
    };
  }

  async function registrantAuthorityReasons(
    evidenceObjects: DDTHistoricalIdentityAuthorityEvidence[],
    relevantSequence: number,
    trustConfiguration?: DDTHistoricalIdentityAuthorityTrustConfiguration
  ): Promise<string[]> {
    const { record, refs } = await makeRecord(evidenceObjects);

    const relevantMoment: DDTHistoricalIdentityAuthorityRelevantMoment = {
      momentType: "SOURCE_SIGNING_TIME",
      orderBasis: "AUTHORITATIVE_SEQUENCE",
      sequence: relevantSequence,
      evidenceRefs: [],
    };

    const result = await evaluateHistoricalIdentityAuthority(
      record,
      signingContext,
      refs,
      relevantMoment,
      trustConfiguration,
      {
        acceptedIdentityAssuranceProfiles: [],
        identityAssurance: {
          identityNamespace: "urn:test",
          acceptedRegistrantIdentityTypes: [],
          requiredBindingScopes: [],
        },
        registrationAuthorityScope: {
          action: "DDT_REGISTER",
          proofPurpose: "DDT_REGISTRATION",
          recordTypes: ["TEST_RECORD"],
          subjectNamespaces: ["urn:test"],
          organizationScopes: ["urn:test:organization"],
          domainScopes: ["urn:test:domain"],
        },
      }
    );

    const authority = result.ruleResults.find(
      (item) =>
        item.resultId === "identity-authority.registrant-authority"
    );

    if (!authority) {
      throw new Error("REGISTRANT_AUTHORITY result missing");
    }

    return authority.reasonCodes;
  }

  async function registrantAuthorityResult(
    evidenceObjects: DDTHistoricalIdentityAuthorityEvidence[],
    relevantSequence: number,
    trustConfiguration?: DDTHistoricalIdentityAuthorityTrustConfiguration
  ) {
    const { record, refs } = await makeRecord(evidenceObjects);

    const relevantMoment: DDTHistoricalIdentityAuthorityRelevantMoment = {
      momentType: "SOURCE_SIGNING_TIME",
      orderBasis: "AUTHORITATIVE_SEQUENCE",
      sequence: relevantSequence,
      evidenceRefs: [],
    };

    const referenceRecorderPolicy = {
      acceptedIdentityAssuranceProfiles: [],
      identityAssurance: {
        identityNamespace: "urn:test",
        acceptedRegistrantIdentityTypes: [],
        requiredBindingScopes: [],
      },
      registrationAuthorityScope: {
        action: "DDT_REGISTER",
        proofPurpose: "DDT_REGISTRATION",
        recordTypes: ["TEST_RECORD"],
        subjectNamespaces: ["urn:test"],
        organizationScopes: ["urn:test:organization"],
        domainScopes: ["urn:test:domain"],
      },
    };

    const result = await evaluateHistoricalIdentityAuthority(
      record,
      signingContext,
      refs,
      relevantMoment,
      trustConfiguration,
      referenceRecorderPolicy
    );

    const authority = result.ruleResults.find(
      (item) =>
        item.resultId === "identity-authority.registrant-authority"
    );

    if (!authority) {
      throw new Error("REGISTRANT_AUTHORITY result missing");
    }

    return {
      status: authority.status,
      reasonCodes: authority.reasonCodes,
    };
  }

  // 12a. Authority rule-status semantics.
  {
    const scopeMismatchGrant = makeAuthorityGrantEvidence(
      "urn:test:authority-grant:status-scope-mismatch",
      "urn:test:grant:status-scope-mismatch",
      "did:example:root-authority",
      signingContext.registrant.identityRef,
      "DDT_REGISTRAR",
      [],
      {
        permitted: true,
        remainingDepth: 3,
        scopeAmplificationForbidden: true,
      },
      ["DDT_REGISTER"],
      ["OTHER_RECORD"],
      ["urn:test"]
    );

    const scopeMismatchStatusIssuerGrant = makeAuthorityGrantEvidence(
      "urn:test:authority-grant:status-issuer-scope-mismatch",
      "urn:test:grant:status-issuer-scope-mismatch",
      "did:example:root-authority",
      "did:example:authority-status",
      "DDT_REGISTRAR"
    );

    const scopeMismatchActivate = makeAuthorityStatusEvidence(
      "urn:test:authority-status:status-scope-mismatch:0",
      "urn:test:grant:status-scope-mismatch",
      "ACTIVATE",
      0,
      10,
      undefined,
      ["urn:test:authority-grant:status-issuer-scope-mismatch"]
    );

    const scopeMismatch = await registrantAuthorityResult(
      [
        scopeMismatchGrant,
        scopeMismatchStatusIssuerGrant,
        scopeMismatchActivate,
      ],
      10,
      authorityTrust([
        {
          rootId: "urn:test:root:status-scope",
          identityRef: "did:example:root-authority",
          acceptedGrantorRoles: ["DDT_REGISTRAR"],
        },
      ])
    );

    if (scopeMismatch.status !== "FAIL") {
      throw new Error(
        `authority scope mismatch status: expected FAIL, got ${scopeMismatch.status}`
      );
    }

    expectIncludes(
      "authority scope mismatch status reason",
      scopeMismatch.reasonCodes,
      "AUTHORITY_SCOPE_MISMATCH"
    );

    console.log("PASS: authority scope mismatch maps to FAIL");
  }

  {
    const revokedGrant = makeAuthorityGrantEvidence(
      "urn:test:authority-grant:status-revoked",
      "urn:test:grant:status-revoked",
      "did:example:root-authority",
      signingContext.registrant.identityRef,
      "DDT_REGISTRAR"
    );

    const activate = makeAuthorityStatusEvidence(
      "urn:test:authority-status:status-revoked:0",
      "urn:test:grant:status-revoked",
      "ACTIVATE",
      0,
      10
    );

    const revoke = makeAuthorityStatusEvidence(
      "urn:test:authority-status:status-revoked:1",
      "urn:test:grant:status-revoked",
      "REVOKE",
      1,
      20,
      {
        evidenceId: activate.evidenceId,
        digest: sha256(encodeEvidence(activate)),
      }
    );

    const revoked = await registrantAuthorityResult(
      [revokedGrant, activate, revoke],
      20,
      authorityTrust([
        {
          rootId: "urn:test:root:status-revoked",
          identityRef: "did:example:root-authority",
          acceptedGrantorRoles: ["DDT_REGISTRAR"],
        },
      ])
    );

    if (revoked.status !== "FAIL") {
      throw new Error(
        `revoked authority status: expected FAIL, got ${revoked.status}`
      );
    }

    expectIncludes(
      "revoked authority status reason",
      revoked.reasonCodes,
      "AUTHORITY_GRANT_INVALID"
    );

    console.log("PASS: revoked authority maps to FAIL");
  }

  {
    const incompleteGrant = makeAuthorityGrantEvidence(
      "urn:test:authority-grant:status-incomplete",
      "urn:test:grant:status-incomplete",
      "did:example:missing-parent-authority",
      signingContext.registrant.identityRef,
      "DDT_REGISTRAR",
      ["urn:test:authority-grant:missing-parent"]
    );

    const incomplete = await registrantAuthorityResult(
      [incompleteGrant],
      10,
      authorityTrust([])
    );

    if (incomplete.status !== "INDETERMINATE") {
      throw new Error(
        `incomplete authority status: expected INDETERMINATE, got ${incomplete.status}`
      );
    }

    expectIncludes(
      "incomplete authority status reason",
      incomplete.reasonCodes,
      "AUTHORITY_GRANT_CHAIN_INCOMPLETE"
    );

    console.log("PASS: incomplete authority remains INDETERMINATE");
  }

  // 13. Valid root authority grant resolves structurally.
  {
    const grant = makeAuthorityGrantEvidence(
      "urn:test:authority-grant:root",
      "urn:test:grant:root",
      "did:example:root-authority",
      signingContext.registrant.identityRef,
      "DDT_REGISTRAR"
    );

    const statusIssuerGrant = makeAuthorityGrantEvidence(
      "urn:test:authority-grant:status-issuer-root",
      "urn:test:grant:status-issuer-root",
      "did:example:root-authority",
      "did:example:authority-status",
      "DDT_REGISTRAR"
    );

    const statusIssuerActivate = makeAuthorityStatusEvidence(
      "urn:test:authority-status:status-issuer-root:0",
      "urn:test:grant:status-issuer-root",
      "ACTIVATE",
      0,
      9,
      undefined,
      ["urn:test:authority-grant:status-issuer-root"]
    );

    const activate = makeAuthorityStatusEvidence(
      "urn:test:authority-status:root:0",
      "urn:test:grant:root",
      "ACTIVATE",
      0,
      10,
      undefined,
      ["urn:test:authority-grant:status-issuer-root"]
    );

    const reasons = await registrantAuthorityReasons(
      [grant, statusIssuerGrant, statusIssuerActivate, activate],
      10,
      authorityTrust([
        {
          rootId: "urn:test:root:1",
          identityRef: "did:example:root-authority",
          acceptedGrantorRoles: ["DDT_REGISTRAR"],
        },
      ])
    );

    expectIncludes(
      "valid root authority remains issuer-trust unresolved",
      reasons,
      "TRUST_CONFIGURATION_UNAVAILABLE"
    );

    expectNotIncludes(
      "valid root authority structural path",
      reasons,
      "AUTHORITY_GRANT_CHAIN_INCOMPLETE"
    );
  }

  // 13b. Concrete registration record type must be covered by the leaf grant.
  {
    const grant = makeAuthorityGrantEvidence(
      "urn:test:authority-grant:registration-scope-mismatch",
      "urn:test:grant:registration-scope-mismatch",
      "did:example:root-authority",
      signingContext.registrant.identityRef,
      "DDT_REGISTRAR",
      [],
      {
        permitted: true,
        remainingDepth: 3,
        scopeAmplificationForbidden: true,
      },
      ["DDT_REGISTER"],
      ["OTHER_RECORD"],
      ["urn:test"]
    );

    const activate = makeAuthorityStatusEvidence(
      "urn:test:authority-status:registration-scope-mismatch:0",
      "urn:test:grant:registration-scope-mismatch",
      "ACTIVATE",
      0,
      10
    );

    const reasons = await registrantAuthorityReasons(
      [grant, activate],
      10,
      authorityTrust([
        {
          rootId: "urn:test:root:1",
          identityRef: "did:example:root-authority",
          acceptedGrantorRoles: ["DDT_REGISTRAR"],
        },
      ])
    );

    expectIncludes(
      "concrete registration scope mismatch",
      reasons,
      "AUTHORITY_SCOPE_MISMATCH"
    );
  }

  // 14. Valid multi-hop delegation resolves structurally.
  {
    const parent = makeAuthorityGrantEvidence(
      "urn:test:authority-grant:parent",
      "urn:test:grant:parent",
      "did:example:root-authority",
      "did:example:delegate",
      "DDT_REGISTRAR",
      [],
      {
        permitted: true,
        remainingDepth: 3,
        scopeAmplificationForbidden: true,
      }
    );

    const child = makeAuthorityGrantEvidence(
      "urn:test:authority-grant:child",
      "urn:test:grant:child",
      "did:example:delegate",
      signingContext.registrant.identityRef,
      "DDT_REGISTRAR",
      ["urn:test:authority-grant:parent"],
      {
        permitted: true,
        remainingDepth: 2,
        scopeAmplificationForbidden: true,
      }
    );

    const statusIssuerGrant = makeAuthorityGrantEvidence(
      "urn:test:authority-grant:status-issuer-multihop",
      "urn:test:grant:status-issuer-multihop",
      "did:example:root-authority",
      "did:example:authority-status",
      "DDT_REGISTRAR"
    );

    const parentActive = makeAuthorityStatusEvidence(
      "urn:test:authority-status:parent:0",
      "urn:test:grant:parent",
      "ACTIVATE",
      0,
      10,
      undefined,
      ["urn:test:authority-grant:status-issuer-multihop"]
    );

    const childActive = makeAuthorityStatusEvidence(
      "urn:test:authority-status:child:0",
      "urn:test:grant:child",
      "ACTIVATE",
      0,
      10,
      undefined,
      ["urn:test:authority-grant:status-issuer-multihop"]
    );

    const reasons = await registrantAuthorityReasons(
      [
        parent,
        child,
        statusIssuerGrant,
        parentActive,
        childActive,
      ],
      10,
      authorityTrust([
        {
          rootId: "urn:test:root:1",
          identityRef: "did:example:root-authority",
          acceptedGrantorRoles: ["DDT_REGISTRAR"],
        },
      ])
    );

    expectNotIncludes(
      "valid multi-hop delegation",
      reasons,
      "AUTHORITY_GRANT_CHAIN_INCOMPLETE"
    );

    expectNotIncludes(
      "valid multi-hop scope",
      reasons,
      "AUTHORITY_SCOPE_MISMATCH"
    );
  }

  // 15. Missing parent grant leaves the chain incomplete.
  {
    const child = makeAuthorityGrantEvidence(
      "urn:test:authority-grant:missing-parent-child",
      "urn:test:grant:missing-parent-child",
      "did:example:delegate",
      signingContext.registrant.identityRef,
      "DDT_REGISTRAR",
      ["urn:test:authority-grant:missing"]
    );

    const active = makeAuthorityStatusEvidence(
      "urn:test:authority-status:missing-parent:0",
      "urn:test:grant:missing-parent-child",
      "ACTIVATE",
      0,
      10
    );

    const reasons = await registrantAuthorityReasons(
      [child, active],
      10,
      authorityTrust([
        {
          rootId: "urn:test:root:1",
          identityRef: "did:example:root-authority",
          acceptedGrantorRoles: ["DDT_REGISTRAR"],
        },
      ])
    );

    expectIncludes(
      "incomplete delegation chain",
      reasons,
      "AUTHORITY_GRANT_CHAIN_INCOMPLETE"
    );
  }

  // 16. Parent that forbids delegation cannot authorize child.
  {
    const parent = makeAuthorityGrantEvidence(
      "urn:test:authority-grant:no-delegation-parent",
      "urn:test:grant:no-delegation-parent",
      "did:example:root-authority",
      "did:example:delegate",
      "DDT_REGISTRAR",
      [],
      {
        permitted: false,
        remainingDepth: 0,
        scopeAmplificationForbidden: true,
      }
    );

    const child = makeAuthorityGrantEvidence(
      "urn:test:authority-grant:no-delegation-child",
      "urn:test:grant:no-delegation-child",
      "did:example:delegate",
      signingContext.registrant.identityRef,
      "DDT_REGISTRAR",
      ["urn:test:authority-grant:no-delegation-parent"],
      {
        permitted: false,
        remainingDepth: 0,
        scopeAmplificationForbidden: true,
      }
    );

    const childActive = makeAuthorityStatusEvidence(
      "urn:test:authority-status:no-delegation:0",
      "urn:test:grant:no-delegation-child",
      "ACTIVATE",
      0,
      10
    );

    const reasons = await registrantAuthorityReasons(
      [parent, child, childActive],
      10,
      authorityTrust([
        {
          rootId: "urn:test:root:1",
          identityRef: "did:example:root-authority",
          acceptedGrantorRoles: ["DDT_REGISTRAR"],
        },
      ])
    );

    expectIncludes(
      "prohibited delegation",
      reasons,
      "AUTHORITY_GRANT_INVALID"
    );
  }

  // 17. Child scope may not exceed parent scope.
  {
    const parent = makeAuthorityGrantEvidence(
      "urn:test:authority-grant:scope-parent",
      "urn:test:grant:scope-parent",
      "did:example:root-authority",
      "did:example:delegate",
      "DDT_REGISTRAR",
      [],
      {
        permitted: true,
        remainingDepth: 3,
        scopeAmplificationForbidden: true,
      },
      ["DDT_REGISTER"]
    );

    const child = makeAuthorityGrantEvidence(
      "urn:test:authority-grant:scope-child",
      "urn:test:grant:scope-child",
      "did:example:delegate",
      signingContext.registrant.identityRef,
      "DDT_REGISTRAR",
      ["urn:test:authority-grant:scope-parent"],
      {
        permitted: true,
        remainingDepth: 2,
        scopeAmplificationForbidden: true,
      },
      ["DDT_REGISTER", "DDT_DELETE"]
    );

    const parentActive = makeAuthorityStatusEvidence(
      "urn:test:authority-status:scope-parent:0",
      "urn:test:grant:scope-parent",
      "ACTIVATE",
      0,
      10
    );

    const childActive = makeAuthorityStatusEvidence(
      "urn:test:authority-status:scope-child:0",
      "urn:test:grant:scope-child",
      "ACTIVATE",
      0,
      10
    );

    const reasons = await registrantAuthorityReasons(
      [parent, child, parentActive, childActive],
      10,
      authorityTrust([
        {
          rootId: "urn:test:root:1",
          identityRef: "did:example:root-authority",
          acceptedGrantorRoles: ["DDT_REGISTRAR"],
        },
      ])
    );

    expectIncludes(
      "child scope amplification",
      reasons,
      "AUTHORITY_SCOPE_MISMATCH"
    );
  }

  // 18. Revocation after the evaluated action does not invalidate
  // the earlier active authority; at/after revocation it is invalid.
  {
    const grant = makeAuthorityGrantEvidence(
      "urn:test:authority-grant:revocation",
      "urn:test:grant:revocation",
      "did:example:root-authority",
      signingContext.registrant.identityRef,
      "DDT_REGISTRAR"
    );

    const activate = makeAuthorityStatusEvidence(
      "urn:test:authority-status:revocation:0",
      "urn:test:grant:revocation",
      "ACTIVATE",
      0,
      10
    );

    const revoke = makeAuthorityStatusEvidence(
      "urn:test:authority-status:revocation:1",
      "urn:test:grant:revocation",
      "REVOKE",
      1,
      20,
      link(activate)
    );

    const trust = authorityTrust([
      {
        rootId: "urn:test:root:1",
        identityRef: "did:example:root-authority",
        acceptedGrantorRoles: ["DDT_REGISTRAR"],
      },
    ]);

    const before = await registrantAuthorityReasons(
      [grant, activate, revoke],
      10,
      trust
    );

    expectNotIncludes(
      "later authority revocation does not invalidate earlier use",
      before,
      "AUTHORITY_GRANT_INVALID"
    );

    const after = await registrantAuthorityReasons(
      [grant, activate, revoke],
      20,
      trust
    );

    expectIncludes(
      "authority revoked at evaluated action",
      after,
      "AUTHORITY_GRANT_INVALID"
    );
  }

  console.log("PASS: historical IA authority regression suite");



}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
