from django.contrib import admin
from .models import InventoryItem, InventoryLog

admin.site.register(InventoryItem)
admin.site.register(InventoryLog)
