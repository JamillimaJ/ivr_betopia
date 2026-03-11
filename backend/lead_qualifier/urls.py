"""
URL configuration for lead_qualifier project.
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('leads.urls')),
]
