import re

def extract_fields(raw_text):
    cleaned_text = " ".join(raw_text.split())

    def extract(pattern, text):
        match = re.search(pattern, text, re.IGNORECASE)
        return match.group(1).strip() if match else None

    return {
        "general_information": {
            "last_name": extract(r"Last Name[:\-]?\s*(\w+)", cleaned_text),
            "first_name": extract(r"First Name[:\-]?\s*(\w+)", cleaned_text),
            "middle_initial": extract(r"M\.?I\.?[:\-]?\s*(\w)", cleaned_text),
            "dob": extract(r"Date of Birth[:\-]?\s*([\d/.-]+)", cleaned_text),
            "address": extract(r"Address[:\-]?\s*(.+?)(?=Gender|Age|Civil Status|$)", cleaned_text),
            "gender": extract(r"Gender[:\-]?\s*(Male|Female)", cleaned_text),
            "age": extract(r"Age[:\-]?\s*(\d+)", cleaned_text),
            "civil_status": extract(r"Civil Status[:\-]?\s*(\w+)", cleaned_text),
            "telephone": extract(r"Telephone[:\-]?\s*([\d\-]+)", cleaned_text),
        },
        "physical_examination": {
            "height": extract(r"Height[:\-]?\s*([\d.]+)\s*(cm|m|ft)?", cleaned_text),
            "weight": extract(r"Weight[:\-]?\s*([\d.]+)\s*(kg|lbs)?", cleaned_text),
            "blood_pressure": extract(r"Blood Pressure[:\-]?\s*([\d/]+)", cleaned_text),
            "pulse_rate": extract(r"Pulse Rate[:\-]?\s*(\d+)", cleaned_text),
            "temperature": extract(r"Temperature[:\-]?\s*([\d.]+)", cleaned_text),
        },
        "certification": {
            "classification": extract(r"Classification[:\-]?\s*(Class\s*[A-D]|Pending)", cleaned_text),
            "recommendation": extract(r"Recommendation[:\-]?\s*(.+)", cleaned_text),
        },
        "raw_text": raw_text,
    }