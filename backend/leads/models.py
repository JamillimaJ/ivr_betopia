"""
Database models for lead management.
"""
from django.db import models
from django.utils import timezone


class QALead(models.Model):
    """QA Database - Stores leads before production approval"""
    name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField()
    company_name = models.CharField(max_length=255)
    role = models.CharField(max_length=255)
    request = models.TextField()
    company_size = models.CharField(max_length=50)
    submitted_at = models.DateTimeField(default=timezone.now)
    form_mode = models.CharField(max_length=10, default='test')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'qa_leads'
        ordering = ['-submitted_at']

    def __str__(self):
        return f"{self.name} - {self.company_name}"


class ProductionLead(models.Model):
    """Production Database - Approved leads ready for calling"""
    CALL_TYPE_CHOICES = [
        ('outbound', 'Outbound'),
        ('inbound', 'Inbound'),
    ]
    
    name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20)
    email = models.EmailField()
    company_name = models.CharField(max_length=255)
    role = models.CharField(max_length=255)
    request = models.TextField()
    company_size = models.CharField(max_length=50)
    submitted_at = models.DateTimeField()
    standardized_phone = models.CharField(max_length=20, blank=True, null=True)
    call_triggered = models.BooleanField(default=False)
    call_id = models.CharField(max_length=255, blank=True, null=True)
    call_type = models.CharField(max_length=10, choices=CALL_TYPE_CHOICES, default='outbound')
    call_status = models.CharField(max_length=20, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'production_leads'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} - {self.standardized_phone}"


class PostCallSummary(models.Model):
    """Post-Call Database - Stores call results and lead qualification data"""
    STATUS_CHOICES = [
        ('complete', 'Complete'),
        ('voicemail', 'Voicemail'),
        ('call_back', 'Call Back'),
        ('incorrect_phone', 'Incorrect Phone'),
        ('failed', 'Failed'),
    ]

    lead = models.OneToOneField(
        ProductionLead, 
        on_delete=models.CASCADE, 
        related_name='call_summary'
    )
    date = models.DateTimeField(default=timezone.now)
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    company = models.CharField(max_length=255)
    role = models.CharField(max_length=255)
    request = models.TextField()
    company_size = models.CharField(max_length=50)

    # Inbound caller info parsed from structured outputs (inbound calls only)
    caller_name = models.CharField(max_length=255, blank=True, null=True)
    caller_email = models.EmailField(blank=True, null=True)
    caller_company = models.CharField(max_length=255, blank=True, null=True)
    caller_role = models.CharField(max_length=255, blank=True, null=True)
    caller_company_size = models.CharField(max_length=50, blank=True, null=True)
    
    # Call conversation summary
    conv_summary = models.TextField(blank=True, null=True)
    
    # Qualification fields
    service_interest = models.TextField(blank=True, null=True)
    motivation = models.TextField(blank=True, null=True)
    urgency = models.TextField(blank=True, null=True)
    past_experience = models.TextField(blank=True, null=True)
    budget = models.TextField(blank=True, null=True)
    intent = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='complete')
    
    # Call metadata
    call_type = models.CharField(max_length=10, default='outbound')
    call_duration = models.IntegerField(blank=True, null=True)  # in seconds
    ended_reason = models.CharField(max_length=50, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'post_call_summaries'
        ordering = ['-date']

    def __str__(self):
        return f"{self.name} - {self.status}"
