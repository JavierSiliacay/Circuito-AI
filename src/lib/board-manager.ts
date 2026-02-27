// ==============================================================
// Board Manager — Real Arduino Board Data
// ==============================================================
// Fetches the official Arduino package index from:
//   https://downloads.arduino.cc/packages/package_index.json
// This is the exact same source the Arduino IDE uses.
//
// Also supports third-party board URLs (ESP32, ESP8266, STM32, etc.)
// ==============================================================

export interface BoardPlatform {
    id: string;
    name: string;
    architecture: string;
    version: string;
    category: string;
    url: string;
    checksum: string;
    size: string;
    boards: BoardDefinition[];
    toolsDependencies: { packager: string; name: string; version: string }[];
}

export interface BoardDefinition {
    id: string;
    name: string;
    platform: string;
    platformId: string;
    architecture: string;
    fqbn: string; // Fully Qualified Board Name (e.g., "esp32:esp32:esp32s3")
    vendor: string;
    uploadProtocol?: string;
    uploadSpeed?: number;
    mcu?: string;
    frequency?: string;
    flashSize?: string;
    ramSize?: string;
    features: string[];
    installed: boolean;
}

export interface BoardPackage {
    name: string;
    maintainer: string;
    websiteURL: string;
    platforms: BoardPlatform[];
}

// Official Arduino & third-party board index URLs
const BOARD_INDEX_URLS = [
    'https://downloads.arduino.cc/packages/package_index.json',
];

// Third-party board URLs — same ones you'd add in Arduino IDE Preferences
const THIRD_PARTY_URLS = [
    'https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json',
    'https://arduino.esp8266.com/stable/package_esp8266com_index.json',
];

