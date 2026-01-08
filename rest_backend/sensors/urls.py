from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Create a router for ViewSets
router = DefaultRouter()
router.register(r'animals', views.AnimalViewSet, basename='animal')
router.register(r'sensors', views.SensorReadingViewSet, basename='sensor')
router.register(r'rfid', views.RFIDEventViewSet, basename='rfid')

urlpatterns = [
    # Health check
    path('health/', views.health_check, name='health-check'),
    
    # Bulk sensor data submission
    path('sensors/bulk/', views.bulk_sensor_data, name='bulk-sensor-data'),
    
    # Include router URLs
    path('', include(router.urls)),
]
