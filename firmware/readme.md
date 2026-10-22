# XIAO ESP32-S3 Sense firmware

Target: **Seeed Studio XIAO ESP32-S3 Sense, SKU 113991115**, with its Sense camera/microphone daughterboard, antenna, 8 MB flash and 8 MB OPI PSRAM. The bare XIAO ESP32-S3 is missing the camera assembly. See the [buy list](../README.md#hardware-to-buy) and [hardware audit](../docs/hardware-audit.md).

## Toolchain

Use Espressif's **Arduino ESP32 core 2.0.17**. This sketch uses the legacy `I2S.h` API; core 3.x needs a separate I2S migration. Use the BLE and camera libraries bundled with this core. Do not install a competing ArduinoBLE/ESP32 BLE package.

The camera dependency is **OV5640 Auto Focus for ESP32 Camera 0.1.1**, by Eric Nam ([source](https://github.com/0015/ESP32-OV5640-AF)). Install it even when using an older fixed-focus camera, since the sketch includes its header. No Opus libraries are needed for the default build.

From the repository root, with Arduino CLI installed:

```sh
arduino-cli config init
arduino-cli config add board_manager.additional_urls https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
arduino-cli core update-index
arduino-cli core install esp32:esp32@2.0.17
arduino-cli lib install "OV5640 Auto Focus for ESP32 Camera@0.1.1"
arduino-cli compile --warnings all --fqbn esp32:esp32:XIAO_ESP32S3:PSRAM=opi,FlashSize=8M,PartitionScheme=default_8MB,USBMode=hwcdc,CDCOnBoot=cdc firmware
```

If a CLI configuration already exists, skip `config init`. The `default_8MB` partition is the board's default 8 MB layout with a roughly 3 MB application slot; this build does not implement OTA updates. Arduino IDE settings: **XIAO_ESP32S3**, **OPI PSRAM**, **8 MB flash**, **Default with spiffs (3MB APP/1.5MB SPIFFS)**, **Hardware CDC and JTAG**, **USB CDC on boot enabled**. Leave other board defaults unchanged.

## Upload and inspect

Use a USB-C **data** cable. `arduino-cli board list` identifies the port; select the FQBN above explicitly rather than trusting automatic board identification.

```sh
arduino-cli board list
arduino-cli upload --port COM5 --fqbn esp32:esp32:XIAO_ESP32S3:PSRAM=opi,FlashSize=8M,PartitionScheme=default_8MB,USBMode=hwcdc,CDCOnBoot=cdc firmware
arduino-cli monitor --port COM5 --config baudrate=921600
```

Replace `COM5` with the actual Windows port (or the serial device path on macOS/Linux). If upload fails, follow [Seeed's bootloader recovery instructions](https://wiki.seeedstudio.com/xiao_esp32s3_getting_started/). Compilation alone neither uploads nor proves electrical operation.

The serial log reports the sensor PID and PSRAM size. Supported sensors are OV2640, OV3660, and OV5640. An OV5640 loads AF firmware and gets up to eight seconds to settle after initialization; inspect its sharpness in a textured scene. A focus timeout is logged as a warning. An AF initialization error stops camera advertising. Older sensors skip AF. VGA JPEG output is 640 x 480 before browser rotation.

## Device contract

| Item | Value |
| --- | --- |
| Advertised name | `OpenGlass` |
| Main service | `19b10000-e8f2-537e-4f6c-d104768a1214` |
| Photo notifications | `19b10005-e8f2-537e-4f6c-d104768a1214` |
| Photo control, write one byte | `19b10006-e8f2-537e-4f6c-d104768a1214` |
| Commands | `0` stop; `255` single capture; `5..250` interval in seconds rounded down to a multiple of five |
| Packet | Two-byte little-endian sequence followed by JPEG bytes; `ff ff` alone ends a frame |
| Packet payload | `min(200, negotiated ATT MTU - 5)`; MTU request is 247, not a guarantee |
| Browser start/stop | Writes `5` after subscribing, then `0` on cleanup |

Transfers are serialized. A large JPEG or small negotiated MTU can take longer than five seconds. This is periodic photography, not video. Corrupt/incomplete frames are discarded by the browser; no retransmission protocol is implemented.

Camera pins match Seeed's [Sense pin map](https://wiki.seeedstudio.com/xiao_esp32s3_camera_usage/): XCLK 10; SDA 40; SCL 39; D0..D7 = 15, 17, 18, 16, 14, 12, 11, 48; VSYNC 38; HREF 47; PCLK 13. Onboard PDM microphone: clock 42, data 41. No extra camera or microphone wiring is required.

Audio characteristics remain for other BLE clients, but the browser does not subscribe to them. Keep `CODEC_PCM` selected. The firmware does not read the microSD slot, publish battery percentage, drive a display or speaker, or perform AI inference locally.

## Verification

The repository's [verification workflow](../.github/workflows/verify.yml) compiles this target and checks the web app. Hardware qualification still requires the [bench and wearable acceptance procedure](../docs/hardware-audit.md#physical-acceptance-tests).
