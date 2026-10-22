#define CAMERA_MODEL_XIAO_ESP32S3
#include <atomic>
#include <I2S.h>
#include <ESP32_OV5640_AF.h>
#include <BLE2902.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>
#include "esp_camera.h"
#include "camera_pins.h"
#include "mulaw.h"

// Audio

// Optional audio for other BLE clients. The current browser app uses photos
// and typed questions only; it does not consume any of these audio codecs.
// Opus remains experimental. Leave PCM selected for the reference build.

// #define CODEC_OPUS
// #define CODEC_MULAW
#define CODEC_PCM

// Browser UI currently consumes photos only. Keep mic available to BLE clients
// that explicitly subscribe, without blocking or flooding the camera stream.

#ifdef CODEC_OPUS

#include <opus.h>

#define OPUS_APPLICATION OPUS_APPLICATION_VOIP
#define OPUS_BITRATE 16000

OpusEncoder *opus_encoder = nullptr;

#define FRAME_SIZE 320
#define CHANNELS 1
#define MAX_PACKET_SIZE 1000

#define SAMPLE_RATE 16000
#define SAMPLE_BITS 16

#else
#ifdef CODEC_MULAW

#define SAMPLE_RATE 8000
#define SAMPLE_BITS 16

#else

#define FRAME_SIZE 160
#define SAMPLE_RATE 16000
#define SAMPLE_BITS 16

#endif
#endif

//
// BLE
//

// Device Information Service
#define DEVICE_INFORMATION_SERVICE_UUID (uint16_t)0x180A
#define MANUFACTURER_NAME_STRING_CHAR_UUID (uint16_t)0x2A29
#define MODEL_NUMBER_STRING_CHAR_UUID (uint16_t)0x2A24
#define FIRMWARE_REVISION_STRING_CHAR_UUID (uint16_t)0x2A26
#define HARDWARE_REVISION_STRING_CHAR_UUID (uint16_t)0x2A27


// Main Friend Service
static BLEUUID serviceUUID("19B10000-E8F2-537E-4F6C-D104768A1214");
static BLEUUID audioDataUUID("19B10001-E8F2-537E-4F6C-D104768A1214");
static BLEUUID audioCodecUUID("19B10002-E8F2-537E-4F6C-D104768A1214");
static BLEUUID photoDataUUID("19B10005-E8F2-537E-4F6C-D104768A1214");
static BLEUUID photoControlUUID("19B10006-E8F2-537E-4F6C-D104768A1214");

BLECharacteristic *audioDataCharacteristic;
BLECharacteristic *photoDataCharacteristic;
BLECharacteristic *photoControlCharacteristic;


// State

std::atomic<bool> connected{false};
std::atomic<bool> resetCapture{false};
std::atomic<int> pendingControl{-1};
BLEServer *bleServer = nullptr;
bool cameraReady = false;
bool microphoneReady = false;
BLE2902 *audioSubscription = nullptr;
BLE2902 *photoSubscription = nullptr;

uint16_t audio_frame_count = 0;

bool isCapturingPhotos = false;
int captureInterval = 0;
unsigned long lastCaptureTime = 0;

size_t sent_photo_bytes = 0;
size_t sent_photo_frames = 0;
bool photoDataUploading = false;


void handlePhotoControl(uint8_t controlValue);

class ServerHandler : public BLEServerCallbacks
{
  void onConnect(BLEServer *server)
  {
    connected = true;
  }

  void onDisconnect(BLEServer *server)
  {
    connected = false;
    pendingControl.store(-1);
    audioSubscription->setNotifications(false);
    photoSubscription->setNotifications(false);
    resetCapture = true;
    BLEDevice::startAdvertising();
  }
};

class PhotoControlCallback : public BLECharacteristicCallbacks
{
  void onWrite(BLECharacteristic *characteristic)
  {
    if (characteristic->getLength() == 1)
    {
      pendingControl.store((int)characteristic->getData()[0]);
    }
  }
};

