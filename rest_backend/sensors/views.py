from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import Animal, SensorReading, RFIDEvent
from .serializers import (
    AnimalSerializer,
    SensorReadingSerializer,
    SensorReadingCreateSerializer,
    RFIDEventSerializer,
)


class AnimalViewSet(viewsets.ModelViewSet):
    """ViewSet for Animal CRUD operations"""
    queryset = Animal.objects.all()
    serializer_class = AnimalSerializer
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['get'])
    def by_rfid(self, request):
        """Get animal by RFID tag: GET /api/iot/animals/by_rfid/?rfid=<tag>"""
        rfid_tag = request.query_params.get('rfid')
        if not rfid_tag:
            return Response(
                {'error': 'RFID tag parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            animal = Animal.objects.get(rfid_tag=rfid_tag)
            serializer = self.get_serializer(animal)
            return Response(serializer.data)
        except Animal.DoesNotExist:
            return Response(
                {'error': 'Animal not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class SensorReadingViewSet(viewsets.ModelViewSet):
    """ViewSet for SensorReading operations"""
    queryset = SensorReading.objects.select_related('animal').all()
    permission_classes = [AllowAny]
    
    def get_serializer_class(self):
        """Use different serializers for create vs retrieve"""
        if self.action == 'create':
            return SensorReadingCreateSerializer
        return SensorReadingSerializer
    
    def create(self, request, *args, **kwargs):
        """ESP32 submits sensor data: POST /api/iot/sensors/"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Return full details with animal info
        reading = SensorReading.objects.select_related('animal').get(pk=serializer.instance.pk)
        return_serializer = SensorReadingSerializer(reading)
        
        # Broadcast to WebSocket clients
        channel_layer = get_channel_layer()
        print(f"🔴 Broadcasting sensor data to WebSocket group 'sensors_realtime'")
        print(f"   Data: {return_serializer.data}")
        async_to_sync(channel_layer.group_send)(
            'sensors_realtime',
            {
                'type': 'sensor_update',
                'data': return_serializer.data
            }
        )
        print(f"✅ Broadcast complete")
        
        return Response(
            return_serializer.data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=False, methods=['get'])
    def latest(self, request):
        """
        Get latest sensor readings for all animals or specific RFID
        GET /api/iot/sensors/latest/
        GET /api/iot/sensors/latest/?rfid=<tag>
        GET /api/iot/sensors/latest/?limit=10
        """
        rfid_tag = request.query_params.get('rfid')
        limit = int(request.query_params.get('limit', 50))
        
        queryset = SensorReading.objects.select_related('animal')
        
        if rfid_tag:
            queryset = queryset.filter(rfid_tag=rfid_tag)
        
        readings = queryset[:limit]
        serializer = SensorReadingSerializer(readings, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_animal(self, request):
        """
        Get sensor readings for a specific animal
        GET /api/iot/sensors/by_animal/?animal_id=<id>
        GET /api/iot/sensors/by_animal/?rfid=<tag>
        """
        animal_id = request.query_params.get('animal_id')
        rfid_tag = request.query_params.get('rfid')
        
        if not animal_id and not rfid_tag:
            return Response(
                {'error': 'Either animal_id or rfid parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = SensorReading.objects.select_related('animal')
        
        if animal_id:
            queryset = queryset.filter(animal_id=animal_id)
        elif rfid_tag:
            queryset = queryset.filter(rfid_tag=rfid_tag)
        
        serializer = SensorReadingSerializer(queryset, many=True)
        return Response(serializer.data)


class RFIDEventViewSet(viewsets.ModelViewSet):
    """ViewSet for RFID scan events"""
    queryset = RFIDEvent.objects.select_related('animal').all()
    serializer_class = RFIDEventSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        """Log RFID scan event: POST /api/iot/rfid/"""
        rfid_tag = request.data.get('rfid_tag')
        
        # Try to link to animal
        animal = None
        if rfid_tag:
            try:
                animal = Animal.objects.get(rfid_tag=rfid_tag)
            except Animal.DoesNotExist:
                pass
        
        event = RFIDEvent.objects.create(
            rfid_tag=rfid_tag,
            animal=animal,
            reader_id=request.data.get('reader_id', ''),
        )
        
        serializer = self.get_serializer(event)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
def health_check(request):
    """Health check endpoint for IoT API"""
    return Response({
        'status': 'healthy',
        'service': 'IoT Sensor API',
        'timestamp': timezone.now(),
    })


@api_view(['POST'])
def bulk_sensor_data(request):
    """
    Accept bulk sensor data from ESP32
    POST /api/iot/sensors/bulk/
    Body: [
        {"rfid_tag": "...", "temperature": 36.5, ...},
        {"rfid_tag": "...", "temperature": 37.2, ...}
    ]
    """
    if not isinstance(request.data, list):
        return Response(
            {'error': 'Expected a list of sensor readings'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    created_readings = []
    errors = []
    
    for idx, reading_data in enumerate(request.data):
        serializer = SensorReadingCreateSerializer(data=reading_data)
        if serializer.is_valid():
            serializer.save()
            created_readings.append(serializer.data)
        else:
            errors.append({
                'index': idx,
                'errors': serializer.errors
            })
    
    return Response({
        'created': len(created_readings),
        'failed': len(errors),
        'readings': created_readings,
        'errors': errors,
    }, status=status.HTTP_201_CREATED if created_readings else status.HTTP_400_BAD_REQUEST)
