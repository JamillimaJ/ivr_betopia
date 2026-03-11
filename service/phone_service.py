"""
Phone Service - Handles phone number standardization for Bangladesh
"""
import re
from typing import Optional


class PhoneService:
    """Service class for phone number operations"""
    
    @staticmethod
    def standardize_phone(phone_number: str) -> str:
        """
        Standardize Bangladesh phone numbers to international format
        
        Handles three cases:
        1. 10-digit number missing leading 0 (adds 0)
        2. 11-digit local BD number starting with 01 (adds +88)
        3. 13-digit number with country code 880 (adds +)
        
        Args:
            phone_number: Raw phone number string
            
        Returns:
            Standardized phone number with country code or 'incorrect format'
        """
        # Remove all non-digits
        clean_number = re.sub(r'\D', '', str(phone_number))
        
        # Case 1: 10 digit number missing leading 0
        if len(clean_number) == 10 and clean_number.startswith('1'):
            clean_number = '0' + clean_number
        
        # Case 2: Local BD number (11 digits starting with 01)
        if len(clean_number) == 11 and clean_number.startswith('01'):
            return '+88' + clean_number
        
        # Case 3: Already with country code (13 digits starting with 880)
        elif len(clean_number) == 13 and clean_number.startswith('880'):
            return '+' + clean_number
        
        # Invalid format
        else:
            return 'incorrect format'
    
    @staticmethod
    def is_valid_bd_phone(phone_number: str) -> bool:
        """
        Check if a phone number is a valid Bangladesh number
        
        Args:
            phone_number: Phone number to validate
            
        Returns:
            Boolean indicating if the number is valid
        """
        standardized = PhoneService.standardize_phone(phone_number)
        return standardized != 'incorrect format'
    
    @staticmethod
    def format_for_display(phone_number: str) -> str:
        """
        Format phone number for display
        
        Args:
            phone_number: Standardized phone number
            
        Returns:
            Formatted phone number (e.g., +880 1XX-XXXX-XXXX)
        """
        if not phone_number or phone_number == 'incorrect format':
            return phone_number
        
        # Remove + sign for formatting
        clean = phone_number.replace('+', '')
        
        # Format as +880 1XX-XXXX-XXXX
        if clean.startswith('880') and len(clean) == 13:
            return f"+880 {clean[3:6]}-{clean[6:10]}-{clean[10:]}"
        
        return phone_number