const STORAGE_KEY = 'circuito-boards-installed';
const CACHE_KEY = 'circuito-boards-cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// ============================================================
// Comprehensive built-in board database
// This is used as a fallback and also supplements the fetched data
// with boards that are always available without needing to fetch
// ============================================================
const BUILT_IN_BOARDS: BoardDefinition[] = [
    // --- Arduino AVR (Official) ---
    {
        id: 'arduino-uno',
        name: 'Arduino Uno',
        platform: 'Arduino AVR Boards',
        platformId: 'arduino:avr',
        architecture: 'avr',
        fqbn: 'arduino:avr:uno',
        vendor: 'Arduino',
        mcu: 'ATmega328P',
        frequency: '16 MHz',
        flashSize: '32 KB',
        ramSize: '2 KB',
        uploadProtocol: 'avrdude',
        uploadSpeed: 115200,
        features: ['UART', 'SPI', 'I2C', '14 Digital I/O', '6 Analog Inputs'],
        installed: true,
    },
    {
        id: 'arduino-uno-r4-wifi',
        name: 'Arduino UNO R4 WiFi',
        platform: 'Arduino UNO R4 Boards',
        platformId: 'arduino:renesas_uno',
        architecture: 'renesas_uno',
        fqbn: 'arduino:renesas_uno:unor4wifi',
        vendor: 'Arduino',
        mcu: 'Renesas RA4M1',
        frequency: '48 MHz',
        flashSize: '256 KB',
        ramSize: '32 KB',
        features: ['Wi-Fi', 'BLE', 'USB-C', '14 Digital I/O', '6 Analog Inputs', 'LED Matrix'],
        installed: true,
    },
    {
        id: 'arduino-uno-r4-minima',
        name: 'Arduino UNO R4 Minima',
        platform: 'Arduino UNO R4 Boards',
        platformId: 'arduino:renesas_uno',
        architecture: 'renesas_uno',
        fqbn: 'arduino:renesas_uno:minima',
        vendor: 'Arduino',
        mcu: 'Renesas RA4M1',
        frequency: '48 MHz',
        flashSize: '256 KB',
        ramSize: '32 KB',
        features: ['USB-C', 'CAN Bus', '14 Digital I/O', '6 Analog Inputs'],
        installed: true,
    },
    {
        id: 'arduino-mega-2560',
        name: 'Arduino Mega 2560',
        platform: 'Arduino AVR Boards',
        platformId: 'arduino:avr',
        architecture: 'avr',
        fqbn: 'arduino:avr:mega',
        vendor: 'Arduino',
        mcu: 'ATmega2560',
        frequency: '16 MHz',
        flashSize: '256 KB',
        ramSize: '8 KB',
        uploadProtocol: 'avrdude',
        uploadSpeed: 115200,
        features: ['54 Digital I/O', '16 Analog Inputs', '4x UART', 'SPI', 'I2C'],
        installed: true,
    },
    {
        id: 'arduino-nano',
        name: 'Arduino Nano',
        platform: 'Arduino AVR Boards',
        platformId: 'arduino:avr',
        architecture: 'avr',
        fqbn: 'arduino:avr:nano',
        vendor: 'Arduino',
        mcu: 'ATmega328P',
        frequency: '16 MHz',
        flashSize: '32 KB',
        ramSize: '2 KB',
        uploadProtocol: 'avrdude',
        uploadSpeed: 57600,
        features: ['UART', 'SPI', 'I2C', '22 Digital I/O', '8 Analog Inputs', 'Mini USB'],
        installed: true,
    },
    {
        id: 'arduino-nano-every',
        name: 'Arduino Nano Every',
        platform: 'Arduino megaAVR Boards',
        platformId: 'arduino:megaavr',
        architecture: 'megaavr',
        fqbn: 'arduino:megaavr:nona4809',
        vendor: 'Arduino',
        mcu: 'ATMega4809',
        frequency: '20 MHz',
        flashSize: '48 KB',
        ramSize: '6 KB',
        features: ['UART', 'SPI', 'I2C', '14 Digital I/O', '8 Analog'],
        installed: true,
    },
    {
        id: 'arduino-leonardo',
        name: 'Arduino Leonardo',
        platform: 'Arduino AVR Boards',
        platformId: 'arduino:avr',
        architecture: 'avr',
        fqbn: 'arduino:avr:leonardo',
        vendor: 'Arduino',
        mcu: 'ATmega32U4',
        frequency: '16 MHz',
        flashSize: '32 KB',
        ramSize: '2.5 KB',
        features: ['Native USB', 'UART', 'SPI', 'I2C', '20 Digital I/O', '12 Analog Inputs'],
        installed: true,
    },
    {
        id: 'arduino-micro',
        name: 'Arduino Micro',
        platform: 'Arduino AVR Boards',
        platformId: 'arduino:avr',
        architecture: 'avr',
        fqbn: 'arduino:avr:micro',
        vendor: 'Arduino',
        mcu: 'ATmega32U4',
        frequency: '16 MHz',
        flashSize: '32 KB',
        ramSize: '2.5 KB',
        features: ['Native USB', 'UART', 'SPI', 'I2C', '20 Digital I/O'],
        installed: true,
    },
    {
        id: 'arduino-due',
        name: 'Arduino Due',
        platform: 'Arduino SAM Boards',
        platformId: 'arduino:sam',
        architecture: 'sam',
        fqbn: 'arduino:sam:arduino_due_x_dbg',
        vendor: 'Arduino',
        mcu: 'AT91SAM3X8E',
        frequency: '84 MHz',
        flashSize: '512 KB',
        ramSize: '96 KB',
        features: ['ARM Cortex-M3', '54 Digital I/O', '12 Analog Inputs', '2x DAC', '4x UART'],
        installed: true,
    },
    {
        id: 'arduino-nano-33-iot',
        name: 'Arduino Nano 33 IoT',
        platform: 'Arduino SAMD Boards',
        platformId: 'arduino:samd',
        architecture: 'samd',
        fqbn: 'arduino:samd:nano_33_iot',
        vendor: 'Arduino',
        mcu: 'SAMD21 Cortex-M0+',
        frequency: '48 MHz',
        flashSize: '256 KB',
        ramSize: '32 KB',
        features: ['Wi-Fi', 'BLE', 'IMU', 'Crypto Chip', '14 Digital I/O', '8 Analog'],
        installed: true,
    },
    {
        id: 'arduino-nano-33-ble',
        name: 'Arduino Nano 33 BLE',
        platform: 'Arduino Mbed OS Nano Boards',
        platformId: 'arduino:mbed_nano',
        architecture: 'mbed_nano',
        fqbn: 'arduino:mbed_nano:nano33ble',
        vendor: 'Arduino',
        mcu: 'nRF52840',
        frequency: '64 MHz',
        flashSize: '1 MB',
        ramSize: '256 KB',
        features: ['BLE 5.0', '9-axis IMU', '14 Digital I/O', '8 Analog', 'ARM Cortex-M4F'],
        installed: true,
    },
    {
        id: 'arduino-nano-esp32',
        name: 'Arduino Nano ESP32',
        platform: 'Arduino ESP32 Boards',
        platformId: 'arduino:esp32',
        architecture: 'esp32',
        fqbn: 'arduino:esp32:nano_nora',
        vendor: 'Arduino',
        mcu: 'ESP32-S3',
        frequency: '240 MHz',
        flashSize: '16 MB',
        ramSize: '512 KB',
        features: ['Wi-Fi', 'BLE 5.0', 'USB-C', '14 Digital I/O', '8 Analog', 'RGB LED'],
        installed: true,
    },
    {
        id: 'arduino-mkr-wifi-1010',
        name: 'Arduino MKR WiFi 1010',
        platform: 'Arduino SAMD Boards',
        platformId: 'arduino:samd',
        architecture: 'samd',
        fqbn: 'arduino:samd:mkrwifi1010',
        vendor: 'Arduino',
        mcu: 'SAMD21 Cortex-M0+',
        frequency: '48 MHz',
        flashSize: '256 KB',
        ramSize: '32 KB',
        features: ['Wi-Fi', 'BLE', 'Crypto Chip', '8 Digital I/O', '7 Analog', 'LiPo Charging'],
        installed: true,
    },
    {
        id: 'arduino-portenta-h7',
        name: 'Arduino Portenta H7',
        platform: 'Arduino Mbed OS Portenta Boards',
        platformId: 'arduino:mbed_portenta',
        architecture: 'mbed_portenta',
        fqbn: 'arduino:mbed_portenta:envie_m7',
        vendor: 'Arduino',
        mcu: 'STM32H747XI',
        frequency: '480 MHz',
        flashSize: '2 MB',
        ramSize: '1 MB',
        features: ['Dual Core', 'Wi-Fi', 'BLE', 'Ethernet', 'GPU', 'USB-C', 'Camera'],
        installed: false,
    },
    {
        id: 'arduino-giga-r1',
        name: 'Arduino GIGA R1 WiFi',
        platform: 'Arduino Mbed OS GIGA Boards',
        platformId: 'arduino:mbed_giga',
        architecture: 'mbed_giga',
        fqbn: 'arduino:mbed_giga:giga',
        vendor: 'Arduino',
        mcu: 'STM32H747XI',
        frequency: '480 MHz',
        flashSize: '2 MB',
        ramSize: '1 MB',
        features: ['Dual Core', 'Wi-Fi', 'BLE', '76 Digital I/O', '12 Analog', 'Camera', 'Audio'],
        installed: false,
    },

    // --- ESP32 (Espressif) ---
    {
        id: 'esp32-devkit-v1',
        name: 'ESP32 Dev Module',
        platform: 'esp32 by Espressif Systems',
        platformId: 'esp32:esp32',
        architecture: 'esp32',
        fqbn: 'esp32:esp32:esp32',
        vendor: 'Espressif',
        mcu: 'ESP32',
        frequency: '240 MHz',
        flashSize: '4 MB',
        ramSize: '520 KB',
        uploadProtocol: 'esptool',
        uploadSpeed: 921600,
        features: ['Wi-Fi', 'Bluetooth', 'BLE', '34 GPIO', '18 ADC', '2x DAC', 'Touch Sensors'],
        installed: true,
    },
    {
        id: 'esp32-s2',
        name: 'ESP32-S2 Dev Module',
        platform: 'esp32 by Espressif Systems',
        platformId: 'esp32:esp32',
        architecture: 'esp32',
        fqbn: 'esp32:esp32:esp32s2',
        vendor: 'Espressif',
        mcu: 'ESP32-S2',
        frequency: '240 MHz',
        flashSize: '4 MB',
        ramSize: '320 KB',
        uploadProtocol: 'esptool',
        uploadSpeed: 921600,
        features: ['Wi-Fi', 'Native USB', '43 GPIO', '20 ADC', '2x DAC', 'Touch Sensors'],
        installed: true,
    },
    {
        id: 'esp32-s3',
        name: 'ESP32-S3 Dev Module',
        platform: 'esp32 by Espressif Systems',
        platformId: 'esp32:esp32',
        architecture: 'esp32',
        fqbn: 'esp32:esp32:esp32s3',
        vendor: 'Espressif',
        mcu: 'ESP32-S3',
        frequency: '240 MHz',
        flashSize: '8 MB',
        ramSize: '512 KB',
        uploadProtocol: 'esptool',
        uploadSpeed: 921600,
        features: ['Wi-Fi', 'BLE 5.0', 'Native USB', 'AI Acceleration', '45 GPIO', '20 ADC'],
        installed: true,
    },
    {
        id: 'esp32-c3',
        name: 'ESP32-C3 Dev Module',
        platform: 'esp32 by Espressif Systems',
        platformId: 'esp32:esp32',
        architecture: 'esp32',
        fqbn: 'esp32:esp32:esp32c3',
        vendor: 'Espressif',
        mcu: 'ESP32-C3',
        frequency: '160 MHz',
        flashSize: '4 MB',
        ramSize: '400 KB',
        uploadProtocol: 'esptool',
        uploadSpeed: 921600,
        features: ['Wi-Fi', 'BLE 5.0', 'RISC-V', '22 GPIO', '6 ADC', 'USB Serial/JTAG'],
        installed: true,
    },
    {
        id: 'esp32-c6',
        name: 'ESP32-C6 Dev Module',
        platform: 'esp32 by Espressif Systems',
        platformId: 'esp32:esp32',
        architecture: 'esp32',
        fqbn: 'esp32:esp32:esp32c6',
        vendor: 'Espressif',
        mcu: 'ESP32-C6',
        frequency: '160 MHz',
        flashSize: '4 MB',
        ramSize: '512 KB',
        features: ['Wi-Fi 6', 'BLE 5.0', 'Thread/Zigbee', 'RISC-V', '30 GPIO'],
        installed: true,
    },

    // --- ESP8266 ---
    {
        id: 'esp8266-nodemcu',
        name: 'NodeMCU 1.0 (ESP-12E)',
        platform: 'esp8266 by ESP8266 Community',
        platformId: 'esp8266:esp8266',
        architecture: 'esp8266',
        fqbn: 'esp8266:esp8266:nodemcuv2',
        vendor: 'ESP8266 Community',
        mcu: 'ESP8266',
        frequency: '80 MHz',
        flashSize: '4 MB',
        ramSize: '80 KB',
        uploadProtocol: 'esptool',
        uploadSpeed: 921600,
        features: ['Wi-Fi', '11 GPIO', '1 ADC', 'UART', 'SPI', 'I2C'],
        installed: true,
    },
    {
        id: 'esp8266-wemos-d1',
        name: 'LOLIN (Wemos) D1 Mini',
        platform: 'esp8266 by ESP8266 Community',
        platformId: 'esp8266:esp8266',
        architecture: 'esp8266',
        fqbn: 'esp8266:esp8266:d1_mini',
        vendor: 'Wemos',
        mcu: 'ESP8266',
        frequency: '80 MHz',
        flashSize: '4 MB',
        ramSize: '80 KB',
        features: ['Wi-Fi', '11 GPIO', '1 ADC', 'Micro USB', 'Compact'],
        installed: true,
    },

    // --- STM32 ---
    {
        id: 'stm32-bluepill-f103c8',
        name: 'Blue Pill F103C8',
        platform: 'STM32 Boards by STMicroelectronics',
        platformId: 'STMicroelectronics:stm32',
        architecture: 'stm32',
        fqbn: 'STMicroelectronics:stm32:GenF1:pnum=BLUEPILL_F103C8',
        vendor: 'STMicroelectronics',
        mcu: 'STM32F103C8T6',
        frequency: '72 MHz',
        flashSize: '64 KB',
        ramSize: '20 KB',
        features: ['ARM Cortex-M3', '37 GPIO', '10 ADC', '3x UART', '2x SPI', '2x I2C'],
        installed: false,
    },
    {
        id: 'stm32-nucleo-f401re',
        name: 'Nucleo F401RE',
        platform: 'STM32 Boards by STMicroelectronics',
        platformId: 'STMicroelectronics:stm32',
        architecture: 'stm32',
        fqbn: 'STMicroelectronics:stm32:Nucleo_64:pnum=NUCLEO_F401RE',
        vendor: 'STMicroelectronics',
        mcu: 'STM32F401RET6',
        frequency: '84 MHz',
        flashSize: '512 KB',
        ramSize: '96 KB',
        features: ['ARM Cortex-M4', 'Arduino Header', 'ST Morpho', '50 GPIO', '16 ADC'],
        installed: false,
    },

    // --- Raspberry Pi RP2040 ---
    {
        id: 'rp2040-pico',
        name: 'Raspberry Pi Pico',
        platform: 'Raspberry Pi Pico/RP2040/RP2350 by Earle F. Philhower',
        platformId: 'rp2040:rp2040',
        architecture: 'rp2040',
        fqbn: 'rp2040:rp2040:rpipico',
        vendor: 'Raspberry Pi',
        mcu: 'RP2040',
        frequency: '133 MHz',
        flashSize: '2 MB',
        ramSize: '264 KB',
        features: ['Dual ARM Cortex-M0+', '26 GPIO', '3 ADC', '2x UART', '2x SPI', '2x I2C', 'PIO'],
        installed: false,
    },
    {
        id: 'rp2040-pico-w',
        name: 'Raspberry Pi Pico W',
        platform: 'Raspberry Pi Pico/RP2040/RP2350 by Earle F. Philhower',
        platformId: 'rp2040:rp2040',
        architecture: 'rp2040',
        fqbn: 'rp2040:rp2040:rpipicow',
        vendor: 'Raspberry Pi',
        mcu: 'RP2040',
        frequency: '133 MHz',
        flashSize: '2 MB',
        ramSize: '264 KB',
        features: ['Wi-Fi', 'BLE', 'Dual ARM Cortex-M0+', '26 GPIO', '3 ADC', 'PIO'],
        installed: false,
    },
    {
        id: 'rp2350-pico-2',
        name: 'Raspberry Pi Pico 2',
        platform: 'Raspberry Pi Pico/RP2040/RP2350 by Earle F. Philhower',
        platformId: 'rp2040:rp2040',
        architecture: 'rp2040',
        fqbn: 'rp2040:rp2040:rpipico2',
        vendor: 'Raspberry Pi',
        mcu: 'RP2350',
        frequency: '150 MHz',
        flashSize: '4 MB',
        ramSize: '520 KB',
        features: ['Dual ARM Cortex-M33 / RISC-V', '26 GPIO', '4 ADC', 'Security', 'PIO'],
        installed: false,
    },

    // --- Adafruit ---
    {
        id: 'adafruit-feather-m0',
        name: 'Adafruit Feather M0',
        platform: 'Adafruit SAMD Boards',
        platformId: 'adafruit:samd',
        architecture: 'samd',
        fqbn: 'adafruit:samd:adafruit_feather_m0',
        vendor: 'Adafruit',
        mcu: 'ATSAMD21G18',
        frequency: '48 MHz',
        flashSize: '256 KB',
        ramSize: '32 KB',
        features: ['LiPo Charging', 'Native USB', '20 GPIO', '12 ADC', 'I2S'],
        installed: false,
    },
    {
        id: 'adafruit-feather-esp32-s3',
        name: 'Adafruit Feather ESP32-S3',
        platform: 'esp32 by Espressif Systems',
        platformId: 'esp32:esp32',
        architecture: 'esp32',
        fqbn: 'esp32:esp32:adafruit_feather_esp32s3',
        vendor: 'Adafruit',
        mcu: 'ESP32-S3',
        frequency: '240 MHz',
        flashSize: '4 MB',
        ramSize: '512 KB',
        features: ['Wi-Fi', 'BLE', 'LiPo Charging', 'Native USB', 'STEMMA QT', 'NeoPixel'],
        installed: false,
    },

    // --- Seeed Studio ---
    {
        id: 'seeed-xiao-esp32s3',
        name: 'Seeed XIAO ESP32S3',
        platform: 'esp32 by Espressif Systems',
        platformId: 'esp32:esp32',
        architecture: 'esp32',
        fqbn: 'esp32:esp32:XIAO_ESP32S3',
        vendor: 'Seeed Studio',
        mcu: 'ESP32-S3',
        frequency: '240 MHz',
        flashSize: '8 MB',
        ramSize: '512 KB',
        features: ['Wi-Fi', 'BLE', 'Native USB', 'Camera', 'Tiny Form Factor', '11 GPIO'],
        installed: false,
    },
    {
        id: 'seeed-xiao-esp32c3',
        name: 'Seeed XIAO ESP32C3',
        platform: 'esp32 by Espressif Systems',
        platformId: 'esp32:esp32',
        architecture: 'esp32',
        fqbn: 'esp32:esp32:XIAO_ESP32C3',
        vendor: 'Seeed Studio',
        mcu: 'ESP32-C3',
        frequency: '160 MHz',
        flashSize: '4 MB',
        ramSize: '400 KB',
        features: ['Wi-Fi', 'BLE', 'RISC-V', 'Tiny Form Factor', '11 GPIO'],
        installed: false,
    },

    // --- SparkFun ---
    {
        id: 'sparkfun-thing-plus-esp32',
        name: 'SparkFun Thing Plus ESP32',
        platform: 'esp32 by Espressif Systems',
        platformId: 'esp32:esp32',
        architecture: 'esp32',
        fqbn: 'esp32:esp32:sparkfun_esp32s2_thing_plus',
        vendor: 'SparkFun',
        mcu: 'ESP32',
        frequency: '240 MHz',
        flashSize: '16 MB',
        ramSize: '520 KB',
        features: ['Wi-Fi', 'BLE', 'Qwiic', 'LiPo Charging', 'microSD'],
        installed: false,
    },

    // --- Teensy ---
    {
        id: 'teensy-41',
        name: 'Teensy 4.1',
        platform: 'Teensy by PJRC',
        platformId: 'teensy:avr',
        architecture: 'avr',
        fqbn: 'teensy:avr:teensy41',
        vendor: 'PJRC',
        mcu: 'IMXRT1062',
        frequency: '600 MHz',
        flashSize: '8 MB',
        ramSize: '1 MB',
        features: ['ARM Cortex-M7', '55 Digital I/O', '18 Analog', 'Ethernet', 'USB Host', 'microSD'],
        installed: false,
    },
    {
        id: 'teensy-40',
        name: 'Teensy 4.0',
        platform: 'Teensy by PJRC',
        platformId: 'teensy:avr',
        architecture: 'avr',
        fqbn: 'teensy:avr:teensy40',
        vendor: 'PJRC',
        mcu: 'IMXRT1062',
        frequency: '600 MHz',
        flashSize: '2 MB',
        ramSize: '1 MB',
        features: ['ARM Cortex-M7', '40 Digital I/O', '14 Analog', 'USB', 'CAN Bus'],
        installed: false,
    },
];

