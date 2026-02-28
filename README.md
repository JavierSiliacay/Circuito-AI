# Circuito AI

## Project Overview

Circuito AI is a professional hardware development environment designed specifically for makers, embedded engineers, and IoT developers. It provides a browser-based suite of tools that eliminates the need for complex local toolchain installations, allowing users to write, debug, and flash firmware for Arduino and ESP32 platforms directly from their web browser.

The platform combines a powerful code editor with specialized AI assistance and direct hardware communication via the Web Serial API to create a seamless workflow for hardware prototyping and development.

## Key Features

### Professional Cloud IDE
A high-performance code editor powered by Monaco (the engine behind VS Code). It features Arduino and C++ syntax highlighting, intelligent code completion, and a sophisticated multi-tab interface for managing multiple files and projects simultaneously.

### Browser-Based Firmware Flashing
Direct communication with hardware using the Web Serial API. This allows for compiling and flashing firmware to ESP32 and Arduino boards without any external plugins or desktop applications.

### Visual Circuit Designer
An interactive drag-and-drop circuit builder for planning hardware connections. This tool assists developers in organizing pin assignments, validating wiring logic, and maintaining a visual record of their hardware configurations.

### Hardware-Specialized AI Assistant
A context-aware AI integrated with specialized hardware knowledge. It can analyze the current code and board configuration to providing debugging advice, generate boilerplate code, and offer guidance on physical wiring and component specifications.

### IoT Monitoring and Device Management
A dedicated dashboard for managing connected devices and viewing real-time serial telemetry. The IoT Dashboard provides a live data stream for debugging sensor outputs and monitoring device performance in real-time.

## Technology Stack

- **Frontend Framework**: Next.js 16 with React 19
- **Editor Environment**: Monaco Editor
- **Hardware Communication**: Web Serial API
- **Database and Storage**: Supabase
- **Artificial Intelligence**: AI API integration featuring specialized models for hardware engineering
- **Animations and UI**: Framer Motion and Shadcn/UI for a premium, responsive interface

## Current Development Progress

### Core Infrastructure
- Fully implemented project management system with Supabase integration.
- Functional Monaco Editor integration with Arduino/C++ support.
- Successful Web Serial implementation for device detection and serial monitoring.
- Board manager system support for popular development kits (ESP32 DevKit, Arduino Uno, etc.).

### AI and Automation
- AI response streaming implemented for character-by-character delivery.
- AI Agent capability added to write code directly into the editor with real-time progress visualization.
- Contextual intent classification for routing queries between hardware, documentation, and code refactoring models.

### User Interface and Experience
- Dark-themed IDE layout optimized for embedded development.
- Functional IoT Dashboard with pause/resume and data clearing capabilities.
- Device management interface for baud rate configuration and connection handling.

### Recent Progress
- Implemented character-by-character AI chat streaming for a more interactive experience.
- Added a progress bar and status indicator for AI-driven code application.
- Refined the dashboard telemetry view to handle high-frequency data streams.
- Optimized the AI system prompt to prioritize safety and hardware-specific constraints.

### Upcoming Milestones
- Advanced compilation services in the cloud.
- Extended library management system for Arduino libraries.
- Enhanced circuit validation engine for real-time wiring checks.

---

Built for developers who want to focus on their hardware, not their toolchain.
---
Made by: Javier G. Siliacay
