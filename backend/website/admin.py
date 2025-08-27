from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User
from django import forms

class CustomUserAdminForm(forms.ModelForm):
    class Meta:
        model = User
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.instance:
            if self.instance.role != 'student':
                self.fields.pop('guardian_email', None)
                self.fields.pop('student_id', None)
                self.fields.pop('grade', None)
                self.fields.pop('section', None)
            if self.instance.role not in ['faculty', 'counselor', 'admin', 'clinic']:
                self.fields.pop('faculty_id', None)

            # Update field labels based on role
            if self.instance.role == 'student' and 'student_id' in self.fields:
                self.fields['student_id'].label = 'Student ID'
            elif self.instance.role == 'faculty' and 'faculty_id' in self.fields:
                self.fields['faculty_id'].label = 'Faculty ID'
            elif self.instance.role == 'counselor' and 'faculty_id' in self.fields:
                self.fields['faculty_id'].label = 'Counselor ID'
            elif self.instance.role == 'admin' and 'faculty_id' in self.fields:
                self.fields['faculty_id'].label = 'Admin ID'
            elif self.instance.role == 'clinic' and 'faculty_id' in self.fields:
                self.fields['faculty_id'].label = 'Nurse ID'
        else:
            # For new users, set default labels
            if 'student_id' in self.fields:
                self.fields['student_id'].label = 'Student ID'
            if 'faculty_id' in self.fields:
                self.fields['faculty_id'].label = 'Faculty ID'

class CustomUserAdmin(UserAdmin):
    form = CustomUserAdminForm
    list_display = ('username', 'email', 'role', 'is_staff', 'password', 'full_name', 'gender', 'dob', 'mobile', 'residential', 'permanent', 'get_id_field')
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('role', 'full_name', 'gender', 'dob', 'mobile', 'residential', 'permanent')}),
    )

    def get_id_field(self, obj):
        """Display the appropriate ID field based on user role"""
        if obj.role == 'student':
            return obj.student_id or 'Not set'
        elif obj.role in ['faculty', 'counselor', 'admin', 'clinic']:
            return obj.faculty_id or 'Not set'
        return 'N/A'
    get_id_field.short_description = 'ID'  # Default short description
    get_id_field.admin_order_field = 'faculty_id'  # Allow sorting

    def get_fieldsets(self, request, obj=None):
        fieldsets = super().get_fieldsets(request, obj)
        new_fieldsets = []
        for name, opts in fieldsets:
            fields = list(opts.get('fields', ()))
            # Add conditional fields
            if obj:
                if obj.role == 'student':
                    if 'guardian_email' not in fields:
                        fields.append('guardian_email')
                    if 'student_id' not in fields:
                        fields.append('student_id')
                    if 'grade' not in fields:
                        fields.append('grade')
                    if 'section' not in fields:
                        fields.append('section')
                if obj.role in ['faculty', 'counselor', 'admin', 'clinic']:
                    if 'faculty_id' not in fields:
                        fields.append('faculty_id')
            new_fieldsets.append((name, {**opts, 'fields': tuple(fields)}))
        return new_fieldsets

    def get_list_display(self, request):
        """Override to ensure ID field is always shown in list"""
        base = list(super().get_list_display(request))
        if 'get_id_field' not in base:
            base.append('get_id_field')
        return tuple(base)

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if obj:
            # Update field labels based on role
            if obj.role == 'student' and 'student_id' in form.base_fields:
                form.base_fields['student_id'].label = 'Student ID'
            elif obj.role == 'faculty' and 'faculty_id' in form.base_fields:
                form.base_fields['faculty_id'].label = 'Faculty ID'
            elif obj.role == 'counselor' and 'faculty_id' in form.base_fields:
                form.base_fields['faculty_id'].label = 'Counselor ID'
            elif obj.role == 'admin' and 'faculty_id' in form.base_fields:
                form.base_fields['faculty_id'].label = 'Admin ID'
            elif obj.role == 'clinic' and 'faculty_id' in form.base_fields:
                form.base_fields['faculty_id'].label = 'Nurse ID'
        else:
            # For new users, set default labels
            if 'student_id' in form.base_fields:
                form.base_fields['student_id'].label = 'Student ID'
            if 'faculty_id' in form.base_fields:
                form.base_fields['faculty_id'].label = 'Faculty ID'
        return form

    def changelist_view(self, request, extra_context=None):
        """Override to set dynamic column headers"""
        response = super().changelist_view(request, extra_context)
        if hasattr(response, 'context_data'):
            # Update the ID column header based on the current filter
            role_filter = request.GET.get('role')
            if role_filter:
                if role_filter == 'student':
                    self.get_id_field.short_description = 'Student ID'
                elif role_filter == 'faculty':
                    self.get_id_field.short_description = 'Faculty ID'
                elif role_filter == 'counselor':
                    self.get_id_field.short_description = 'Counselor ID'
                elif role_filter == 'admin':
                    self.get_id_field.short_description = 'Admin ID'
                elif role_filter == 'clinic':
                    self.get_id_field.short_description = 'Nurse ID'
                else:
                    self.get_id_field.short_description = 'ID'
        return response

    def save_model(self, request, obj, form, change):
        """Override to ensure ID is generated if missing"""
        if not change:  # Only for new users
            from .views import generate_student_id, generate_faculty_id, generate_counselor_id, generate_admin_id, generate_clinic_id
            
            if obj.role == 'student' and not obj.student_id:
                obj.student_id = generate_student_id()
            elif obj.role == 'faculty' and not obj.faculty_id:
                obj.faculty_id = generate_faculty_id()
            elif obj.role == 'counselor' and not obj.faculty_id:
                obj.faculty_id = generate_counselor_id()
            elif obj.role == 'admin' and not obj.faculty_id:
                obj.faculty_id = generate_admin_id()
            elif obj.role == 'clinic' and not obj.faculty_id:
                obj.faculty_id = generate_clinic_id()
        
        super().save_model(request, obj, form, change)

    def get_formset_kwargs(self, request, obj=None, **kwargs):
        """Override to handle dynamic field visibility"""
        kwargs = super().get_formset_kwargs(request, obj, **kwargs)
        if obj:
            # Update field labels based on role
            if obj.role == 'student':
                kwargs['labels'] = {'student_id': 'Student ID'}
            elif obj.role == 'faculty':
                kwargs['labels'] = {'faculty_id': 'Faculty ID'}
            elif obj.role == 'counselor':
                kwargs['labels'] = {'faculty_id': 'Counselor ID'}
            elif obj.role == 'admin':
                kwargs['labels'] = {'faculty_id': 'Admin ID'}
            elif obj.role == 'clinic':
                kwargs['labels'] = {'faculty_id': 'Nurse ID'}
        return kwargs

admin.site.register(User, CustomUserAdmin)
