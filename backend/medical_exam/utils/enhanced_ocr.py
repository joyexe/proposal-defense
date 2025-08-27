import pytesseract
from PIL import Image, ImageEnhance, ImageFilter
import cv2
import numpy as np
import re
import os
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class EnhancedOCRProcessor:
    """
    Enhanced OCR processor for medical examination forms
    Combines multiple preprocessing techniques and OCR configurations
    """
    
    def __init__(self):
        # Optimized OCR configs - fewer configurations for faster processing
        self.ocr_configs = [
            '--oem 3 --psm 6',  # Uniform block of text - most common for forms
            '--oem 3 --psm 3',  # Fully automatic page segmentation - fallback
        ]
    
    def preprocess_image(self, image_path):
        """
        Apply optimized preprocessing techniques for faster processing
        """
        try:
            # Get the absolute path to the image file
            import os
            if not os.path.isabs(image_path):
                # If it's a relative path, make it absolute
                image_path = os.path.abspath(image_path)
            
            # Read image using OpenCV
            img = cv2.imread(image_path)
            if img is None:
                raise ValueError(f"Could not read image at path: {image_path}")
            
            # Convert to grayscale
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Apply optimized preprocessing techniques (fewer for speed)
            processed_images = []
            
            # 1. Original grayscale (fastest)
            processed_images.append(gray)
            
            # 2. Adaptive thresholding (most effective for forms)
            adaptive_thresh = cv2.adaptiveThreshold(
                gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
            )
            processed_images.append(adaptive_thresh)
            
            # 3. Otsu thresholding (good for clean images)
            _, otsu_thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            processed_images.append(otsu_thresh)
            
            return processed_images
            
        except Exception as e:
            logger.error(f"Error preprocessing image: {e}")
            # Try to read the image directly as grayscale
            try:
                import os
                if not os.path.isabs(image_path):
                    image_path = os.path.abspath(image_path)
                fallback_img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
                if fallback_img is not None:
                    return [fallback_img]
                else:
                    logger.error(f"Could not read image even in fallback mode: {image_path}")
                    return []
            except Exception as fallback_error:
                logger.error(f"Fallback image reading also failed: {fallback_error}")
                return []
    
    def extract_text_with_multiple_configs(self, image_path):
        """
        Extract text using optimized OCR configurations for faster processing
        """
        best_result = ""
        best_confidence = 0
        
        try:
            # Get preprocessed images
            processed_images = self.preprocess_image(image_path)
            
            if not processed_images:
                logger.error("No images could be processed")
                return ""
            
            # Limit processing to first 2 images for speed
            for i, processed_img in enumerate(processed_images[:2]):
                # Convert OpenCV image to PIL Image
                pil_img = Image.fromarray(processed_img)
                
                # Try different OCR configurations
                for config in self.ocr_configs:
                    try:
                        # Extract text with confidence
                        data = pytesseract.image_to_data(pil_img, config=config, output_type=pytesseract.Output.DICT)
                        
                        # Calculate confidence and extract text
                        text_parts = []
                        total_confidence = 0
                        valid_words = 0
                        
                        for j, conf in enumerate(data['conf']):
                            if conf > 30:  # Only consider text with confidence > 30%
                                text_parts.append(data['text'][j])
                                total_confidence += conf
                                valid_words += 1
                        
                        if valid_words > 0:
                            avg_confidence = total_confidence / valid_words
                            extracted_text = ' '.join(text_parts)
                            
                            # Update best result if this configuration gives better results
                            if len(extracted_text) > len(best_result) and avg_confidence > best_confidence:
                                best_result = extracted_text
                                best_confidence = avg_confidence
                                logger.info(f"Better OCR result found: {len(extracted_text)} chars, confidence: {avg_confidence:.2f}")
                                
                                # Early exit if we get good results
                                if avg_confidence > 80 and len(extracted_text) > 100:
                                    logger.info("Good result found, stopping early")
                                    break
                        
                    except Exception as e:
                        logger.warning(f"OCR config failed: {e}")
                        continue
                
                # Early exit if we got good results
                if best_confidence > 80 and len(best_result) > 100:
                    break
            
            logger.info(f"Final OCR result: {len(best_result)} characters, confidence: {best_confidence:.2f}")
            return best_result.strip()
            
        except Exception as e:
            logger.error(f"Error in OCR extraction: {e}")
            return ""

