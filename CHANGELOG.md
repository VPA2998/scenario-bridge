# Changelog

All notable changes to this project are documented here.

## [0.1.0] — 2026-08-20

Initial release.

### Added
- Local `.xosc` (OpenSCENARIO) parsing: file header, parameters (with arithmetic
  expression resolution), road network references, entities (vehicles,
  pedestrians, misc objects), init state, and storyboard events.
- Optional `.xodr` (OpenDRIVE) loading — resolves entity positions and heading
  onto real road/lane geometry (line, arc, and numerically-integrated spiral
  segments; poly3/paramPoly3 fall back to a straight-line approximation).
- OSI-style ground truth frame generation at a configurable duration/sampling
  rate, with a live frame-count estimate.
- Animated top-down playback (play/pause, scrub, speed control) — schematic
  straight-road view when no `.xodr` is loaded, real curved-road rendering
  when one is.
- "OSC → OSI mapping" tab: a general concept glossary, GroundTruth top-level
  field reference, `moving_object` field reference, and type/classification
  enum reference.
- "Source → OSI table" tab: a file-specific audit trail listing exactly what
  was extracted from the currently loaded `.xosc`/`.xodr` and which OSI field
  each value fills — rebuilt every time a file is (re)loaded.
- "Convert to real OSI" — reshapes the generated JSON into the actual
  `osi3.GroundTruth` message structure (real field names, real
  `MovingObject.Type` / `VehicleClassification.Type` enum values,
  `Identifier`/`Timestamp` wrapper messages, 64-bit fields as strings, per
  protobuf's standard JSON mapping), opened in a new window with its own
  preview and download button.
- Copy/download for both the tool's readable JSON and the real-OSI JSON.
- Playwright smoke test suite covering parsing, road-geometry resolution,
  frame generation, playback animation, the Sources tab, and the real-OSI
  converter.

### Fixed
- Storyboard events with no explicit `<Actors><EntityRef>` (a common
  real-world pattern for `selectTriggeringEntities="true"`) used to match no
  entity at all, silently freezing playback for that event. They now apply to
  every entity.
- `laneId="0"` was coerced to `-1` by a JavaScript falsy-zero bug
  (`Number(laneId) || -1`).
- `AbsoluteTargetLane` and `RelativeTargetSpeed` were previously ignored
  (only `RelativeTargetLane`/`AbsoluteTargetSpeed` were read).
- Frame-generation loop used repeated floating-point addition for the time
  step, which could drift over long/high-rate runs; now index-based.
