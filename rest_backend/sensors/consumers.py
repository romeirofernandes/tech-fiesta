import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import SensorReading, Animal


class SensorDataConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time sensor data streaming.
    
    Usage from client (JavaScript):
    const ws = new WebSocket('ws://localhost:8000/ws/sensors/');
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('Sensor data:', data);
    };
    """
    
    async def connect(self):
        """Handle WebSocket connection"""
        # Join the sensors group
        self.room_group_name = 'sensors_realtime'
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send initial data on connection
        latest_data = await self.get_latest_sensor_data()
        await self.send(text_data=json.dumps({
            'type': 'initial_data',
            'data': latest_data
        }))
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """
        Handle messages from WebSocket client.
        Client can request specific animal data or subscribe to updates.
        """
        try:
            data = json.loads(text_data)
            action = data.get('action')
            
            if action == 'get_latest':
                # Send latest sensor data
                rfid_tag = data.get('rfid_tag')
                latest_data = await self.get_latest_sensor_data(rfid_tag)
                await self.send(text_data=json.dumps({
                    'type': 'sensor_data',
                    'data': latest_data
                }))
            
            elif action == 'subscribe_animal':
                # Subscribe to specific animal updates
                rfid_tag = data.get('rfid_tag')
                if rfid_tag:
                    # Store subscription info (simplified version)
                    await self.send(text_data=json.dumps({
                        'type': 'subscription_confirmed',
                        'rfid_tag': rfid_tag
                    }))
        
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
    
    async def sensor_update(self, event):
        """
        Handle sensor update events from the group.
        This is called when new sensor data is broadcast to the group.
        """
        print(f"🟢 Consumer received sensor_update event: {event.get('data', {}).get('id')}")
        await self.send(text_data=json.dumps({
            'type': 'sensor_update',
            'data': event['data']
        }))
        print(f"📤 Sent sensor_update to WebSocket client")
    
    @database_sync_to_async
    def get_latest_sensor_data(self, rfid_tag=None):
        """Fetch latest sensor readings from database"""
        from django.utils import timezone
        from datetime import timedelta
        
        # Get readings from last 5 minutes
        recent_time = timezone.now() - timedelta(minutes=5)
        
        queryset = SensorReading.objects.select_related('animal').filter(
            timestamp__gte=recent_time
        )
        
        if rfid_tag:
            queryset = queryset.filter(rfid_tag=rfid_tag)
        
        # Get unique RFID tags and their latest readings
        rfid_tags = queryset.values_list('rfid_tag', flat=True).distinct()
        
        latest_readings = []
        for rfid in rfid_tags:
            reading = SensorReading.objects.filter(
                rfid_tag=rfid
            ).select_related('animal').first()
            
            if reading:
                latest_readings.append({
                    'rfid_tag': reading.rfid_tag,
                    'animal_name': reading.animal.name if reading.animal else None,
                    'animal_species': reading.animal.species if reading.animal else None,
                    'temperature': float(reading.temperature) if reading.temperature else None,
                    'humidity': float(reading.humidity) if reading.humidity else None,
                    'heart_rate': reading.heart_rate,
                    'timestamp': reading.timestamp.isoformat(),
                    'device_id': reading.device_id,
                })
        
        return latest_readings


class AnimalSensorConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for specific animal sensor monitoring.
    
    Usage: ws://localhost:8000/ws/sensors/<rfid_tag>/
    """
    
    async def connect(self):
        """Handle WebSocket connection for specific animal"""
        self.rfid_tag = self.scope['url_route']['kwargs']['rfid_tag']
        self.room_group_name = f'animal_{self.rfid_tag}'
        
        # Join animal-specific group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send initial animal data
        animal_data = await self.get_animal_data()
        await self.send(text_data=json.dumps({
            'type': 'connected',
            'rfid_tag': self.rfid_tag,
            'data': animal_data
        }))
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection"""
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        """Handle messages from WebSocket client"""
        try:
            data = json.loads(text_data)
            action = data.get('action')
            
            if action == 'refresh':
                # Send updated animal data
                animal_data = await self.get_animal_data()
                await self.send(text_data=json.dumps({
                    'type': 'sensor_data',
                    'data': animal_data
                }))
        
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON format'
            }))
    
    async def sensor_update(self, event):
        """Handle sensor update broadcast to this animal's group"""
        await self.send(text_data=json.dumps({
            'type': 'sensor_update',
            'data': event['data']
        }))
    
    @database_sync_to_async
    def get_animal_data(self):
        """Fetch animal and its latest sensor data"""
        try:
            animal = Animal.objects.get(rfid_tag=self.rfid_tag)
            
            # Get last 10 sensor readings
            readings = SensorReading.objects.filter(
                rfid_tag=self.rfid_tag
            ).order_by('-timestamp')[:10]
            
            reading_list = []
            for reading in readings:
                reading_list.append({
                    'temperature': float(reading.temperature) if reading.temperature else None,
                    'humidity': float(reading.humidity) if reading.humidity else None,
                    'heart_rate': reading.heart_rate,
                    'timestamp': reading.timestamp.isoformat(),
                })
            
            return {
                'animal': {
                    'name': animal.name,
                    'species': animal.species,
                    'breed': animal.breed,
                    'rfid_tag': animal.rfid_tag,
                },
                'latest_reading': reading_list[0] if reading_list else None,
                'recent_readings': reading_list,
            }
        
        except Animal.DoesNotExist:
            return {
                'error': 'Animal not found',
                'rfid_tag': self.rfid_tag
            }
