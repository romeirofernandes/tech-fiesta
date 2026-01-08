from django.db import models
from django.utils import timezone


class Animal(models.Model):
    """Model to store animal information linked to RFID tags"""
    rfid_tag = models.CharField(max_length=50, unique=True, db_index=True, help_text="Unique RFID tag identifier")
    name = models.CharField(max_length=100, blank=True, help_text="Animal name")
    species = models.CharField(max_length=50, blank=True, help_text="Animal species (e.g., Cow, Goat, Sheep)")
    breed = models.CharField(max_length=50, blank=True, help_text="Animal breed")
    date_of_birth = models.DateField(null=True, blank=True, help_text="Animal date of birth")
    weight = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, help_text="Weight in kg")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Animal'
        verbose_name_plural = 'Animals'
    
    def __str__(self):
        return f"{self.name or 'Unnamed'} ({self.rfid_tag})"


class SensorReading(models.Model):
    """Model to store real-time sensor readings from ESP32"""
    SENSOR_TYPE_CHOICES = [
        ('TEMP', 'Temperature'),
        ('HUMID', 'Humidity'),
        ('HR', 'Heart Rate'),
        ('COMBINED', 'Combined Reading'),
    ]
    
    animal = models.ForeignKey(Animal, on_delete=models.CASCADE, related_name='sensor_readings', null=True, blank=True)
    rfid_tag = models.CharField(max_length=50, db_index=True, help_text="RFID tag from ESP32")
    
    # DHT11 Sensor Data
    temperature = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Temperature in °C")
    humidity = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Humidity in %")
    
    # MAX30102 Sensor Data
    heart_rate = models.IntegerField(null=True, blank=True, help_text="Heart rate in BPM")
    
    # Metadata
    sensor_type = models.CharField(max_length=10, choices=SENSOR_TYPE_CHOICES, default='COMBINED')
    device_id = models.CharField(max_length=50, blank=True, help_text="ESP32 device identifier")
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Sensor Reading'
        verbose_name_plural = 'Sensor Readings'
        indexes = [
            models.Index(fields=['-timestamp', 'rfid_tag']),
            models.Index(fields=['animal', '-timestamp']),
        ]
    
    def __str__(self):
        return f"Reading for {self.rfid_tag} at {self.timestamp}"
    
    def save(self, *args, **kwargs):
        # Auto-link to animal if not already linked
        if not self.animal and self.rfid_tag:
            try:
                self.animal = Animal.objects.get(rfid_tag=self.rfid_tag)
            except Animal.DoesNotExist:
                pass
        super().save(*args, **kwargs)


class RFIDEvent(models.Model):
    """Model to log RFID scan events"""
    rfid_tag = models.CharField(max_length=50, db_index=True)
    animal = models.ForeignKey(Animal, on_delete=models.SET_NULL, null=True, blank=True, related_name='rfid_events')
    reader_id = models.CharField(max_length=50, blank=True, help_text="RFID reader/gate identifier")
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'RFID Event'
        verbose_name_plural = 'RFID Events'
    
    def __str__(self):
        return f"RFID {self.rfid_tag} at {self.timestamp}"