void configure_ble() {
  BLEDevice::init("OpenGlass");
  BLEDevice::setMTU(247);
  BLEServer *server = BLEDevice::createServer();
  bleServer = server;

  // Main service

  BLEService *service = server->createService(serviceUUID, 20);

  // Audio characteristics
  audioDataCharacteristic = service->createCharacteristic(
    audioDataUUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  BLE2902 *ccc = new BLE2902();
  audioSubscription = ccc;
  audioDataCharacteristic->addDescriptor(ccc);

  BLECharacteristic *audioCodecCharacteristic = service->createCharacteristic(
    audioCodecUUID,
    BLECharacteristic::PROPERTY_READ);
#ifdef CODEC_OPUS
  uint8_t codecId = 20; // Opus 16khz
#else
#ifdef CODEC_MULAW
  uint8_t codecId = 11; // MuLaw 8khz
#else
  uint8_t codecId = 1; // PCM 8khz
#endif
#endif
  audioCodecCharacteristic->setValue(&codecId, 1);

  // Photo characteristics

  photoDataCharacteristic = service->createCharacteristic(
      photoDataUUID,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY);
  ccc = new BLE2902();
  photoSubscription = ccc;
  photoDataCharacteristic->addDescriptor(ccc);

  photoControlCharacteristic = service->createCharacteristic(
      photoControlUUID,
      BLECharacteristic::PROPERTY_WRITE);
  photoControlCharacteristic->setCallbacks(new PhotoControlCallback());
  uint8_t controlValue = 0;
  photoControlCharacteristic->setValue(&controlValue, 1);

  // Device Information Service

  BLEService *deviceInfoService = server->createService(DEVICE_INFORMATION_SERVICE_UUID);
  BLECharacteristic *manufacturerNameCharacteristic = deviceInfoService->createCharacteristic(
      MANUFACTURER_NAME_STRING_CHAR_UUID,
      BLECharacteristic::PROPERTY_READ);
  BLECharacteristic *modelNumberCharacteristic = deviceInfoService->createCharacteristic(
      MODEL_NUMBER_STRING_CHAR_UUID,
      BLECharacteristic::PROPERTY_READ);
  BLECharacteristic *firmwareRevisionCharacteristic = deviceInfoService->createCharacteristic(
      FIRMWARE_REVISION_STRING_CHAR_UUID,
      BLECharacteristic::PROPERTY_READ);
  BLECharacteristic *hardwareRevisionCharacteristic = deviceInfoService->createCharacteristic(
      HARDWARE_REVISION_STRING_CHAR_UUID,
      BLECharacteristic::PROPERTY_READ);

  manufacturerNameCharacteristic->setValue("Based Hardware");
  modelNumberCharacteristic->setValue("OpenGlass");
  firmwareRevisionCharacteristic->setValue("1.1.0");
  hardwareRevisionCharacteristic->setValue("Seeed Xiao ESP32S3 Sense");

  // No battery service: this board has no wired battery voltage monitor.

  // Start the services
  service->start();
  deviceInfoService->start();

  server->setCallbacks(new ServerHandler());

  BLEAdvertising *advertising = BLEDevice::getAdvertising();
  advertising->addServiceUUID(service->getUUID());
  advertising->setScanResponse(true);
  advertising->setMinPreferred(0x06);
  advertising->setMaxPreferred(0x12);
  BLEDevice::startAdvertising();
}

camera_fb_t *fb = nullptr;

bool take_photo() {
  // Release buffer
  if (fb) {
    esp_camera_fb_return(fb);
    fb = nullptr;
  }

  // Take a photo
  fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Failed to get camera frame buffer");
    return false;
  }

  return true;
}

void handlePhotoControl(uint8_t controlValue)
{
  if (controlValue == 0xff)
  {
    // Take a single photo
    isCapturingPhotos = true;
    captureInterval = 0;
  }
  else if (controlValue == 0)
  {
    // Stop taking photos
    isCapturingPhotos = false;
    captureInterval = 0;
    photoDataUploading = false;
    if (fb) { esp_camera_fb_return(fb); fb = nullptr; }
  }
  else if (controlValue >= 5 && controlValue <= 250)
  {
    // Start taking photos at specified interval
    captureInterval = (controlValue / 5) * 5000; // Round down to a multiple of 5 seconds.
    isCapturingPhotos = true;
    lastCaptureTime = millis() - captureInterval;
  }
}

//
// Microphone
//

#ifdef CODEC_OPUS

static size_t recording_buffer_size = FRAME_SIZE * 2; // 16-bit samples
static size_t compressed_buffer_size = MAX_PACKET_SIZE;
#define VOLUME_GAIN 2

#else
#ifdef CODEC_MULAW

static size_t recording_buffer_size = 400;
static size_t compressed_buffer_size = 400 + 3; /* header */
#define VOLUME_GAIN 2

#else

static size_t recording_buffer_size = FRAME_SIZE * 2; // 16-bit samples
static size_t compressed_buffer_size = recording_buffer_size + 3; /* header */
#define VOLUME_GAIN 2

#endif
#endif

static uint8_t *s_recording_buffer = nullptr;
static uint8_t *s_compressed_frame = nullptr;
static uint8_t *s_compressed_frame_2 = nullptr;

