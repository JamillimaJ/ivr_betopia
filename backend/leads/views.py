"""
REST API views for lead management.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db import transaction
from django.utils import timezone
from .models import QALead, ProductionLead, PostCallSummary
from .structured_outputs_loader import get_structured_outputs_loader
from .serializers import (
    QALeadSerializer, 
    ProductionLeadSerializer, 
    PostCallSummarySerializer,
    LeadMigrationSerializer
)
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../../service'))
from vapi_service import VAPIService
from phone_service import PhoneService


class QALeadViewSet(viewsets.ModelViewSet):
    """
    ViewSet for QA Leads - supports full CRUD operations
    """
    queryset = QALead.objects.all()
    serializer_class = QALeadSerializer

    @action(detail=False, methods=['post'])
    def migrate_to_production(self, request):
        """
        Migrate selected leads from QA to Production and trigger calls
        """
        serializer = LeadMigrationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        qa_lead_ids = serializer.validated_data['qa_lead_ids']
        qa_leads = QALead.objects.filter(id__in=qa_lead_ids)
        
        if not qa_leads.exists():
            return Response(
                {'error': 'No leads found with provided IDs'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        migrated_leads = []
        failed_leads = []
        
        for qa_lead in qa_leads:
            try:
                with transaction.atomic():
                    # Standardize phone number
                    standardized_phone = PhoneService.standardize_phone(
                        str(qa_lead.phone_number)
                    )
                    
                    # Check if phone is valid
                    if standardized_phone == 'incorrect format':
                        failed_leads.append({
                            'id': qa_lead.id,
                            'name': qa_lead.name,
                            'reason': 'Invalid phone number format'
                        })
                        continue
                    
                    # Create production lead
                    prod_lead = ProductionLead.objects.create(
                        name=qa_lead.name,
                        phone_number=qa_lead.phone_number,
                        email=qa_lead.email,
                        company_name=qa_lead.company_name,
                        role=qa_lead.role,
                        request=qa_lead.request,
                        company_size=qa_lead.company_size,
                        submitted_at=qa_lead.submitted_at,
                        standardized_phone=standardized_phone
                    )
                    
                    # Trigger VAPI call
                    vapi_service = VAPIService()
                    call_response = vapi_service.create_call(
                        phone_number=standardized_phone,
                        lead_name=qa_lead.name,
                        company_name=qa_lead.company_name,
                        request=qa_lead.request
                    )
                    
                    # DEBUG: Log call response
                    import json
                    import logging
                    logger = logging.getLogger('django')
                    logger.info("=" * 80)
                    logger.info(f"[MIGRATION] Lead: {qa_lead.name}")
                    logger.info(f"[MIGRATION] Phone: {standardized_phone}")
                    logger.info(f"[MIGRATION] Call Response: {json.dumps(call_response, indent=2)}")
                    logger.info("=" * 80)
                    
                    if call_response.get('success'):
                        prod_lead.call_triggered = True
                        prod_lead.call_id = call_response.get('call_id')
                        prod_lead.save()
                        
                        migrated_leads.append({
                            'id': prod_lead.id,
                            'name': prod_lead.name,
                            'call_id': prod_lead.call_id
                        })
                    else:
                        # Rollback production lead creation if call fails
                        prod_lead.delete()
                        failed_leads.append({
                            'id': qa_lead.id,
                            'name': qa_lead.name,
                            'reason': call_response.get('error', 'Call creation failed')
                        })
                        
            except Exception as e:
                import traceback
                error_detail = f"{str(e)}\n{traceback.format_exc()}"
                print(f"Migration error for lead {qa_lead.id}: {error_detail}")
                failed_leads.append({
                    'id': qa_lead.id,
                    'name': qa_lead.name,
                    'reason': str(e)
                })
        
        return Response({
            'migrated': migrated_leads,
            'failed': failed_leads,
            'total_migrated': len(migrated_leads),
            'total_failed': len(failed_leads)
        }, status=status.HTTP_200_OK)


class ProductionLeadViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Production Leads - read and update operations
    """
    queryset = ProductionLead.objects.all()
    serializer_class = ProductionLeadSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        call_type_filter = self.request.query_params.get('call_type', None)
        if call_type_filter:
            queryset = queryset.filter(call_type=call_type_filter)
        return queryset

    @action(detail=True, methods=['post'])
    def check_call_status(self, request, pk=None):
        """
        Check the status of a call and update if completed
        """
        lead = self.get_object()
        
        if not lead.call_id:
            return Response(
                {'error': 'No call ID associated with this lead'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        vapi_service = VAPIService()
        call_details = vapi_service.get_call_details(lead.call_id)
        
        if not call_details.get('success'):
            return Response(
                {'error': call_details.get('error', 'Failed to fetch call details')},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        call_data = call_details.get('data', {})
        
        # Check if call has ended
        if call_data.get('status') == 'ended':
            # Create or update post-call summary
            self._create_post_call_summary(lead, call_data)
            
            return Response({
                'status': 'completed',
                'call_data': call_data
            })
        
        return Response({
            'status': call_data.get('status', 'in-progress'),
            'call_data': call_data
        })
    
    def _create_post_call_summary(self, lead, call_data):
        """
        Create post-call summary from call data
        """
        artifact = call_data.get('artifact', {})
        structured_outputs = artifact.get('structuredOutputs', {})
        
        # DEBUG: Log structured outputs
        print(f"[DEBUG] _create_post_call_summary - Structured Outputs: {structured_outputs}")
        
        # Determine status
        ended_reason = call_data.get('endedReason', '')
        if ended_reason == 'voicemail':
            call_status = 'voicemail'
        else:
            call_status = 'complete'
        
        # Helper function to extract structured output
        def extract_output(field_name, *uuids):
            for uuid in uuids:
                if uuid in structured_outputs:
                    result = structured_outputs[uuid].get('result')
                    if result and result != 'N/A':
                        return result
            field_name_norm = field_name.lower().replace('_', ' ')
            for key, value in structured_outputs.items():
                if isinstance(value, dict):
                    name = value.get('name', '').lower()
                    if field_name_norm in name:
                        result = value.get('result')
                        if result:
                            return result
            return 'N/A'
        
        # Load structured output IDs from config
        loader = get_structured_outputs_loader()
        
        # Extract structured data using dynamically loaded IDs
        service_interest = extract_output('service_interest', loader.get_id('service_interest'))
        motivation = extract_output('motivation', loader.get_id('motivation'))
        urgency = extract_output('urgency', loader.get_id('urgency'))
        past_experience = extract_output('past_experience', loader.get_id('past_experience'))
        budget = extract_output('budget', loader.get_id('budget'))
        intent = extract_output('intent', loader.get_id('intent'))
        
        # Get conversation transcript
        conv_summary = artifact.get('transcript', '')
        
        PostCallSummary.objects.update_or_create(
            lead=lead,
            defaults={
                'name': lead.name,
                'phone': lead.standardized_phone,
                'email': lead.email,
                'company': lead.company_name,
                'role': lead.role,
                'request': lead.request,
                'company_size': lead.company_size,
                'conv_summary': conv_summary,
                'service_interest': service_interest,
                'motivation': motivation,
                'urgency': urgency,
                'past_experience': past_experience,
                'budget': budget,
                'intent': intent,
                'status': call_status,
                'call_type': lead.call_type or 'outbound',
                'call_duration': call_data.get('duration'),
                'ended_reason': ended_reason
            }
        )


class PostCallSummaryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Post-Call Summaries - includes delete operations
    """
    queryset = PostCallSummary.objects.all()
    serializer_class = PostCallSummarySerializer
    http_method_names = ['get', 'delete', 'head', 'options']  # Read and Delete only

    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by status
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by call type
        call_type_filter = self.request.query_params.get('call_type', None)
        if call_type_filter:
            queryset = queryset.filter(call_type=call_type_filter)
        
        return queryset


@api_view(['POST'])
@permission_classes([AllowAny])
def vapi_webhook(request):
    """
    Webhook endpoint for Vapi call events
    Handles both inbound and outbound call completion events
    """
    try:
        payload = request.data
        
        # Get event type
        event_type = payload.get('message', {}).get('type')
        
        # We're interested in 'end-of-call-report' events
        if event_type != 'end-of-call-report':
            return Response({'status': 'ignored'}, status=status.HTTP_200_OK)
        
        call_data = payload.get('message', {}).get('call', {})
        call_id = call_data.get('id')
        
        if not call_id:
            return Response({'error': 'No call ID in webhook payload'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Determine if this is an inbound or outbound call
        call_type = call_data.get('type', 'outbound')  # Vapi sends 'inboundPhoneCall' or 'outboundPhoneCall'
        if call_type == 'inboundPhoneCall':
            call_type = 'inbound'
        else:
            call_type = 'outbound'
        
        # Get customer phone number
        customer_data = call_data.get('customer', {})
        customer_phone = customer_data.get('number', '')
        
        # Standardize phone
        standardized_phone = PhoneService.standardize_phone(customer_phone)
        
        # Try to find existing production lead by call_id
        try:
            production_lead = ProductionLead.objects.get(call_id=call_id)
        except ProductionLead.DoesNotExist:
            # For inbound calls, create a new lead if it doesn't exist
            if call_type == 'inbound':
                production_lead = ProductionLead.objects.create(
                    name='Inbound Caller',  # Default name, will be updated from call data if available
                    phone_number=customer_phone,
                    email='',  # Will be populated if captured during call
                    company_name='Unknown',
                    role='Unknown',
                    request='Inbound call inquiry',
                    company_size='Unknown',
                    submitted_at=timezone.now(),
                    standardized_phone=standardized_phone,
                    call_triggered=True,
                    call_id=call_id,
                    call_type='inbound'
                )
            else:
                # Outbound call without a lead record - log and skip
                return Response({
                    'status': 'skipped',
                    'reason': 'Outbound call without existing lead record'
                }, status=status.HTTP_200_OK)
        
        # Update call_type if not set
        if not production_lead.call_type or production_lead.call_type == 'outbound':
            production_lead.call_type = call_type
            production_lead.save()
        
        # Extract call details
        artifact = call_data.get('artifact', {})
        structured_outputs = artifact.get('structuredOutputs', {})
        
        # DEBUG: Log structured outputs to see what Vapi is sending
        print(f"[DEBUG] Structured Outputs Keys: {list(structured_outputs.keys())}")
        print(f"[DEBUG] Full Structured Outputs: {structured_outputs}")
        
        # Determine status
        ended_reason = call_data.get('endedReason', '')
        if ended_reason == 'voicemail':
            call_status = 'voicemail'
        else:
            call_status = 'complete'
        
        # Helper function to extract structured output by name or UUID
        def extract_output(field_name, *uuids):
            """Extract structured output by trying multiple UUIDs or field names"""
            # Try each UUID
            for uuid in uuids:
                if uuid in structured_outputs:
                    result = structured_outputs[uuid].get('result')
                    if result and result != 'N/A':
                        return result
            
            # Try to find by field name (case-insensitive, underscore == space)
            field_name_norm = field_name.lower().replace('_', ' ')
            for key, value in structured_outputs.items():
                if isinstance(value, dict):
                    name = value.get('name', '').lower()
                    if field_name_norm in name:
                        result = value.get('result')
                        if result:
                            return result
            
            return 'N/A'
        
        # Load structured output IDs — use inbound config for inbound calls
        inbound_config = os.getenv('INBOUND_STRUCTURED_OUTPUTS_CONFIG', 'structured_outputs_inbound.json')
        loader = get_structured_outputs_loader(inbound_config if call_type == 'inbound' else None)
        
        # Extract structured data using dynamically loaded IDs
        service_interest = extract_output(
            'service_interest', 
            loader.get_id('service_interest'),
            'service-interest',
            'serviceInterest'
        )
        motivation = extract_output(
            'motivation',
            loader.get_id('motivation')
        )
        urgency = extract_output(
            'urgency',
            loader.get_id('urgency')
        )
        past_experience = extract_output(
            'past_experience',
            loader.get_id('past_experience'),
            'past-experience',
            'pastExperience'
        )
        budget = extract_output(
            'budget',
            loader.get_id('budget')
        )
        intent = extract_output(
            'intent',
            loader.get_id('intent')
        )

        # For inbound calls: extract caller identity from structured outputs
        caller_name = None
        caller_email = None
        caller_company = None
        caller_role = None
        caller_company_size = None

        if call_type == 'inbound':
            caller_name = extract_output('caller_name', loader.get_id('caller_name'))
            caller_email = extract_output('caller_email', loader.get_id('caller_email'))
            caller_company = extract_output('caller_company', loader.get_id('caller_company'))
            caller_role = extract_output('caller_role', loader.get_id('caller_role'))
            caller_company_size = extract_output('caller_company_size', loader.get_id('caller_company_size'))

            # If name was captured, update the production lead placeholder name
            if caller_name and caller_name != 'N/A':
                production_lead.name = caller_name
                production_lead.save()

        # Get conversation transcript
        conv_summary = artifact.get('transcript', '')
        
        # Create or update post-call summary
        PostCallSummary.objects.update_or_create(
            lead=production_lead,
            defaults={
                'name': production_lead.name,
                'phone': production_lead.standardized_phone or customer_phone,
                'email': production_lead.email,
                'company': production_lead.company_name,
                'role': production_lead.role,
                'request': production_lead.request,
                'company_size': production_lead.company_size,
                'conv_summary': conv_summary,
                'service_interest': service_interest,
                'motivation': motivation,
                'urgency': urgency,
                'past_experience': past_experience,
                'budget': budget,
                'intent': intent,
                'status': call_status,
                'call_type': call_type,
                'call_duration': call_data.get('duration'),
                'ended_reason': ended_reason,
                'caller_name': caller_name if call_type == 'inbound' else None,
                'caller_email': caller_email if call_type == 'inbound' else None,
                'caller_company': caller_company if call_type == 'inbound' else None,
                'caller_role': caller_role if call_type == 'inbound' else None,
                'caller_company_size': caller_company_size if call_type == 'inbound' else None,
            }
        )
        
        return Response({
            'status': 'success',
            'message': f'{call_type.capitalize()} call processed successfully',
            'call_id': call_id
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        print(f"Webhook error: {error_detail}")


@api_view(['POST'])
@permission_classes([AllowAny])
def sync_inbound_calls(request):
    """
    Actively pull completed inbound calls from VAPI and create PostCallSummary records.
    Used instead of webhooks when the server URL is not publicly accessible.
    """
    try:
        inbound_assistant_id = os.getenv('VAPI_INBOUND_ASSISTANT_ID', '40855726-e602-42e3-aab3-48152b527f03')
        vapi_service = VAPIService()
        result = vapi_service.list_calls(assistant_id=inbound_assistant_id)

        if not result.get('success'):
            return Response({'error': result.get('error', 'Failed to fetch calls from VAPI')},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        calls = result.get('data', [])
        if isinstance(calls, dict):
            calls = calls.get('results', [])

        loader = get_structured_outputs_loader(
            os.getenv('INBOUND_STRUCTURED_OUTPUTS_CONFIG', 'structured_outputs_inbound.json')
        )
        synced = 0
        skipped = 0

        for call_data in calls:
            call_id = call_data.get('id')
            call_status_vapi = call_data.get('status')

            if call_status_vapi != 'ended':
                skipped += 1
                continue

            customer = call_data.get('customer', {})
            customer_phone = customer.get('number', '')
            customer_name = customer.get('name', '') or 'Inbound Caller'
            standardized_phone = PhoneService.standardize_phone(customer_phone)

            production_lead, _ = ProductionLead.objects.get_or_create(
                call_id=call_id,
                defaults={
                    'name': customer_name,
                    'phone_number': customer_phone,
                    'email': '',
                    'company_name': 'Unknown',
                    'role': 'Unknown',
                    'request': 'Inbound call inquiry',
                    'company_size': 'Unknown',
                    'submitted_at': timezone.now(),
                    'standardized_phone': standardized_phone,
                    'call_triggered': True,
                    'call_type': 'inbound',
                    'call_status': 'ended',
                }
            )

            artifact = call_data.get('artifact', {})
            structured_outputs = artifact.get('structuredOutputs', {})

            def extract_output(field_name, *uuids):
                for uuid in uuids:
                    if uuid in structured_outputs:
                        result = structured_outputs[uuid].get('result')
                        if result and result != 'N/A':
                            return result
                field_name_norm = field_name.lower().replace('_', ' ')
                for key, value in structured_outputs.items():
                    if isinstance(value, dict):
                        name = value.get('name', '').lower()
                        if field_name_norm in name:
                            result = value.get('result')
                            if result:
                                return result
                return 'N/A'

            service_interest = extract_output('service_interest', loader.get_id('service_interest'))
            motivation = extract_output('motivation', loader.get_id('motivation'))
            urgency = extract_output('urgency', loader.get_id('urgency'))
            past_experience = extract_output('past_experience', loader.get_id('past_experience'))
            budget = extract_output('budget', loader.get_id('budget'))
            intent = extract_output('intent', loader.get_id('intent'))

            # Try to extract caller identity from structured outputs (if configured)
            caller_name = extract_output('caller_name', loader.get_id('caller_name'))
            caller_email = extract_output('caller_email', loader.get_id('caller_email'))
            caller_company = extract_output('caller_company', loader.get_id('caller_company'))
            caller_role = extract_output('caller_role', loader.get_id('caller_role'))
            caller_company_size = extract_output('caller_company_size', loader.get_id('caller_company_size'))

            # Fall back to customer object name if no structured output
            if (not caller_name or caller_name == 'N/A') and customer_name != 'Inbound Caller':
                caller_name = customer_name
                production_lead.name = customer_name
                production_lead.save()

            ended_reason = call_data.get('endedReason', '')
            summary_status = 'voicemail' if ended_reason == 'voicemail' else 'complete'
            conv_summary = artifact.get('transcript', '')

            PostCallSummary.objects.update_or_create(
                lead=production_lead,
                defaults={
                    'name': production_lead.name,
                    'phone': standardized_phone or customer_phone,
                    'email': caller_email if caller_email != 'N/A' else '',
                    'company': caller_company if caller_company != 'N/A' else 'Unknown',
                    'role': caller_role if caller_role != 'N/A' else 'Unknown',
                    'request': 'Inbound call inquiry',
                    'company_size': caller_company_size if caller_company_size != 'N/A' else 'Unknown',
                    'conv_summary': conv_summary,
                    'service_interest': service_interest,
                    'motivation': motivation,
                    'urgency': urgency,
                    'past_experience': past_experience,
                    'budget': budget,
                    'intent': intent,
                    'status': summary_status,
                    'call_type': 'inbound',
                    'call_duration': call_data.get('duration'),
                    'ended_reason': ended_reason,
                    'caller_name': caller_name if caller_name != 'N/A' else None,
                    'caller_email': caller_email if caller_email != 'N/A' else None,
                    'caller_company': caller_company if caller_company != 'N/A' else None,
                    'caller_role': caller_role if caller_role != 'N/A' else None,
                    'caller_company_size': caller_company_size if caller_company_size != 'N/A' else None,
                }
            )
            synced += 1

        return Response({
            'synced': synced,
            'skipped': skipped,
            'total': len(calls)
        }, status=status.HTTP_200_OK)

    except Exception as e:
        import traceback
        print(f"sync_inbound_calls error: {traceback.format_exc()}")
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({
            'status': 'error',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def custom_kb_search(request):
    """
    Custom Knowledge Base endpoint for VAPI
    Receives search queries and returns relevant documents
    """
    import time
    start_time = time.time()
    
    try:
        # Import KB search
        from .kb_search import kb_search
        
        # Verify request structure
        message = request.data.get('message')
        
        if not message:
            return Response({
                'error': 'No message provided'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify it's a knowledge base request
        if message.get('type') != 'knowledge-base-request':
            return Response({
                'error': 'Invalid request type'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Extract messages
        messages = message.get('messages', [])
        
        # Get the latest user message
        user_messages = [msg for msg in messages if msg.get('role') == 'user']
        
        if not user_messages:
            return Response({
                'documents': []
            })
        
        latest_query = user_messages[-1].get('content', '')
        
        print(f"[KB SEARCH] Query: {latest_query}", file=sys.stderr, flush=True)
        
        # Perform search
        results = kb_search.search(latest_query, top_k=5)
        
        # Format response for VAPI
        documents = []
        for result in results:
            documents.append({
                'content': result['content'],
                'similarity': result['similarity'],
                'uuid': result['uuid']
            })
        
        elapsed = time.time() - start_time
        print(f"[KB SEARCH] Found {len(documents)} documents in {elapsed:.3f}s", 
              file=sys.stderr, flush=True)
        
        # Return documents for AI processing
        return Response({
            'documents': documents
        })
        
    except Exception as e:
        import traceback
        error_detail = f"{str(e)}\n{traceback.format_exc()}"
        print(f"[KB SEARCH ERROR] {error_detail}", file=sys.stderr, flush=True)
        
        # Return empty documents on error (don't fail the call)
        return Response({
            'documents': [],
            'error': str(e)
        })