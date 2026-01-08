from django.urls import re_path
from . import consumers

# WebSocket URL routing
websocket_urlpatterns = [
    # Real-time sensor data for all animals
    re_path(r'ws/sensors/$', consumers.SensorDataConsumer.as_asgi()),
    
    # Real-time sensor data for specific animal by RFID tag
    re_path(r'ws/sensors/(?P<rfid_tag>[^/]+)/$', consumers.AnimalSensorConsumer.as_asgi()),
]