void configure_microphone() {

  // start I2S at 16 kHz with 16-bits per sample
  I2S.setAllPins(-1, 42, 41, -1, -1);
  if (!I2S.begin(PDM_MONO_MODE, SAMPLE_RATE, SAMPLE_BITS)) {
    Serial.println("Failed to initialize I2S!");
    return; // Camera remains usable when microphone initialization fails.
  }

  // Allocate buffers
  s_recording_buffer = (uint8_t *) ps_calloc(recording_buffer_size, sizeof(uint8_t));
  s_compressed_frame = (uint8_t *) ps_calloc(compressed_buffer_size, sizeof(uint8_t));
  microphoneReady = s_recording_buffer && s_compressed_frame;
  if (!microphoneReady) Serial.println("Microphone allocation failed; audio disabled");
}

size_t read_microphone() {
  size_t bytes_recorded = 0;
  esp_i2s::i2s_read(esp_i2s::I2S_NUM_0, s_recording_buffer, recording_buffer_size, &bytes_recorded, pdMS_TO_TICKS(25));
  return bytes_recorded;
}

//
// Camera
//

void configure_camera() {
  camera_config_t config = {};
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  // Allocate enough PSRAM for OV5640 autofocus at SXGA before reducing to VGA.
  config.frame_size = FRAMESIZE_SXGA;
  config.pixel_format = PIXFORMAT_JPEG; // for streaming
  config.fb_count = 2;

  config.jpeg_quality = 15;
  config.grab_mode = CAMERA_GRAB_LATEST;
  config.fb_location = CAMERA_FB_IN_PSRAM;

  if (!psramFound()) { Serial.println("Enable OPI PSRAM for the XIAO ESP32S3 Sense"); return; }

  // camera init
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }
  sensor_t *sensor = esp_camera_sensor_get();
  if (!sensor) { Serial.println("Camera sensor unavailable"); return; }
  Serial.printf("Camera PID: 0x%04x; PSRAM: %u bytes\n", sensor->id.PID, ESP.getPsramSize());
  if (sensor->id.PID == OV5640_PID) {
    // Seeed's OV5640 guidance: reduce DVP output drive and load AF firmware.
    // esp_camera_init alone does not initialize the autofocus lens.
    if (sensor->set_reg(sensor, 0x302c, 0xc0, 0x00) != 0)
      Serial.println("Warning: OV5640 drive-strength adjustment failed");
    OV5640 autofocus;
    if (!autofocus.start(sensor) || autofocus.focusInit() != 0 || autofocus.autoFocusMode() != 0) {
      Serial.println("OV5640 autofocus initialization failed; check the camera and power supply");
      return;
    }
    const unsigned long started = millis();
    while (autofocus.getFWStatus() != 0x10 && millis() - started < 8000) delay(100);
    if (autofocus.getFWStatus() != 0x10)
      Serial.println("Warning: autofocus has not settled; verify image sharpness before use");
  } else if (sensor->id.PID == OV3660_PID) {
    // Match the fixed-focus OV3660 orientation in Seeed/Espressif examples.
    sensor->set_vflip(sensor, 1);
    sensor->set_brightness(sensor, 1);
    sensor->set_saturation(sensor, -2);
  } else if (sensor->id.PID != OV2640_PID) {
    Serial.println("Unsupported sensor: use a Seeed Sense OV2640, OV3660 or OV5640 camera");
    return;
  }
  if (sensor->set_framesize(sensor, FRAMESIZE_VGA) != 0) {
    Serial.println("Could not set VGA capture size");
    return;
  }
  Serial.println("Camera ready: VGA JPEG; connect to OpenGlass over BLE");
  cameraReady = true;
}

//
// Main
//

// static uint8_t *s_compressed_frame_2 = nullptr;
// static size_t compressed_buffer_size = 400 + 3;
void setup() {
  Serial.begin(921600);
  // SD.begin(21);
  s_compressed_frame_2 = (uint8_t *)malloc(202);
  if (!s_compressed_frame_2) { Serial.println("Photo allocation failed"); return; }
  // s_compressed_frame_2 = (uint8_t *) ps_calloc(compressed_buffer_size, sizeof(uint8_t));
#ifdef CODEC_OPUS
  int opus_err;
  opus_encoder = opus_encoder_create(SAMPLE_RATE, CHANNELS, OPUS_APPLICATION, &opus_err);
  if (opus_err != OPUS_OK || !opus_encoder)
  {
    Serial.println("Failed to create Opus encoder!");
    while (1)
      ; // do nothing
  }
  opus_encoder_ctl(opus_encoder, OPUS_SET_BITRATE(OPUS_BITRATE));
#endif
  configure_microphone();
  configure_camera();
  if (cameraReady) configure_ble();
}

int16_t amplifySample(int16_t sample) {
  int32_t amplified = (int32_t)sample * (1 << VOLUME_GAIN);
  return (int16_t)max((int32_t)-32768, min((int32_t)32767, amplified));
}

