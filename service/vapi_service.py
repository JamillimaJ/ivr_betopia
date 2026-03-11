"""
VAPI Service - Handles all VAPI API interactions
"""
import requests
import os
from typing import Dict, Optional
import time


class VAPIService:
    """Service class for VAPI API integration"""
    
    def __init__(self):
        self.api_key = os.getenv('VAPI_API_KEY', 'your-vapi-api-key')
        self.assistant_id = os.getenv('VAPI_ASSISTANT_ID', '8ec97164-78fb-4749-9111-1c654578df49')
        self.phone_number_id = os.getenv('VAPI_PHONE_NUMBER_ID', '14cf9d6e-9cde-4ace-8107-02babd052537')
        self.base_url = 'https://api.vapi.ai'
        self.headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
    
    def create_call(
        self, 
        phone_number: str, 
        lead_name: str, 
        company_name: str, 
        request: str
    ) -> Dict:
        """
        Create an outbound call via VAPI
        
        Args:
            phone_number: Standardized phone number with country code
            lead_name: Name of the lead
            company_name: Company name of the lead
            request: Lead's request/inquiry
            
        Returns:
            Dict with 'success' status and 'call_id' or 'error'
        """
        url = f'{self.base_url}/call'
        
        payload = {
            "assistantId": self.assistant_id,
            "phoneNumberId": self.phone_number_id,
            "customers": [
                {
                    "number": phone_number
                }
            ],
            "assistantOverrides": {
                "variableValues": {
                    "lead_name": lead_name,
                    "lead_company_name": company_name,
                    "lead_request": request
                }
            }
        }
        
        try:
            response = requests.post(url, json=payload, headers=self.headers)
            response.raise_for_status()
            
            data = response.json()
            
            # DEBUG: Log successful response
            import json
            import sys
            print(f"[VAPI SUCCESS] Call created successfully", file=sys.stderr, flush=True)
            print(f"  Response: {json.dumps(data, indent=2)}", file=sys.stderr, flush=True)
            
            # VAPI returns an array of call results
            if isinstance(data, dict) and 'results' in data:
                results = data.get('results', [])
                if results and len(results) > 0:
                    call_id = results[0].get('id')
                    call_status = results[0].get('status')
                    print(f"  Call ID: {call_id}, Status: {call_status}", file=sys.stderr, flush=True)
                    return {
                        'success': True,
                        'call_id': call_id,
                        'data': results[0]
                    }
            elif isinstance(data, dict) and 'id' in data:
                call_id = data.get('id')
                call_status = data.get('status')
                print(f"  Call ID: {call_id}, Status: {call_status}", file=sys.stderr, flush=True)
                return {
                    'success': True,
                    'call_id': data.get('id'),
                    'data': data
                }
            
            return {
                'success': False,
                'error': 'No call ID in response'
            }
            
        except requests.exceptions.RequestException as e:
            # Enhanced error logging to capture Vapi API details
            import json
            error_message = str(e)
            
            # Try to extract detailed error from response
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_details = e.response.json()
                    error_message = f"{str(e)} - Details: {json.dumps(error_details)}"
                    print(f"[VAPI ERROR] Call creation failed:", file=sys.stderr, flush=True)
                    print(f"  Payload: {json.dumps(payload, indent=2)}", file=sys.stderr, flush=True)
                    print(f"  Response: {json.dumps(error_details, indent=2)}", file=sys.stderr, flush=True)
                except:
                    pass
            
            return {
                'success': False,
                'error': error_message
            }
    
    def list_calls(self, assistant_id: str = None, limit: int = 100) -> Dict:
        """
        List calls from VAPI, optionally filtered by assistantId.
        Returns ended calls so they can be synced into PostCallSummary.
        """
        url = f'{self.base_url}/call'
        params = {'limit': limit}
        if assistant_id:
            params['assistantId'] = assistant_id

        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return {'success': True, 'data': response.json()}
        except requests.exceptions.RequestException as e:
            return {'success': False, 'error': str(e)}

    def get_call_details(self, call_id: str) -> Dict:
        """
        Get details of a specific call
        
        Args:
            call_id: The VAPI call ID
            
        Returns:
            Dict with 'success' status and 'data' or 'error'
        """
        url = f'{self.base_url}/call/{call_id}'
        
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            
            data = response.json()
            
            return {
                'success': True,
                'data': data
            }
            
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def wait_for_call_completion(
        self, 
        call_id: str, 
        max_wait: int = 300,
        poll_interval: int = 10
    ) -> Dict:
        """
        Poll call status until completion or timeout
        
        Args:
            call_id: The VAPI call ID
            max_wait: Maximum time to wait in seconds (default: 5 minutes)
            poll_interval: Time between polls in seconds (default: 10 seconds)
            
        Returns:
            Dict with 'success' status and 'data' or 'error'
        """
        start_time = time.time()
        
        while (time.time() - start_time) < max_wait:
            call_details = self.get_call_details(call_id)
            
            if not call_details.get('success'):
                return call_details
            
            data = call_details.get('data', {})
            status = data.get('status', '')
            
            if status == 'ended':
                return {
                    'success': True,
                    'data': data,
                    'completed': True
                }
            
            time.sleep(poll_interval)
        
        return {
            'success': False,
            'error': 'Call did not complete within timeout period'
        }
    
    def extract_structured_data(self, call_data: Dict) -> Dict:
        """
        Extract structured outputs from call data
        
        Args:
            call_data: Raw call data from VAPI
            
        Returns:
            Dict with extracted structured fields
        """
        artifact = call_data.get('artifact', {})
        structured_outputs = artifact.get('structuredOutputs', {})
        
        return {
            'service_interest': structured_outputs.get('fcf064be-67de-47ef-8df9-d5496674b887', {}).get('result', 'N/A'),
            'motivation': structured_outputs.get('f73696c9-a75f-4ae0-8e49-2e42e5c7f0b2', {}).get('result', 'N/A'),
            'urgency': structured_outputs.get('fd64736f-7f53-49b3-817a-252cf95537d6', {}).get('result', 'N/A'),
            'past_experience': structured_outputs.get('783e0f59-40c2-4e67-b14f-ba071286ac87', {}).get('result', 'N/A'),
            'budget': structured_outputs.get('78f6dbcc-96c0-470c-b0a6-c35976bc8e8e', {}).get('result', 'N/A'),
            'intent': structured_outputs.get('30896ce1-9f84-41b6-871b-65321b41b6fd', {}).get('result', 'N/A'),
            'transcript': artifact.get('transcript', ''),
            'ended_reason': call_data.get('endedReason', ''),
            'duration': call_data.get('duration'),
        }
    
    def create_structured_output(self, name: str, description: str, schema: Dict) -> Dict:
        """
        Create a structured output definition in Vapi
        
        Args:
            name: Name of the structured output
            description: Description of what this output captures
            schema: JSON schema for the output
            
        Returns:
            Dict with 'success' status and structured output 'id' or 'error'
        """
        url = f'{self.base_url}/structured-output'
        
        payload = {
            "name": name,
            "description": description,
            "schema": schema
        }
        
        try:
            response = requests.post(url, json=payload, headers=self.headers)
            response.raise_for_status()
            
            data = response.json()
            
            return {
                'success': True,
                'id': data.get('id'),
                'data': data
            }
            
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def list_structured_outputs(self) -> Dict:
        """
        List all structured outputs configured in Vapi
        
        Returns:
            Dict with 'success' status and list of structured outputs
        """
        url = f'{self.base_url}/structured-output'
        
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            
            data = response.json()
            
            return {
                'success': True,
                'data': data
            }
            
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_structured_output(self, output_id: str) -> Dict:
        """
        Get a specific structured output by ID
        
        Args:
            output_id: The structured output ID
            
        Returns:
            Dict with 'success' status and structured output details
        """
        url = f'{self.base_url}/structured-output/{output_id}'
        
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            
            data = response.json()
            
            return {
                'success': True,
                'data': data
            }
            
        except requests.exceptions.RequestException as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def setup_lead_qualification_outputs(self) -> Dict:
        """
        Create all structured outputs needed for lead qualification
        
        Returns:
            Dict with created structured output IDs
        """
        outputs = []
        
        # Service Interest
        result = self.create_structured_output(
            name="Service Interest",
            description="What specific service or product is the customer interested in?",
            schema={
                "type": "string",
                "description": "The specific service or product the customer wants"
            }
        )
        if result.get('success'):
            outputs.append({'name': 'service_interest', 'id': result.get('id')})
        
        # Motivation
        result = self.create_structured_output(
            name="Motivation",
            description="What is driving their interest or need for this service?",
            schema={
                "type": "string",
                "description": "The customer's motivation or problem they're trying to solve"
            }
        )
        if result.get('success'):
            outputs.append({'name': 'motivation', 'id': result.get('id')})
        
        # Urgency
        result = self.create_structured_output(
            name="Urgency",
            description="How urgent is their need? When do they want to get started?",
            schema={
                "type": "string",
                "enum": ["immediate", "within_week", "within_month", "future"],
                "description": "Timeline urgency level"
            }
        )
        if result.get('success'):
            outputs.append({'name': 'urgency', 'id': result.get('id')})
        
        # Budget
        result = self.create_structured_output(
            name="Budget",
            description="What is their budget range or budget constraints?",
            schema={
                "type": "string",
                "description": "Budget range or budget information"
            }
        )
        if result.get('success'):
            outputs.append({'name': 'budget', 'id': result.get('id')})
        
        # Past Experience
        result = self.create_structured_output(
            name="Past Experience",
            description="Have they used similar services before? What was their experience?",
            schema={
                "type": "string",
                "description": "Previous experience with similar solutions"
            }
        )
        if result.get('success'):
            outputs.append({'name': 'past_experience', 'id': result.get('id')})
        
        # Intent Level
        result = self.create_structured_output(
            name="Intent",
            description="What is the customer's purchase intent level?",
            schema={
                "type": "string",
                "enum": ["High", "Medium", "Low"],
                "description": "Purchase intent classification"
            }
        )
        if result.get('success'):
            outputs.append({'name': 'intent', 'id': result.get('id')})
        
        return {
            'success': True,
            'outputs': outputs
        }
