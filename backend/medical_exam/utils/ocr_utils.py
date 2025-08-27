import pytesseract
from PIL import Image
import re
import os
from datetime import datetime

def extract_text_from_image(file_path):
    """
    Extract text from an image using OCR with enhanced configuration for medical forms
    """
    try:
        # Open the image
        img = Image.open(file_path)
        
        # Try multiple OCR configurations for better results
        configs = [
            '--oem 3 --psm 6',  # Default configuration
            '--oem 3 --psm 3',  # Fully automatic page segmentation
            '--oem 3 --psm 4',  # Assume a single column of text
            '--oem 3 --psm 8',  # Single word
        ]
        
        best_text = ""
        for config in configs:
            try:
                text = pytesseract.image_to_string(img, config=config)
                if len(text) > len(best_text):
                    best_text = text
            except Exception as e:
                print(f"OCR config {config} failed: {e}")
                continue
        
        print(f"DEBUG: OCR extracted text length: {len(best_text)}")
        print(f"DEBUG: First 200 characters: {best_text[:200]}")
        
        return best_text
    except Exception as e:
        print(f"Error extracting text from image: {e}")
        return ""

def parse_ieti_medical_form(raw_text):
    """
    Parse raw OCR text and extract structured data from IETI medical examination form
    Enhanced to match the actual form layout and handwritten data
    """
    data = {}
    
    # Convert to lowercase for easier matching but preserve original for extraction
    text_lower = raw_text.lower()
    original_text = raw_text
    
    print(f"DEBUG: Raw OCR text length: {len(raw_text)}")
    print(f"DEBUG: Raw OCR text preview: {raw_text[:500]}...")
    
    # More flexible extraction patterns for the IETI form
    
    # I. GENERAL INFORMATION SECTION
    # Extract LAST NAME - multiple patterns to catch different formats
    last_name_patterns = [
        r'last\s+name[:\s]*([a-zA-Z\s]+?)(?=\s*first\s+name|$)',
        r'last\s+name[:\s]*([a-zA-Z\s]+?)(?=\s*m\.?i\.?|$)',
        r'last\s+name[:\s]*([a-zA-Z\s]+?)(?=\s*address|$)',
        r'last\s+name[:\s]*([a-zA-Z\s]+?)(?=\s*gender|$)',
        r'last\s+name[:\s]*([a-zA-Z\s]+?)(?=\s*age|$)',
        r'last\s+name[:\s]*([a-zA-Z\s]+?)(?=\s*civil|$)',
        r'last\s+name[:\s]*([a-zA-Z\s]+?)(?=\s*date|$)',
        r'last\s+name[:\s]*([a-zA-Z\s]+?)(?=\s*telephone|$)',
    ]
    
    for pattern in last_name_patterns:
        match = re.search(pattern, text_lower)
        if match:
            extracted = match.group(1).strip()
            if extracted and len(extracted) > 1:  # Ensure we got meaningful data
                data['last_name'] = extracted.title()
                print(f"DEBUG: Found last_name: {data['last_name']}")
                break
    
    # Extract FIRST NAME
    first_name_patterns = [
        r'first\s+name[:\s]*([a-zA-Z\s]+?)(?=\s*m\.?i\.?|$)',
        r'first\s+name[:\s]*([a-zA-Z\s]+?)(?=\s*address|$)',
        r'first\s+name[:\s]*([a-zA-Z\s]+?)(?=\s*gender|$)',
        r'first\s+name[:\s]*([a-zA-Z\s]+?)(?=\s*age|$)',
        r'first\s+name[:\s]*([a-zA-Z\s]+?)(?=\s*civil|$)',
        r'first\s+name[:\s]*([a-zA-Z\s]+?)(?=\s*date|$)',
        r'first\s+name[:\s]*([a-zA-Z\s]+?)(?=\s*telephone|$)',
    ]
    
    for pattern in first_name_patterns:
        match = re.search(pattern, text_lower)
        if match:
            extracted = match.group(1).strip()
            if extracted and len(extracted) > 1:
                data['first_name'] = extracted.title()
                print(f"DEBUG: Found first_name: {data['first_name']}")
                break
    
    # Extract MIDDLE INITIAL
    mi_patterns = [
        r'm\.?i\.?[:\s]*([a-zA-Z])',
        r'middle\s+initial[:\s]*([a-zA-Z])',
        r'm\.?i\.?[:\s]*([a-zA-Z])\s',
    ]
    
    for pattern in mi_patterns:
        match = re.search(pattern, text_lower)
        if match:
            data['middle_initial'] = match.group(1).upper()
            print(f"DEBUG: Found middle_initial: {data['middle_initial']}")
            break
    
    # Extract PRESENT MAILING ADDRESS
    address_patterns = [
        r'present\s+mailing\s+address[:\s]*([^\n]+?)(?=\s*gender|$)',
        r'address[:\s]*([^\n]+?)(?=\s*gender|$)',
        r'present\s+mailing\s+address[:\s]*([^\n]+?)(?=\s*age|$)',
        r'address[:\s]*([^\n]+?)(?=\s*age|$)',
    ]
    
    for pattern in address_patterns:
        match = re.search(pattern, text_lower)
        if match:
            extracted = match.group(1).strip()
            if extracted and len(extracted) > 5:  # Ensure meaningful address
                data['address'] = extracted
                print(f"DEBUG: Found address: {data['address']}")
                break
    
    # Extract GENDER
    gender_patterns = [
        r'gender[:\s]*(male|female|m|f)',
        r'sex[:\s]*(male|female|m|f)',
        r'gender[:\s]*(male|female|m|f)\s',
    ]
    
    for pattern in gender_patterns:
        match = re.search(pattern, text_lower)
        if match:
            gender = match.group(1).lower()
            data['gender'] = 'Female' if gender in ['female', 'f'] else 'Male'
            print(f"DEBUG: Found gender: {data['gender']}")
            break
    
    # Extract AGE
    age_patterns = [
        r'age[:\s]*(\d+)',
        r'(\d+)\s*years?\s*old',
        r'age[:\s]*(\d+)\s',
    ]
    
    for pattern in age_patterns:
        match = re.search(pattern, text_lower)
        if match:
            data['age'] = match.group(1)
            print(f"DEBUG: Found age: {data['age']}")
            break
    
    # Extract CIVIL STATUS
    civil_status_patterns = [
        r'civil\s+status[:\s]*(single|married|widowed|divorced)',
        r'status[:\s]*(single|married|widowed|divorced)',
        r'civil\s+status[:\s]*(single|married|widowed|divorced)\s',
    ]
    
    for pattern in civil_status_patterns:
        match = re.search(pattern, text_lower)
        if match:
            data['civil_status'] = match.group(1).title()
            print(f"DEBUG: Found civil_status: {data['civil_status']}")
            break
    
    # Extract DATE OF BIRTH
    dob_patterns = [
        r'date\s+of\s+birth[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
        r'dob[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
        r'birth[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})',
        r'date\s+of\s+birth[:\s]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})\s',
    ]
    
    for pattern in dob_patterns:
        match = re.search(pattern, text_lower)
        if match:
            data['dob'] = match.group(1)
            print(f"DEBUG: Found dob: {data['dob']}")
            break
    
    # Extract TELEPHONE NUMBER
    phone_patterns = [
        r'telephone\s+number[:\s]*(\d+)',
        r'phone[:\s]*(\d+)',
        r'tel[:\s]*(\d+)',
        r'telephone\s+number[:\s]*(\d+)\s',
    ]
    
    for pattern in phone_patterns:
        match = re.search(pattern, text_lower)
        if match:
            data['telephone'] = match.group(1)
            print(f"DEBUG: Found telephone: {data['telephone']}")
            break
    
    # III. PHYSICAL EXAMINATION SECTION
    # Extract HEIGHT
    height_patterns = [
        r'height[:\s]*(\d+\.?\d*)\s*(m|cm)',
        r'(\d+\.?\d*)\s*(m|cm)\s*height',
        r'height[:\s]*(\d+\.?\d*)\s*(m|cm)\s',
    ]
    
    for pattern in height_patterns:
        match = re.search(pattern, text_lower)
        if match:
            data['height'] = f"{match.group(1)}{match.group(2)}"
            print(f"DEBUG: Found height: {data['height']}")
            break
    
    # Extract WEIGHT
    weight_patterns = [
        r'weight[:\s]*(\d+\.?\d*)\s*(kg|lbs)',
        r'(\d+\.?\d*)\s*(kg|lbs)\s*weight',
        r'weight[:\s]*(\d+\.?\d*)\s*(kg|lbs)\s',
    ]
    
    for pattern in weight_patterns:
        match = re.search(pattern, text_lower)
        if match:
            data['weight'] = f"{match.group(1)}{match.group(2)}"
            print(f"DEBUG: Found weight: {data['weight']}")
            break
    
    # Extract BLOOD PRESSURE
    bp_patterns = [
        r'blood\s+pressure[:\s]*(\d+/\d+)\s*(?:mmHg)?',
        r'bp[:\s]*(\d+/\d+)\s*(?:mmHg)?',
        r'(\d+/\d+)\s*mmHg',
        r'blood\s+pressure[:\s]*(\d+/\d+)\s*(?:mmHg)?\s',
    ]
    
    for pattern in bp_patterns:
        match = re.search(pattern, text_lower)
        if match:
            data['blood_pressure'] = match.group(1)
            print(f"DEBUG: Found blood_pressure: {data['blood_pressure']}")
            break
    
    # Extract PULSE RATE
    pulse_patterns = [
        r'pulse\s+rate[:\s]*(\d+)\s*(?:bpm)?',
        r'pulse[:\s]*(\d+)\s*(?:bpm)?',
        r'(\d+)\s*bpm',
        r'pulse\s+rate[:\s]*(\d+)\s*(?:bpm)?\s',
    ]
    
    for pattern in pulse_patterns:
        match = re.search(pattern, text_lower)
        if match:
            data['pulse_rate'] = match.group(1)
            print(f"DEBUG: Found pulse_rate: {data['pulse_rate']}")
            break
    
    # Extract TEMPERATURE
    temp_patterns = [
        r'temperature[:\s]*(\d+\.?\d*)',
        r'temp[:\s]*(\d+\.?\d*)',
        r'temperature[:\s]*(\d+\.?\d*)\s',
    ]
    
    for pattern in temp_patterns:
        match = re.search(pattern, text_lower)
        if match:
            data['temperature'] = match.group(1)
            print(f"DEBUG: Found temperature: {data['temperature']}")
            break
    
    # Extract RESPIRATION
    resp_patterns = [
        r'respiration[:\s]*(\d+)',
        r'resp[:\s]*(\d+)',
        r'respiration[:\s]*(\d+)\s',
    ]
    
    for pattern in resp_patterns:
        match = re.search(pattern, text_lower)
        if match:
            data['respiration'] = match.group(1)
            print(f"DEBUG: Found respiration: {data['respiration']}")
            break
    
    # Extract BODY BUILD
    body_build_patterns = [
        r'body\s+build[:\s]*([^\n]+?)(?=\s*visual|$)',
        r'build[:\s]*([^\n]+?)(?=\s*visual|$)',
        r'body\s+build[:\s]*([^\n]+?)(?=\s*color|$)',
    ]
    
    for pattern in body_build_patterns:
        match = re.search(pattern, text_lower)
        if match:
            extracted = match.group(1).strip()
            if extracted and len(extracted) > 2:
                data['body_build'] = extracted
                print(f"DEBUG: Found body_build: {data['body_build']}")
                break
    
    # Extract COLOR VISION
    color_vision_patterns = [
        r'adequate|defective',
        r'color\s+vision[:\s]*(adequate|defective)',
        r'adequate|defective',
    ]
    
    for pattern in color_vision_patterns:
        match = re.search(pattern, text_lower)
        if match:
            data['color_vision'] = match.group(0).title()
            print(f"DEBUG: Found color_vision: {data['color_vision']}")
            break
    
    # IV. LABORATORY RESULTS SECTION
    # Extract CHEST X-RAY
    chest_xray_patterns = [
        r'essential\s+normal\s+chest',
        r'chest\s+x.?ray[:\s]*normal',
        r'essential\s+normal',
    ]
    
    for pattern in chest_xray_patterns:
        match = re.search(pattern, text_lower)
        if match:
            data['chest_xray'] = 'Essential Normal Chest'
            print(f"DEBUG: Found chest_xray: {data['chest_xray']}")
            break
    
    # Extract ECG REPORT
    ecg_patterns = [
        r'within\s+normal\s+limits',
        r'ecg[:\s]*normal',
        r'within\s+normal',
    ]
    
    for pattern in ecg_patterns:
        match = re.search(pattern, text_lower)
        if match:
            data['ecg_report'] = 'Within Normal Limits'
            print(f"DEBUG: Found ecg_report: {data['ecg_report']}")
            break
    
    # Extract COMPLETE BLOOD COUNT
    cbc_patterns = [
        r'complete\s+blood\s+count.*?normal',
        r'cbc.*?normal',
        r'blood\s+count.*?normal',
    ]
    
    for pattern in cbc_patterns:
        match = re.search(pattern, text_lower, re.DOTALL)
        if match:
            data['complete_blood_count'] = 'Normal'
            print(f"DEBUG: Found complete_blood_count: {data['complete_blood_count']}")
            break
    
    # Extract URINALYSIS
    urinalysis_patterns = [
        r'urinalysis.*?normal',
        r'urine.*?normal',
        r'urinalysis.*?normal',
    ]
    
    for pattern in urinalysis_patterns:
        match = re.search(pattern, text_lower, re.DOTALL)
        if match:
            data['urinalysis'] = 'Normal'
            print(f"DEBUG: Found urinalysis: {data['urinalysis']}")
            break
    
    # Extract STOOL EXAMINATION
    stool_patterns = [
        r'stool\s+examination.*?normal',
        r'stool.*?normal',
        r'stool\s+exam.*?normal',
    ]
    
    for pattern in stool_patterns:
        match = re.search(pattern, text_lower, re.DOTALL)
        if match:
            data['stool_examination'] = 'Normal'
            print(f"DEBUG: Found stool_examination: {data['stool_examination']}")
            break
    
    # Extract HEPATITIS B
    hepb_patterns = [
        r'hepatitis\s+b.*?(reactive|non.?reactive)',
        r'hep\s+b.*?(reactive|non.?reactive)',
        r'hepatitis.*?(reactive|non.?reactive)',
    ]
    
    for pattern in hepb_patterns:
        match = re.search(pattern, text_lower)
        if match:
            data['hepatitis_b'] = match.group(1).title()
            print(f"DEBUG: Found hepatitis_b: {data['hepatitis_b']}")
            break
    
    # Extract PREGNANCY TEST
    pregnancy_patterns = [
        r'pregnancy\s+test.*?(positive|negative)',
        r'pregnancy.*?(positive|negative)',
        r'pregnancy\s+test.*?(positive|negative)',
    ]
    
    for pattern in pregnancy_patterns:
        match = re.search(pattern, text_lower)
        if match:
            data['pregnancy_test'] = match.group(1).title()
            print(f"DEBUG: Found pregnancy_test: {data['pregnancy_test']}")
            break
    
    # Extract PHYSICAL FITNESS CLASS
    class_patterns = [
        r'class\s+([a-d])\s+physically\s+fit',
        r'class\s+([a-d]).*?fit',
        r'class\s+([a-d])\s+physically',
    ]
    
    for pattern in class_patterns:
        match = re.search(pattern, text_lower)
        if match:
            data['physical_fitness_class'] = f"Class {match.group(1).upper()}"
            print(f"DEBUG: Found physical_fitness_class: {data['physical_fitness_class']}")
            break
    
    # Extract PHYSICIAN INFORMATION
    physician_patterns = [
        r'([a-zA-Z\s]+)\s*M\.?D\.?',
        r'physician[:\s]*([a-zA-Z\s]+)',
        r'([a-zA-Z\s]+)\s*M\.?D',
    ]
    
    for pattern in physician_patterns:
        match = re.search(pattern, original_text)
        if match:
            extracted = match.group(1).strip()
            if extracted and len(extracted) > 2:
                data['physician_name'] = extracted
                print(f"DEBUG: Found physician_name: {data['physician_name']}")
                break
    
    # Extract LICENSE NUMBER
    license_patterns = [
        r'license\s+no\.?[:\s]*(\d+)',
        r'license[:\s]*(\d+)',
        r'license\s+no[:\s]*(\d+)',
    ]
    
    for pattern in license_patterns:
        match = re.search(pattern, text_lower)
        if match:
            data['physician_license'] = match.group(1)
            print(f"DEBUG: Found physician_license: {data['physician_license']}")
            break
    
    # Extract EXAMINATION DATE
    exam_date_patterns = [
        r'date[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
        r'examination\s+date[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
        r'date[:\s]*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s',
    ]
    
    for pattern in exam_date_patterns:
        match = re.search(pattern, text_lower)
        if match:
            data['examination_date'] = match.group(1)
            print(f"DEBUG: Found examination_date: {data['examination_date']}")
            break
    
    print(f"DEBUG: Final extracted data: {data}")
    return data

def parse_student_form(raw_text):
    """
    Legacy function - now calls the enhanced IETI form parser
    """
    return parse_ieti_medical_form(raw_text)
