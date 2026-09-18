# Prototype Content Guide

## Mandatory boundary

All content and media in this package are `PROTOTYPE_ONLY`. The package is static-only, uses simulated/mock behavior, contains no credential or sensitive personal data, and has no production authority. Its JSON is not a schema, API, CMS seed, migration input, identity source, curriculum, translation authority, or media approval.

## Fixture rules

- IDs begin `proto-` and are stable only for frontend revision 2.
- Synthetic people use role labels and `.invalid` email addresses. Do not add real names, contact details, demographics, health/religious status, meditation-quality data, or production identifiers.
- The fixture clock is `2026-09-18T12:00:00Z`; dates are synthetic and must not be described as server time.
- EL and EN courses are independent. Do not introduce translation links or shared progress.
- Course/body copy is neutral interface-demonstration or explicitly labeled placeholder copy. Do not invent spiritual teaching, outcomes, health effects, chakras/Kundalini claims, or approved source attribution.
- Quiz items assess neutral interface facts only and use single choice, multiple choice, or True/False.
- State selectors are deterministic and reversible; they demonstrate authored outcomes and never imply authorization, persistence, grading, delivery, or audit integrity.

## Localized copy

Prototype samples include: EL `Î¤Î± Î¼Î±Î¸Î®Î¼Î±Ï„Î¬ Î¼Î¿Ï…`, EN `My Course`; EL `ÎˆÎ½Î±ÏÎ¾Î· Î¼Î±Î¸Î®Î¼Î±Ï„Î¿Ï‚`, EN `Start Course`; EL `ÎˆÎ½Î±ÏÎ¾Î· ÎµÎ½ÏŒÏ„Î·Ï„Î±Ï‚`, EN `Start Lesson`; EL `Î‘Ï€Î±Î¹Ï„Î¿ÏÎ¼ÎµÎ½Î¿`/`Î ÏÎ¿Î±Î¹ÏÎµÏ„Î¹ÎºÏŒ`/`ÎšÎ»ÎµÎ¹Î´Ï‰Î¼Î­Î½Î¿`, EN `Required`/`Optional`/`Locked`. These are sample UI pairs, not authoritative production translations. Use correct document/fragment `lang` and human review before production.

Missing governed material is labeled **Prototype content placeholder â€” approved content required** (or the accepted Greek sample). Tutorial blocks may describe prototype navigation only. The text-meditation placeholder may describe observing the end affordance only; it makes no spiritual, therapeutic, physiological, or instructional claim.

## Media provenance and attribution

Revision 2 accepts no remote images or videos. Only `assets/course-placeholder.svg` and `assets/media-placeholder.svg` may render. They are locally authored neutral fallbacks, not approved brand/course/media assets. No remote file may be fetched into the package.

A future remote image requires source, creator/publisher, rights statement/evidence, checked date, attribution and placement, alt or decorative decision, dimensions/aspect, focal point/crop guidance, local fallback, redistribution status, replacement owner, and notes. A future video additionally requires official provider/source/publisher, use evidence, privacy-enhanced embed guidance or documented absence, direct fallback, caption/transcript status, attribution, privacy note, local fallback, and replacement owner.

Unknown rights, captions, transcript, official status, or content approval means rejection and local fallback. Attribution remains adjacent or in clearly linked credits. Rights approval and course-language/content review are separate gates.

## Replacement procedure

Name a human owner; document source and rights; add accessibility metadata; obtain language/content review where applicable; request `REVISION_REQUIRED -ResponsibleArea CONTENT_MEDIA`; and compile a new frontend revision. Replacement in a static prototype does not approve production use.

## Safety audit

Reject real data, secret values, unofficial portraits, spiritual/anatomical diagrams, generated spiritual artwork, third-party logos, protected branding, medical claims, spiritual scoring, remote trackers, and content represented as approved when it is not. Ordinary screenshots hide prototype controls.
