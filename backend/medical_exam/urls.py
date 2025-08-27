from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MedicalExamViewSet, process_medical_exam, ocr_process_medical_exam, debug_ocr_extraction

router = DefaultRouter()
router.register(r'medical-exams', MedicalExamViewSet, basename='medical-exams')

urlpatterns = [
    path("", include(router.urls)),
    path("ocr/", ocr_process_medical_exam, name="ocr_process_medical_exam"),
    path("debug-ocr/", debug_ocr_extraction, name="debug_ocr_extraction"),
    path("process/", process_medical_exam, name="process_medical_exam"),
]