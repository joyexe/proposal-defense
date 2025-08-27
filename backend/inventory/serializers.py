from rest_framework import serializers
from .models import InventoryItem, InventoryLog

class InventoryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryItem
        fields = '__all__'

class InventoryLogSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    logged_by_username = serializers.CharField(source='logged_by.username', read_only=True)
    logged_by_name = serializers.SerializerMethodField()

    class Meta:
        model = InventoryLog
        fields = '__all__'

    def get_logged_by_name(self, obj):
        if obj.logged_by:
            role = getattr(obj.logged_by, 'role', 'Nurse')
            # Map 'clinic' to 'Nurse' for display
            if role.lower() == 'clinic':
                role = 'Nurse'
            full_name = getattr(obj.logged_by, 'full_name', None)
            if not full_name:
                # fallback to first_name + last_name or username
                first = getattr(obj.logged_by, 'first_name', '')
                last = getattr(obj.logged_by, 'last_name', '')
                full_name = (first + ' ' + last).strip() or obj.logged_by.username
            return f"{role} {full_name}".strip()
        return '' 