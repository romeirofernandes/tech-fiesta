"""
Serial Bridge Script for ESP32 IoT Device
Reads sensor data from ESP32 via Serial and sends to Django REST API
Django handles WebSocket broadcasting via Channels
"""

import serial
import serial.tools.list_ports
import requests
import time
import re
from datetime import datetime


class ESP32Bridge:
    def __init__(self, port=None, baudrate=115200, api_base_url="http://127.0.0.1:8000/api/iot"):
        """
        Initialize the ESP32 Serial Bridge
        
        Args:
            port: COM port (e.g., 'COM3' on Windows, '/dev/ttyUSB0' on Linux)
            baudrate: Serial baudrate (default: 115200)
            api_base_url: Django API base URL
        """
        self.port = port
        self.baudrate = baudrate
        self.api_base_url = api_base_url
        self.serial_conn = None
        
        # Current state
        self.current_rfid = None
        self.current_temperature = None
        self.current_humidity = None
        self.current_heart_rate = None
        self.last_sensor_post = 0
        self.sensor_post_interval = 5  # Post sensor data every 5 seconds
        
    def list_ports(self):
        """List available COM ports"""
        ports = serial.tools.list_ports.comports()
        print("\n=== Available COM Ports ===")
        for i, port in enumerate(ports):
            print(f"{i+1}. {port.device} - {port.description}")
        return [port.device for port in ports]
    
    def connect(self):
        """Connect to ESP32 via Serial"""
        if not self.port:
            ports = self.list_ports()
            if not ports:
                print("❌ No COM ports found!")
                return False
            
            # Auto-select if only one port
            if len(ports) == 1:
                self.port = ports[0]
                print(f"\n✅ Auto-selected port: {self.port}")
            else:
                # Ask user to select
                choice = input("\nSelect port number: ")
                try:
                    self.port = ports[int(choice) - 1]
                except (ValueError, IndexError):
                    print("❌ Invalid selection")
                    return False
        
        try:
            self.serial_conn = serial.Serial(self.port, self.baudrate, timeout=1)
            print(f"✅ Connected to {self.port} at {self.baudrate} baud")
            time.sleep(2)  # Wait for Arduino to reset
            return True
        except serial.SerialException as e:
            print(f"❌ Failed to connect: {e}")
            return False
    
    def parse_line(self, line):
        """Parse a line of serial data"""
        line = line.strip()
        
        # Detect RFID card
        if ">>> RFID Card Detected! UID:" in line:
            # Extract UID from the line
            # Format: ">>> RFID Card Detected! UID:  04 3A 2B 1C"
            uid_part = line.split("UID:")[-1].strip()
            # Remove spaces and convert to lowercase
            uid = uid_part.replace(" ", "").lower()
            self.handle_rfid_detected(uid)
            
        # Detect new card (user switch)
        elif "New card detected! Switching user..." in line:
            print("\n🔄 USER SWITCH DETECTED - Waiting for new RFID UID...")
            self.current_rfid = None
            self.reset_sensor_data()
            
        # Parse temperature
        elif "Temperature:" in line and "°C" in line:
            # Format: "Temperature: 36.5 °C / 97.7 °F"
            match = re.search(r'Temperature:\s+([\d.]+)\s+°C', line)
            if match:
                self.current_temperature = float(match.group(1))
                print(f"🌡️  Temperature: {self.current_temperature}°C")
                
        # Parse humidity
        elif "Humidity:" in line and "%" in line:
            # Format: "Humidity: 65.0 %"
            match = re.search(r'Humidity:\s+([\d.]+)\s+%', line)
            if match:
                self.current_humidity = float(match.group(1))
                print(f"💧 Humidity: {self.current_humidity}%")
                
        # Parse heart rate (average BPM)
        elif "Avg BPM:" in line:
            # Format: "BPM: 72.0 | Avg BPM: 70"
            match = re.search(r'Avg BPM:\s+([\d]+)', line)
            if match:
                self.current_heart_rate = int(match.group(1))
                print(f"❤️  Heart Rate: {self.current_heart_rate} BPM")
                
        # Check if we should post sensor data
        self.check_and_post_sensor_data()
    
    def handle_rfid_detected(self, uid):
        """Handle RFID card detection"""
        print(f"\n📇 RFID DETECTED: {uid}")
        self.current_rfid = uid
        self.reset_sensor_data()
        
        # Post RFID event to Django
        self.post_rfid_event(uid)
    
    def reset_sensor_data(self):
        """Reset sensor data when switching users"""
        self.current_temperature = None
        self.current_humidity = None
        self.current_heart_rate = None
        self.last_sensor_post = 0
    
    def post_rfid_event(self, rfid_tag):
        """Post RFID scan event to Django API"""
        url = f"{self.api_base_url}/rfid/"
        data = {
            "rfid_tag": rfid_tag,
            "reader_id": "ESP32-001"
        }
        
        try:
            response = requests.post(url, json=data, timeout=5)
            if response.status_code == 201:
                print(f"✅ RFID event posted successfully")
                resp_data = response.json()
                if resp_data.get('animal_name'):
                    print(f"   Linked to animal: {resp_data['animal_name']}")
            else:
                print(f"⚠️  RFID post failed: {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"❌ Error posting RFID event: {e}")
    
    def check_and_post_sensor_data(self):
        """Check if we have enough data and should post to API"""
        # Only post if we have an RFID and at least one sensor value
        if not self.current_rfid:
            return
        
        # Check if enough time has passed since last post
        current_time = time.time()
        if current_time - self.last_sensor_post < self.sensor_post_interval:
            return
        
        # Check if we have any sensor data
        has_data = any([
            self.current_temperature is not None,
            self.current_humidity is not None,
            self.current_heart_rate is not None
        ])
        
        if has_data:
            self.post_sensor_data()
            self.last_sensor_post = current_time
    
    def post_sensor_data(self):
        """Post sensor readings to Django API (Django handles WebSocket broadcast)"""
        url = f"{self.api_base_url}/sensors/"
        data = {
            "rfid_tag": self.current_rfid,
            "device_id": "ESP32-001"
        }
        
        # Add available sensor data
        if self.current_temperature is not None:
            data["temperature"] = self.current_temperature
        if self.current_humidity is not None:
            data["humidity"] = self.current_humidity
        if self.current_heart_rate is not None:
            data["heart_rate"] = self.current_heart_rate
        
        try:
            response = requests.post(url, json=data, timeout=5)
            if response.status_code == 201:
                print(f"\n✅ SENSOR DATA POSTED & BROADCAST VIA WEBSOCKET")
                print(f"   RFID: {self.current_rfid}")
                if self.current_temperature:
                    print(f"   Temperature: {self.current_temperature}°C")
                if self.current_humidity:
                    print(f"   Humidity: {self.current_humidity}%")
                if self.current_heart_rate:
                    print(f"   Heart Rate: {self.current_heart_rate} BPM")
                print()
            else:
                print(f"⚠️  Sensor data post failed: {response.status_code}")
                print(f"   Response: {response.text}")
        except requests.exceptions.RequestException as e:
            print(f"❌ Error posting sensor data: {e}")
    
    def run(self):
        """Main loop to read serial data"""
        if not self.serial_conn:
            if not self.connect():
                return
        
        print("\n" + "="*60)
        print("ESP32 ⟷  Django Bridge Running")
        print("="*60)
        print(f"📡 Serial Port: {self.port}")
        print(f"🌐 API URL: {self.api_base_url}")
        print(f"⏱️  Sensor post interval: {self.sensor_post_interval}s")
        print(f"💡 Django broadcasts to WebSocket clients automatically")
        print("="*60)
        print("\n👂 Listening for serial data... (Press Ctrl+C to stop)\n")
        
        try:
            while True:
                if self.serial_conn.in_waiting > 0:
                    try:
                        line = self.serial_conn.readline().decode('utf-8', errors='ignore')
                        if line.strip():
                            self.parse_line(line)
                    except UnicodeDecodeError:
                        pass
                time.sleep(0.01)  # Small delay to prevent CPU overuse
                
        except KeyboardInterrupt:
            print("\n\n⏹️  Bridge stopped by user")
        finally:
            if self.serial_conn:
                self.serial_conn.close()
                print(f"🔌 Disconnected from {self.port}")


def main():
    """Main entry point"""
    print("="*60)
    print("ESP32 to Django REST API Bridge")
    print("="*60)
    
    # You can hardcode your port here if you know it
    # For example: port = "COM3" (Windows) or port = "/dev/ttyUSB0" (Linux)
    port = None  # Will auto-detect or ask user
    
    # Initialize bridge
    bridge = ESP32Bridge(
        port=port,
        baudrate=115200,
        api_base_url="http://127.0.0.1:8080/api/iot"
    )
    
    # Run the bridge
    bridge.run()


if __name__ == "__main__":
    main()