// ============================================================
// Board Manager Functions
// ============================================================

function getInstalledBoards(): string[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

function saveInstalledBoards(ids: string[]) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    } catch {
        // Storage may be full
    }
}

export function getAllBoards(): BoardDefinition[] {
    const installedIds = getInstalledBoards();

    return BUILT_IN_BOARDS.map((board) => ({
        ...board,
        installed: board.installed || installedIds.includes(board.id),
    }));
}

export function getInstalledBoardsList(): BoardDefinition[] {
    return getAllBoards().filter((b) => b.installed);
}

export function installBoard(boardId: string) {
    const installed = getInstalledBoards();
    if (!installed.includes(boardId)) {
        installed.push(boardId);
        saveInstalledBoards(installed);
    }
}

export function uninstallBoard(boardId: string) {
    const installed = getInstalledBoards();
    saveInstalledBoards(installed.filter((id) => id !== boardId));
}

export function getBoardById(boardId: string): BoardDefinition | undefined {
    return getAllBoards().find((b) => b.id === boardId);
}

export function searchBoards(query: string): BoardDefinition[] {
    const q = query.toLowerCase();
    return getAllBoards().filter(
        (b) =>
            b.name.toLowerCase().includes(q) ||
            b.vendor.toLowerCase().includes(q) ||
            b.mcu?.toLowerCase().includes(q) ||
            b.architecture.toLowerCase().includes(q) ||
            b.platform.toLowerCase().includes(q) ||
            b.features.some((f) => f.toLowerCase().includes(q))
    );
}