void loop() {
  if (!cameraReady || !bleServer) { delay(100); return; }
  // Callbacks only publish commands. The main loop owns all frame buffers.
  if (resetCapture.exchange(false)) {
    isCapturingPhotos = false;
    photoDataUploading = false;
    sent_photo_bytes = sent_photo_frames = 0;
    if (fb) { esp_camera_fb_return(fb); fb = nullptr; }
  }
  int command = pendingControl.exchange(-1);
  if (command >= 0 && connected) handlePhotoControl((uint8_t)command);
  uint16_t mtu = connected ? bleServer->getPeerMTU(bleServer->getConnId()) : 23;
  if (mtu < 23) mtu = 23;
  // No PDM read or audio notifications unless a client subscribes.
  size_t bytes_recorded = microphoneReady && connected && audioSubscription->getNotifications()
    ? read_microphone() : 0;

  // Push audio to BLE
  if (bytes_recorded > 0 && connected)
  {
#ifdef CODEC_OPUS
    int16_t samples[FRAME_SIZE];
    for (size_t i = 0; i < bytes_recorded; i += 2)
    {
      samples[i / 2] = amplifySample((int16_t)((s_recording_buffer[i + 1] << 8) | s_recording_buffer[i]));
    }

    int encoded_bytes = opus_encode(opus_encoder, samples, FRAME_SIZE, &s_compressed_frame[3], MAX_PACKET_SIZE - 3);

    if (encoded_bytes > 0)
    {
#else
#ifdef CODEC_MULAW
    for (size_t i = 0; i < bytes_recorded; i += 2)
    {
      int16_t sample = ((s_recording_buffer[i + 1] << 8) | s_recording_buffer[i]) << VOLUME_GAIN;
      s_compressed_frame[i / 2 + 3] = linear2ulaw(sample);
    }

    int encoded_bytes = bytes_recorded / 2;
#else
    for (size_t i = 0; i < bytes_recorded / 4; i++)
    {
      int16_t sample = amplifySample(((int16_t *)s_recording_buffer)[i * 2]); // Read every other 16-bit sample
      s_compressed_frame[i * 2 + 3] = sample & 0xFF;           // Low byte
      s_compressed_frame[i * 2 + 4] = (sample >> 8) & 0xFF;    // High byte
    }

    int encoded_bytes = bytes_recorded / 2;
#endif
#endif

    s_compressed_frame[0] = audio_frame_count & 0xFF;
    s_compressed_frame[1] = (audio_frame_count >> 8) & 0xFF;
    s_compressed_frame[2] = 0;

    size_t out_buffer_size = encoded_bytes + 3;
    if (out_buffer_size <= (size_t)(mtu - 3)) {
      audioDataCharacteristic->setValue(s_compressed_frame, out_buffer_size);
      audioDataCharacteristic->notify();
    }
    audio_frame_count++;
#ifdef CODEC_OPUS
    }
#endif
  }

  // Take a photo
  unsigned long now = millis();

  // Don't take a photo if we are already sending data for previous photo
  if (isCapturingPhotos && !photoDataUploading && connected && photoSubscription->getNotifications())
  {
    if ((captureInterval == 0)
      || ((now - lastCaptureTime) >= captureInterval))
    {
      if (captureInterval == 0) {
        // Single photo requested
        isCapturingPhotos = false;
      }

      // Take the photo
      if (take_photo())
      {
        photoDataUploading = true;
        sent_photo_bytes = 0;
        sent_photo_frames = 0;
        lastCaptureTime = now;
      }
    }
  }

  // Push photo data to BLE
  if (photoDataUploading && connected && photoSubscription->getNotifications()) {
    size_t remaining = fb->len - sent_photo_bytes;
    if (remaining > 0) {
      // Populate buffer
      s_compressed_frame_2[0] = sent_photo_frames & 0xFF;
      s_compressed_frame_2[1] = (sent_photo_frames >> 8) & 0xFF;
      size_t bytes_to_copy = remaining;
      size_t payloadLimit = min((size_t)200, (size_t)(mtu - 5));
      if (bytes_to_copy > payloadLimit) bytes_to_copy = payloadLimit;
      memcpy(&s_compressed_frame_2[2], &fb->buf[sent_photo_bytes], bytes_to_copy);

      // Push to BLE
      photoDataCharacteristic->setValue(s_compressed_frame_2, bytes_to_copy + 2);
      photoDataCharacteristic->notify();
      sent_photo_bytes += bytes_to_copy;
      sent_photo_frames++;
    } else {
      // End flag
      s_compressed_frame_2[0] = 0xFF;
      s_compressed_frame_2[1] = 0xFF;
      photoDataCharacteristic->setValue(s_compressed_frame_2, 2);
      photoDataCharacteristic->notify();

      photoDataUploading = false;
      esp_camera_fb_return(fb);
      fb = nullptr;
    }
  }

  // Delay
  delay(10);
}
