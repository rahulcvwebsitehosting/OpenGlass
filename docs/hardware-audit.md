# OpenGlass hardware and software compatibility audit

Review date: 22 October 2026. Scope: the firmware, browser app, API handlers, configuration, tests and the earlier local CAD notes. This is an engineering review of a prototype, not qualification of a manufactured unit.

## Decision

The **complete Seeed Studio XIAO ESP32-S3 Sense kit (113991115)** is the appropriate controller/camera assembly for the implemented product. The electrical pin map and BLE protocol match the browser implementation. One controller is sufficient. A battery is optional for the first USB-powered test.

The former four-line hardware list was insufficient for an assembled wearable. It did not specify the antenna, cooling, pack protection/current ratings, switch, battery-pad connection, physical fit or companion/browser/API prerequisites. It also advertised a battery service absent from the firmware.

The corrected [README buy list](../README.md#hardware-to-buy) separates a working USB prototype from wearable additions and avoids buying modules the code does not use. **No exact battery SKU or final enclosure fit is approved**: that requires the selected pack's datasheet and measurements of the delivered parts. A capacity or pouch-size label alone is inadequate.

## Implemented product boundary

| Product behaviour | Actual implementation / consequence |
| --- | --- |
| Capture the scene | Firmware captures 640 × 480 JPEGs; BLE sends one image at a time. |
| Describe a scene | Browser assembles/rotates the JPEG; server forwards it to a configured vision model. Internet and a working model account are required. |
| Ask a question | Typed input; answers use up to 24 recent successful scene descriptions, bounded to 48,000 characters. This is not a complete recording of the day. |
| Keep history | Optional Supabase integration; separate schema/storage/access configuration is required. The current gallery displays up to 100 recent records, not a full-text search engine. |
| Microphone | Onboard PDM and optional BLE audio characteristics exist. Browser does not subscribe to audio; voice questions and speech output are not implemented. |
| Battery | Board provides USB charging for a compatible 1S lithium pack. No voltage sense wire, fuel-gauge driver, battery percentage, low-battery UI or battery BLE service is implemented. |
| Offline operation | Camera-to-browser BLE does not require internet; the implemented AI descriptions/answers do. |
| Native phone app | Expo scaffolding exists, but capture uses Web Bluetooth and DOM image processing. Native Android/iOS commands do not make this path work. |
| Display / speaker / navigation sensors | No display, amplifier, speaker, GPS or IMU code or wiring. |

## Code-to-hardware mapping

| Resource | Verified mapping | Files / implication |
| --- | --- | --- |
| MCU/memory | ESP32-S3, 8 MB flash, 8 MB OPI PSRAM | `firmware.ino` checks PSRAM before camera initialization; wrong PSRAM settings stop capture. Do not substitute a board solely because it says ESP32. |
| Camera clock/control | XCLK 10, SCCB SDA 40 / SCL 39 | Matches Seeed's Sense expansion board, `camera_pins.h`. No hand wiring is needed. |
| Camera data | D0–D7: 15, 17, 18, 16, 14, 12, 11, 48 | Matches Seeed's DVP Y2–Y9 wiring. |
| Camera sync | VSYNC 38, HREF 47, PCLK 13; PWDN/reset not separate GPIOs | Matches the manufacturer map; loose generic cameras can have different pinouts or supply requirements. |
| Microphone | PDM clock 42 / data 41 | Legacy core `I2S.setAllPins(-1, 42, 41, -1, -1)`; failure disables optional audio, leaving camera operation available. |
| BLE service | `19b10000-e8f2-537e-4f6c-d104768a1214` | Firmware and `photoProtocol.ts` agree. Browser selects advertised name `OpenGlass`. |
| Photo data/control | UUID suffixes `0005` / `0006` in the same UUID family | `photoStream.ts` subscribes, then writes interval byte 5; cleanup writes 0. |
| JPEG packet format | Little-endian 16-bit sequence, starting at zero; `0xffff` end marker | `PhotoAssembler` rejects invalid ordering, malformed/truncated JPEGs and buffers above 2 MiB. |
| ATT payload | Two sequence bytes + at most `min(200, MTU-5)` photo bytes | Fits MTU 23 (18 photo bytes) and MTU 247 (200 photo bytes). MTU negotiation depends on the host; BLE version alone does not establish throughput. |
| Supply | USB-C 5 V or compatible 1S pack through dedicated battery pads | Supply is handled by board hardware. No boost module is required. Never connect a 1S cell to the 3V3 pin. |
| microSD | Not initialized | No card purchase required; adding a card does not provide offline capture with this code. |

## Camera revisions and firmware changes

Seeed's current wiki explicitly describes the OV2640 → OV3660 → OV5640 transition; sellers can carry different batches. Verify the actual supplied sensor and daughterboard rather than a generic catalogue photo.

The pinned Arduino core's ESP32-S3 OPI configuration enables `CONFIG_OV2640_SUPPORT`, `CONFIG_OV3660_SUPPORT` and `CONFIG_OV5640_SUPPORT`. Driver support alone does not initialize an autofocus lens.

The updated firmware:

- Loads the OV5640 autofocus firmware using Eric Nam's library 0.1.1, only after detecting that PID. Initialization failure prevents advertising a nonfunctional camera.
- Allocates camera buffers at SXGA in PSRAM for AF evaluation, then sets transmitted capture size to VGA JPEG. Waits up to eight seconds for initial focus and logs a warning if it does not settle.
- Applies Seeed's OV5640 DVP output-drive adjustment. This is not a substitute for cooling or a thermal test.
- Applies the OV3660 orientation/brightness/saturation defaults used in manufacturer examples. Fixed-focus modules skip AF.
- Logs sensor PID, PSRAM size and readiness for commissioning.
- Keeps framebuffer ownership in the main loop and uses atomic connection/reset/control state across BLE callbacks.
- Retains MTU-aware chunking and only reads microphone data when an audio client subscribes.

The browser assumes a **270-degree rotation** in `DeviceView.tsx`. Fit the camera so the preview is upright; otherwise adjust that rotation and rebuild. OV3660's sensor flip and the mount rotation solve different orientation issues. Verify left/right with readable text.

A real lens must be tested at the intended working distances in representative lighting, including after moving from near to far. JPEG validity and a successful AF command do not establish sharpness. No delivered camera has been tested in this review.

## Power, battery and fit

### Electrical selection

Use one **protected 1S rechargeable lithium-ion/polymer pack**, 3.7 V nominal / 4.2 V charged. For the initial procurement specification choose 500–1000 mAh with a documented continuous discharge capability of at least 1 A and an allowed charge current of at least 150 mA. These are conservative engineering selection margins, not measured device currents.

At 500 mAh, 1 A requires a 2C continuous-rated pack; at 1000 mAh it requires 1C. Obtain both the cell and protection-circuit current limits from the supplier. A protection trip threshold is not a permissible continuous discharge rating. An ordinary 500 mAh 1C pack does not satisfy this procurement specification. The historically suggested 250 mAh pack is not automatically qualified merely by matching the nominal voltage.

Seeed publishes several workload/revision-dependent current figures, including image-capture peaks; OV5640 current entries are not all populated. Its older wiki charging table is also inconsistent between variants, while the linked v1.3 Sense schematic specifies approximately 110 mA charging. Confirm the delivered revision; do not claim one exact charging current or guaranteed runtime for every Sense kit.

A reliable USB-powered prototype is the first acceptance gate. After selecting a pack, measure capture/idle peaks, voltage sag and average battery current using this firmware. Runtime is approximately usable capacity divided by measured average current; enclosure heat, regulation, battery ageing and protection cut-off reduce usable capacity. No runtime measurement is available.

### Battery connection

Have the protected pack supplied with insulated leads. Use a mating connector pigtail so the pack can be removed without soldering to the cell. Solder to the board's designated **BAT positive and battery negative pads** according to the exact board revision/silkscreen. Check polarity with a multimeter before connecting. Do not infer it from JST connector shape, a generic diagram or wire colour.

Install the rated switch in the positive battery lead. With that switch open, the battery is disconnected from both load and onboard charging; close it to charge through the board's USB-C port. USB still powers the board with the battery switch open. The software stop command only stops taking photos; it does not power down the processor/camera.

The onboard charger eliminates the need for a second charger module, but it is not a reason to use an unprotected cell. Do not connect two chargers to the cell or use a 5 V boost converter on the battery pads. Charge the prototype off the user's head on a suitable surface and within the pack's specified temperature limits.

### Enclosure and cooling

The earlier local `cad-output/Drawing-notes.md` explicitly labels the CAD as a fit-review design. Its electronics reference is a May 2023 STEP export. The proposed 6 × 35 × 15 mm cell-body envelope is not a battery datasheet and is too narrow for many readily available packs. The proposed 32 × 23.8 × 28 mm camera enclosure also needs comparison with the actual camera, heat sink and antenna route.

The current repository does not contain a qualified printable enclosure. A generic 3D model or old camera mount must be refitted before ordering a final print. Do not choose screw lengths from the proposed M2 clearance holes alone: engagement, wall thickness and pouch clearance depend on the final assembly.

Retain the manufacturer heat sink with its appropriate thermal attachment, keep it electrically clear of pads, leave airflow and space around the antenna, and isolate the battery from the hot board. Surface temperature on the skin-facing enclosure must be measured under the actual duty cycle. A board's operating temperature range and vendor webcam heat-sink measurements do not establish comfort or safety for continuous skin contact.

## Companion and service prerequisites

A computer is required for firmware upload; it does not have to remain connected after moving to battery power. The companion must have working Bluetooth LE and a supported Web Bluetooth browser.

Use Chrome/Edge on supported Windows/macOS for the first bench test. Android Chrome is a possible companion but must be qualified on the actual phone, including permissions, reconnection and screen/page behaviour. Keep the browser page active. Safari on iOS and Firefox do not implement the current path; Linux may need additional setup. HTTPS or a localhost secure context is mandatory. Opening a PC's ordinary HTTP LAN address on a phone does not meet that requirement.

The exported frontend alone is insufficient. `npm run serve` serves `dist` plus the real API handlers on localhost:8787 and loads `.env`. Vercel serves the API handlers separately from the static export. Both vision/chat model credentials, compatible base URLs and active model IDs must be configured server-side. No live provider credentials or live model response were validated in this review; automated API tests use a local mock.

Keep Supabase disabled for first commissioning. For optional history, the code expects:

| Resource | Required fields / operations |
| --- | --- |
| `photos` table | `id` generated on insert, `storage_path`, nullable `caption`, default `captured_at`; insert/select/update |
| `chats` table | `photo_id` foreign key to `photos.id`, `question`, `answer`; insert/select |
| `photos` storage bucket | JPEG upload/removal; gallery currently constructs public object URLs |
| Relationship | `photos` → `chats` must be available for the gallery's nested select |

No database migration or per-user authentication is supplied in this build. Do not enable unrestricted anonymous storage/table policies to make errors disappear. Add authentication, ownership-aware row/storage policies and private image access before storing private images for multiple users. The AI proxy routes also lack authentication and rate limiting. These are software release tasks, not additional hardware purchases.

## Automated verification

Local checks during this audit:

- TypeScript: passed.
- Node tests: **23 passed**, including a real JPEG split into minimum/larger BLE payload sizes, damaged packet handling, agent retry/context bounds, exact-photo caption persistence, mock-provider success/failure and GATT cleanup.
- Browser subscription fix: failed capture-control writes now release an already-started notification stream. A regression test verifies no later photo delivery or duplicate cleanup.
- Web export: checked with `npm run build:web`; see the repository workflow for a reproducible result.
- Firmware: the verification workflow installs Arduino CLI 1.2.2, Espressif core 2.0.17 and AF library 0.1.1, then compiles the exact FQBN in the firmware guide.

The workflow is linked from the repository's Actions tab. A passing firmware job proves compilation and linking against that toolchain; it does not prove the delivered sensor, RF link, power path, charging, lens, enclosure or temperature.

## Physical acceptance tests

Perform these on **one** prototype before buying multiple sets or finalizing the wearable shell:

1. **Inspect the kit:** record board revision, camera PID/model, included antenna/heat sink and the selected pack's complete datasheet/dimensions. Seat the Sense connector and antenna with all power disconnected.
2. **Commission over USB:** flash the pinned build; confirm PSRAM, sensor PID and camera-ready serial messages. Resolve AF initialization errors/timeouts and brownouts before continuing.
3. **Check the actual BLE path:** pair from the intended browser, receive at least 20 complete upright images, verify near/far sharpness and that a scene description appears. Ask a question whose answer is visibly present; confirm both API requests succeed with the real provider.
4. **Exercise lifecycle:** leave the page running at least 30 minutes; switch Live/History tabs, disconnect/re-pair and power-cycle the board. Confirm capture resumes and old subscriptions do not duplicate photos. Log dropped frames, latency and actual negotiated MTU where available.
5. **Qualify battery power:** verify polarity before attaching the protected pack, measure voltage sag/current peaks and repeated capture with USB removed, and confirm reliable switch operation. Characterize the usable discharge range without bypassing the pack's protection.
6. **Check charging separately:** charge through the intended board/USB source with the battery switch closed, measure charge current and pack/board temperature, and compare with the pack's limits. Verify behaviour with USB insertion/removal. Do not claim full-charge detection from an app percentage; none exists.
7. **Fit and thermally test the enclosure:** measure the actual assembly and pack including protection/connector, check clearances/strain relief and antenna placement, and run the final enclosed duty cycle off-head for at least an hour or until temperatures stabilize. Verify skin-side temperature, battery isolation and comfort before wearing.
8. **Measure runtime:** run representative capture and Q&A on the intended phone until the normal usable endpoint; record elapsed time and reconnection/background limitations. Repeat if the camera, pack, mount or firmware changes.

**Unresolved until these tests:** delivered-unit compatibility, useful autofocus performance at VGA after motion, end-to-end latency, BLE reliability, current peaks, usable runtime, charging/termination behaviour, RF attenuation from the mount, mechanical fit and wearable surface temperature.

## Primary references

Checked 22 October 2026:

- [Seeed product / SKU 113991115](https://www.seeedstudio.com/XIAO-ESP32S3-Sense-p-5639.html): exact Sense kit family.
- [Seeed getting started](https://wiki.seeedstudio.com/xiao_esp32s3_getting_started/): variants, sensor transitions, memory, battery pads, included heat sink and linked schematics.
- [Seeed camera guide](https://wiki.seeedstudio.com/xiao_esp32s3_camera_usage/): antenna installation, pin map, PSRAM, AF setup and OV5640 drive adjustment.
- [Espressif Arduino core 2.0.17 ESP32-S3 OPI sdkconfig](https://github.com/espressif/arduino-esp32/blob/2.0.17/tools/sdk/esp32s3/qio_opi/include/sdkconfig.h): enabled camera sensor drivers.
- [Espressif legacy I2S header](https://github.com/espressif/arduino-esp32/blob/2.0.17/libraries/I2S/src/I2S.h): pinned microphone API.
- [OV5640 AF source and API](https://github.com/0015/ESP32-OV5640-AF): dependency used for the AF-capable camera.
- [Chrome Web Bluetooth documentation](https://developer.chrome.com/docs/capabilities/bluetooth): supported platforms, secure contexts, GATT lifecycle and serializing operations.
- [Adafruit 500 mAh battery datasheet](https://cdn-shop.adafruit.com/product-files/1578/Datasheet.pdf): example showing why capacity alone is insufficient (1C = 500 mA maximum continuous discharge). This example does **not** meet the conservative 1 A procurement specification and is not a recommended purchase for it.