export function getBoardsByVendor(): Record<string, BoardDefinition[]> {
    const boards = getAllBoards();
    const grouped: Record<string, BoardDefinition[]> = {};

    for (const board of boards) {
        if (!grouped[board.vendor]) grouped[board.vendor] = [];
        grouped[board.vendor].push(board);
    }

    return grouped;
}

export function getBoardsByArchitecture(): Record<string, BoardDefinition[]> {
    const boards = getAllBoards();
    const grouped: Record<string, BoardDefinition[]> = {};

    for (const board of boards) {
        const arch = board.architecture;
        if (!grouped[arch]) grouped[arch] = [];
        grouped[arch].push(board);
    }

    return grouped;
}

// Try to fetch additional boards from the official index
// This supplements the built-in list with any boards not already included
export async function fetchRemoteBoardIndex(): Promise<BoardDefinition[]> {
    try {
        // Check cache first
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
            const { timestamp, data } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL) {
                return data;
            }
        }

        const response = await fetch(BOARD_INDEX_URLS[0], {
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) return [];

        const index = await response.json();
        const boards: BoardDefinition[] = [];

        for (const pkg of index.packages || []) {
            for (const platform of pkg.platforms || []) {
                for (const board of platform.boards || []) {
                    // Skip if we already have this board in built-in list
                    if (BUILT_IN_BOARDS.some((b) => b.fqbn === `${pkg.name}:${platform.architecture}:${board.name}`)) {
                        continue;
                    }

                    boards.push({
                        id: `${pkg.name}-${board.name}`.toLowerCase().replace(/\s+/g, '-'),
                        name: board.name,
                        platform: `${platform.name} by ${pkg.maintainer}`,
                        platformId: `${pkg.name}:${platform.architecture}`,
                        architecture: platform.architecture,
                        fqbn: `${pkg.name}:${platform.architecture}:${board.name}`,
                        vendor: pkg.maintainer,
                        features: [],
                        installed: false,
                    });
                }
            }
        }

        // Cache the results
        localStorage.setItem(CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            data: boards,
        }));

        return boards;
    } catch {
        return [];
    }
}
