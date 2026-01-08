from django.contrib import admin

from .models import Animal, SensorReading, RFIDEvent


@admin.register(Animal)
class AnimalAdmin(admin.ModelAdmin):
    list_display = ['rfid_tag', 'name', 'species', 'breed', 'weight', 'created_at']
    list_filter = ['species', 'breed', 'created_at']
    search_fields = ['rfid_tag', 'name', 'species', 'breed']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(SensorReading)
class SensorReadingAdmin(admin.ModelAdmin):
    list_display = ['rfid_tag', 'animal', 'temperature', 'humidity', 'heart_rate', 'timestamp', 'device_id']
    list_filter = ['sensor_type', 'timestamp', 'device_id']
    search_fields = ['rfid_tag', 'animal__name', 'device_id']
    readonly_fields = ['created_at']
    date_hierarchy = 'timestamp'
    ordering = ['-timestamp']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('animal')


@admin.register(RFIDEvent)
class RFIDEventAdmin(admin.ModelAdmin):
    list_display = ['rfid_tag', 'animal', 'reader_id', 'timestamp']
    list_filter = ['timestamp', 'reader_id']
    search_fields = ['rfid_tag', 'animal__name', 'reader_id']
    date_hierarchy = 'timestamp'
    ordering = ['-timestamp']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('animal')
