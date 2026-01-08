from rest_framework import serializers
from .models import Animal, SensorReading, RFIDEvent


class AnimalSerializer(serializers.ModelSerializer):
    """Serializer for Animal model"""
    
    class Meta:
        model = Animal
        fields = [
            'id',
            'rfid_tag',
            'name',
            'species',
            'breed',
            'date_of_birth',
            'weight',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class SensorReadingSerializer(serializers.ModelSerializer):
    """Serializer for SensorReading model - used for ESP32 data submission"""
    animal_name = serializers.CharField(source='animal.name', read_only=True)
    animal_species = serializers.CharField(source='animal.species', read_only=True)
    
    class Meta:
        model = SensorReading
        fields = [
            'id',
            'animal',
            'animal_name',
            'animal_species',
            'rfid_tag',
            'temperature',
            'humidity',
            'heart_rate',
            'sensor_type',
            'device_id',
            'timestamp',
            'created_at',
        ]
        read_only_fields = ['id', 'animal', 'created_at', 'animal_name', 'animal_species']
    
    def validate(self, data):
        """Validate that at least one sensor value is provided"""
        if not any([
            data.get('temperature'),
            data.get('humidity'),
            data.get('heart_rate')
        ]):
            raise serializers.ValidationError(
                "At least one sensor value (temperature, humidity, or heart_rate) must be provided."
            )
        return data


class SensorReadingCreateSerializer(serializers.ModelSerializer):
    """Simplified serializer for ESP32 to submit sensor data"""
    
    class Meta:
        model = SensorReading
        fields = [
            'rfid_tag',
            'temperature',
            'humidity',
            'heart_rate',
            'device_id',
            'timestamp',
        ]
    
    def create(self, validated_data):
        """Auto-link to animal based on RFID tag"""
        rfid_tag = validated_data.get('rfid_tag')
        
        # Try to link to existing animal
        try:
            animal = Animal.objects.get(rfid_tag=rfid_tag)
            validated_data['animal'] = animal
        except Animal.DoesNotExist:
            # Create a new animal if RFID tag is not found
            animal = Animal.objects.create(
                rfid_tag=rfid_tag,
                name=f"Animal-{rfid_tag[:8]}"
            )
            validated_data['animal'] = animal
        
        return super().create(validated_data)


class RFIDEventSerializer(serializers.ModelSerializer):
    """Serializer for RFID scan events"""
    animal_name = serializers.CharField(source='animal.name', read_only=True)
    
    class Meta:
        model = RFIDEvent
        fields = [
            'id',
            'rfid_tag',
            'animal',
            'animal_name',
            'reader_id',
            'timestamp',
        ]
        read_only_fields = ['id', 'animal', 'animal_name']
