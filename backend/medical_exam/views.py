import pytesseract
from PIL import Image
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status, viewsets, serializers
from .models import MedicalExam
from .serializers import MedicalExamSerializer
from .extraction import extract_fields
from .utils.ocr_utils import extract_text_from_image, parse_student_form, parse_ieti_medical_form
from .utils.enhanced_ocr import extract_medical_data_from_image, MedicalFormParser
from .utils.simple_ocr import extract_medical_data_from_image_simple
from website.models import User
from datetime import datetime
import os
from django.core.files.storage import default_storage

# Helper to normalize date formats
def normalize_date(date_str):
    if not date_str:
        return None
    for fmt in ("%m/%d/%Y", "%d-%m-%Y", "%Y-%m-%d", "%m/%d/%y", "%d-%m-%y"):
        try:
            return datetime.strptime(str(date_str), fmt).date()
        except (ValueError, TypeError):
            continue
    return None  # if no valid format found

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def process_medical_exam(request):
    try:
        image = request.FILES.get("file")
        student_id = request.data.get("student_id")

        if not image:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)
        if not student_id:
            return Response({"error": "Student ID is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Verify student exists
        try:
            student = User.objects.get(id=student_id, role='student')
        except User.DoesNotExist:
            return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)

        img = Image.open(image)
        raw_text = pytesseract.image_to_string(img)

        # Extract fields 
        data = extract_fields(raw_text)
        data["student_id"] = student_id

        # Normalize DOB if present
        if "dob" in data:
            normalized = normalize_date(data["dob"])
            if normalized:
                data["dob"] = normalized.isoformat()  # YYYY-MM-DD
            else:
                data["dob"] = None

        return Response(data, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ViewSet for full CRUD
class MedicalExamViewSet(viewsets.ModelViewSet):
    queryset = MedicalExam.objects.all()
    serializer_class = MedicalExamSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Filter by user role
        if self.request.user.role == 'clinic':
            return MedicalExam.objects.all()
        elif self.request.user.role == 'student':
            return MedicalExam.objects.filter(student=self.request.user)
        else:
            return MedicalExam.objects.none()

    def perform_create(self, serializer):
        # Handle raw text data
        student_id = self.request.data.get("student_id")
        data = self.request.data.copy()

        if student_id:
            try:
                student = User.objects.get(id=student_id, role='student')
                data["student"] = student.id
            except User.DoesNotExist:
                raise serializers.ValidationError("Student not found")

        # Handle extraction timestamp if present
        extraction_timestamp = data.get("extraction_timestamp")
        if extraction_timestamp:
            try:
                from datetime import datetime
                # Parse ISO format timestamp
                parsed_timestamp = datetime.fromisoformat(extraction_timestamp.replace('Z', '+00:00'))
                data["extraction_timestamp"] = parsed_timestamp
            except ValueError:
                # If parsing fails, just use current time
                data["extraction_timestamp"] = datetime.now()

        serializer.save(**data)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def ocr_process_medical_exam(request):
    """
    Process medical examination form using enhanced OCR with multiple preprocessing techniques
    """
    try:
        file = request.FILES.get("file")
        student_id = request.data.get("student_id")

        if not file:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        # Verify student exists if provided
        if student_id:
            try:
                student = User.objects.get(id=student_id, role='student')
            except User.DoesNotExist:
                return Response({"error": "Student not found"}, status=status.HTTP_404_NOT_FOUND)

        # Save uploaded file temporarily
        file_path = default_storage.save(file.name, file)
        
        # Get the full path to the saved file
        import os
        from django.conf import settings
        full_file_path = os.path.join(settings.MEDIA_ROOT, file_path)
        
        # Debug logging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"File saved to: {file_path}")
        logger.info(f"Full file path: {full_file_path}")
        logger.info(f"File exists: {os.path.exists(full_file_path)}")

        try:
            # Try enhanced OCR first
            structured_data = extract_medical_data_from_image(full_file_path)

            # Check if extraction was successful
            if "error" in structured_data:
                logger.warning(f"Enhanced OCR failed: {structured_data['error']}")
                logger.info("Trying simple OCR fallback...")
                
                # Try simple OCR as fallback
                structured_data = extract_medical_data_from_image_simple(full_file_path)
                
                if "error" in structured_data:
                    logger.error(f"Simple OCR also failed: {structured_data['error']}")
                    return Response(structured_data, status=status.HTTP_400_BAD_REQUEST)

            # Add student_id if provided
            if student_id:
                structured_data["student_id"] = student_id

            # Add processing metadata
            structured_data["file_name"] = file.name

            return Response(structured_data, status=status.HTTP_200_OK)
        finally:
            # Clean up file
            if os.path.exists(full_file_path):
                os.remove(full_file_path)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def debug_ocr_extraction(request):
    """
    Debug endpoint to test enhanced OCR extraction without saving
    """
    try:
        file = request.FILES.get("file")
        
        if not file:
            return Response({"error": "No file uploaded"}, status=status.HTTP_400_BAD_REQUEST)

        # Save uploaded file temporarily
        file_path = default_storage.save(file.name, file)
        
        # Get the full path to the saved file
        import os
        from django.conf import settings
        full_file_path = os.path.join(settings.MEDIA_ROOT, file_path)
        
        # Debug logging
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Debug - File saved to: {file_path}")
        logger.info(f"Debug - Full file path: {full_file_path}")
        logger.info(f"Debug - File exists: {os.path.exists(full_file_path)}")

        try:
            # Try enhanced OCR first
            structured_data = extract_medical_data_from_image(full_file_path)
            
            # If enhanced OCR fails, try simple OCR
            if "error" in structured_data:
                logger.warning(f"Enhanced OCR failed: {structured_data['error']}")
                logger.info("Trying simple OCR fallback...")
                structured_data = extract_medical_data_from_image_simple(full_file_path)
            
            # Get raw text for debugging
            raw_text = structured_data.get("raw_text", "")

            return Response({
                "raw_text": raw_text,
                "extracted_data": structured_data,
                "text_length": len(raw_text),
                "data_fields_count": len([k for k, v in structured_data.items() if k not in ["raw_text", "extraction_timestamp", "processing_method", "file_name"]]),
                "processing_method": structured_data.get("processing_method", "Enhanced OCR"),
                "extraction_timestamp": structured_data.get("extraction_timestamp", "")
            }, status=status.HTTP_200_OK)
        finally:
            # Clean up file
            if os.path.exists(full_file_path):
                os.remove(full_file_path)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)