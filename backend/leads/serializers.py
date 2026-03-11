"""
Serializers for lead management API.
"""
from rest_framework import serializers
from .models import QALead, ProductionLead, PostCallSummary


class QALeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = QALead
        fields = '__all__'


class ProductionLeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductionLead
        fields = '__all__'
        read_only_fields = ['standardized_phone', 'call_triggered', 'call_id']


class PostCallSummarySerializer(serializers.ModelSerializer):
    lead_details = ProductionLeadSerializer(source='lead', read_only=True)
    
    class Meta:
        model = PostCallSummary
        fields = '__all__'


class LeadMigrationSerializer(serializers.Serializer):
    """Serializer for migrating leads from QA to Production"""
    qa_lead_ids = serializers.ListField(
        child=serializers.IntegerField(),
        allow_empty=False
    )