class MedicalFormParser:
    """
    Advanced parser for medical examination forms
    Handles various form layouts and data extraction patterns
    """
    
    def __init__(self):
        self.ocr_processor = EnhancedOCRProcessor()
    
    def extract_medical_data(self, image_path):
        """
        Main method to extract raw text from image
        """
        try:
            # Extract text using enhanced OCR
            raw_text = self.ocr_processor.extract_text_with_multiple_configs(image_path)
            
            if not raw_text:
                return {"error": "No text could be extracted from the image"}
            
            # Return just the raw text with metadata
            return {
                "raw_text": raw_text,
                "extraction_timestamp": datetime.now().isoformat(),
                "processing_method": "Enhanced OCR with Multi-Preprocessing"
            }
            
        except Exception as e:
            logger.error(f"Error extracting medical data: {e}")
            return {"error": str(e)}
    
    def parse_medical_form(self, raw_text):
        """
        Parse raw OCR text and extract structured medical data
        """
        data = {}
        text_lower = raw_text.lower()
        original_text = raw_text
        
        logger.info(f"Parsing medical form with {len(raw_text)} characters")
        
        # Personal Information Section
        data.update(self._extract_personal_info(text_lower, original_text))
        
        # Physical Examination Section
        data.update(self._extract_physical_exam(text_lower))
        
        # Laboratory Results Section
        data.update(self._extract_laboratory_results(text_lower))
        
        # Physician Information
        data.update(self._extract_physician_info(text_lower, original_text))
        
        logger.info(f"Extracted {len(data)} fields from medical form")
        return data
    
    def _extract_personal_info(self, text_lower, original_text):
        """Extract personal information fields"""
        data = {}
        
        # Name extraction with multiple patterns
        name_patterns = [
            (r'last\s+name[:\s]*([a-zA-Z\s]+?)(?=\s*(?:first\s+name|m\.?i\.?|address|gender|age|civil|date|telephone|$))', 'last_name'),
            (r'first\s+name[:\s]*([a-zA-Z\s]+?)(?=\s*(?:m\.?i\.?|address|gender|age|civil|date|telephone|$))', 'first_name'),
            (r'm\.?i\.?[:\s]*([a-zA-Z])', 'middle_initial'),
        ]
        
        for pattern, field in name_patterns:
            match = re.search(pattern, text_lower)
            if match:
                extracted = match.group(1).strip()
                if extracted and len(extracted) > 1:
                    if field == 'middle_initial':
                        data[field] = extracted.upper()
                    else:
                        data[field] = extracted.title()
                    break
        
        # Address extraction
        address_patterns = [
            r'present\s+mailing\s+address[:\s]*([^\n]+?)(?=\s*(?:gender|age|civil|date|telephone|$))',
            r'address[:\s]*([^\n]+?)(?=\s*(?:gender|age|civil|date|telephone|$))',
        ]
        
        for pattern in address_patterns:
            match = re.search(pattern, text_lower)
            if match:
                extracted = match.group(1).strip()
                if extracted and len(extracted) > 5:
                    data['address'] = extracted
                    break
        
        # Demographics
        demographics = [
            (r'gender[:\s]*(male|female|m|f)', 'gender'),
            (r'age[:\s]*(\d+)', 'age'),
            (r'(\d+)\s*years?\s*old', 'age'),
            (r'civil\s+status[:\s]*(single|married|widowed|divorced)', 'civil_status'),
            (r'date\s+of\s+birth[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})', 'dob'),
            (r'telephone\s+number[:\s]*(\d+)', 'telephone'),
        ]
        
        for pattern, field in demographics:
            match = re.search(pattern, text_lower)
            if match:
                extracted = match.group(1)
                if field == 'gender':
                    data[field] = 'Female' if extracted.lower() in ['female', 'f'] else 'Male'
                elif field == 'civil_status':
                    data[field] = extracted.title()
                else:
                    data[field] = extracted
                break
        
        return data
    
    def _extract_physical_exam(self, text_lower):
        """Extract physical examination data"""
        data = {}
        
        physical_measurements = [
            (r'height[:\s]*(\d+\.?\d*)\s*(m|cm)', 'height'),
            (r'weight[:\s]*(\d+\.?\d*)\s*(kg|lbs)', 'weight'),
            (r'blood\s+pressure[:\s]*(\d+/\d+)\s*(?:mmHg)?', 'blood_pressure'),
            (r'pulse\s+rate[:\s]*(\d+)\s*(?:bpm)?', 'pulse_rate'),
            (r'temperature[:\s]*(\d+\.?\d*)', 'temperature'),
            (r'respiration[:\s]*(\d+)', 'respiration'),
        ]
        
        for pattern, field in physical_measurements:
            match = re.search(pattern, text_lower)
            if match:
                if field in ['height', 'weight']:
                    data[field] = f"{match.group(1)}{match.group(2)}"
                else:
                    data[field] = match.group(1)
                break
        
        # Body build and color vision
        body_patterns = [
            (r'body\s+build[:\s]*([^\n]+?)(?=\s*(?:visual|color|$))', 'body_build'),
            (r'color\s+vision[:\s]*(adequate|defective)', 'color_vision'),
        ]
        
        for pattern, field in body_patterns:
            match = re.search(pattern, text_lower)
            if match:
                extracted = match.group(1).strip()
                if extracted and len(extracted) > 2:
                    data[field] = extracted.title()
                break
        
        return data
    
    def _extract_laboratory_results(self, text_lower):
        """Extract laboratory test results"""
        data = {}
        
        lab_tests = [
            (r'essential\s+normal\s+chest|chest\s+x.?ray[:\s]*normal', 'chest_xray', 'Essential Normal Chest'),
            (r'within\s+normal\s+limits|ecg[:\s]*normal', 'ecg_report', 'Within Normal Limits'),
            (r'complete\s+blood\s+count.*?normal|cbc.*?normal', 'complete_blood_count', 'Normal'),
            (r'urinalysis.*?normal|urine.*?normal', 'urinalysis', 'Normal'),
            (r'stool\s+examination.*?normal|stool.*?normal', 'stool_examination', 'Normal'),
            (r'hepatitis\s+b.*?(reactive|non.?reactive)', 'hepatitis_b'),
            (r'pregnancy\s+test.*?(positive|negative)', 'pregnancy_test'),
            (r'class\s+([a-d])\s+physically\s+fit', 'physical_fitness_class'),
        ]
        
        for pattern, field, default_value in lab_tests:
            match = re.search(pattern, text_lower, re.DOTALL)
            if match:
                if field == 'physical_fitness_class':
                    data[field] = f"Class {match.group(1).upper()}"
                elif len(match.groups()) > 0:
                    data[field] = match.group(1).title()
                else:
                    data[field] = default_value
                break
        
        return data
    
    def _extract_physician_info(self, text_lower, original_text):
        """Extract physician information"""
        data = {}
        
        # Physician name
        physician_patterns = [
            r'([a-zA-Z\s]+)\s*M\.?D\.?',
            r'physician[:\s]*([a-zA-Z\s]+)',
        ]
        
        for pattern in physician_patterns:
            match = re.search(pattern, original_text)
            if match:
                extracted = match.group(1).strip()
                if extracted and len(extracted) > 2:
                    data['physician_name'] = extracted
                    break
        
        # License number
        license_match = re.search(r'license\s+no\.?[:\s]*(\d+)', text_lower)
        if license_match:
            data['physician_license'] = license_match.group(1)
        
        # Examination date
        date_match = re.search(r'date[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})', text_lower)
        if date_match:
            data['examination_date'] = date_match.group(1)
        
        return data

# Convenience function for easy integration
def extract_medical_data_from_image(image_path):
    """
    Convenience function to extract medical data from image
    """
    parser = MedicalFormParser()
    return parser.extract_medical_data(image_path)
