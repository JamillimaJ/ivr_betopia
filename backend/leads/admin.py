from django.contrib import admin
from .models import QALead, ProductionLead, PostCallSummary

@admin.register(QALead)
class QALeadAdmin(admin.ModelAdmin):
    list_display = ['name', 'company_name', 'phone_number', 'email', 'submitted_at']
    list_filter = ['company_size', 'form_mode', 'submitted_at']
    search_fields = ['name', 'company_name', 'email', 'phone_number']

@admin.register(ProductionLead)
class ProductionLeadAdmin(admin.ModelAdmin):
    list_display = ['name', 'company_name', 'standardized_phone', 'call_triggered', 'call_id']
    list_filter = ['call_triggered', 'created_at']
    search_fields = ['name', 'company_name', 'email', 'standardized_phone']

@admin.register(PostCallSummary)
class PostCallSummaryAdmin(admin.ModelAdmin):
    list_display = ['name', 'company', 'status', 'intent', 'date']
    list_filter = ['status', 'intent', 'date']
    search_fields = ['name', 'company', 'email', 'phone']
