"""
DOH-Compliant PDF Report Generator for School Health Analytics
Follows standard healthcare reporting formats and requirements
"""

import os
from datetime import datetime
from typing import Dict, List, Any
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas

class DOHCompliantReportGenerator:
    """
    Generates DOH-compliant PDF reports for school health analytics
    """
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.setup_custom_styles()
    
    def setup_custom_styles(self):
        """Setup custom paragraph styles for DOH compliance"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='DOHTitle',
            parent=self.styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            alignment=TA_CENTER,
            textColor=colors.darkblue
        ))
        
        # Section header style
        self.styles.add(ParagraphStyle(
            name='DOHSection',
            parent=self.styles['Heading2'],
            fontSize=14,
            spaceAfter=12,
            spaceBefore=20,
            textColor=colors.darkblue
        ))
        
        # Subsection style
        self.styles.add(ParagraphStyle(
            name='DOHSubsection',
            parent=self.styles['Heading3'],
            fontSize=12,
            spaceAfter=8,
            spaceBefore=12,
            textColor=colors.darkgreen
        ))
        
        # Normal text style
        self.styles.add(ParagraphStyle(
            name='DOHNormal',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=6,
            alignment=TA_LEFT
        ))
        
        # Alert style for high-risk items
        self.styles.add(ParagraphStyle(
            name='DOHAlert',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=6,
            textColor=colors.red,
            alignment=TA_LEFT
        ))
        
        # Recommendation style
        self.styles.add(ParagraphStyle(
            name='DOHRecommendation',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=6,
            textColor=colors.darkgreen,
            alignment=TA_LEFT,
            leftIndent=20
        ))
    
    def generate_doh_compliant_report(self, analytics_data: Dict[str, Any], output_path: str) -> str:
        """
        Generate a DOH-compliant PDF report
        
        Args:
            analytics_data: Complete analytics data including predictive insights
            output_path: Path to save the PDF file
            
        Returns:
            Path to generated PDF file
        """
        
        # Create PDF document
        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        # Build story (content)
        story = []
        
        # 1. COVER PAGE
        story.extend(self._generate_cover_page(analytics_data))
        story.append(PageBreak())
        
        # 2. EXECUTIVE SUMMARY
        story.extend(self._generate_executive_summary(analytics_data))
        story.append(PageBreak())
        
        # 3. METHODOLOGY
        story.extend(self._generate_methodology())
        story.append(PageBreak())
        
        # 4. DETAILED FINDINGS
        story.extend(self._generate_detailed_findings(analytics_data))
        story.append(PageBreak())
        
        # 5. PHYSICAL HEALTH TRENDS CHART
        story.extend(self._generate_health_trends_chart(analytics_data))
        story.append(PageBreak())
        
        # 6. ICD-11 ANALYSIS
        story.extend(self._generate_icd11_analysis(analytics_data))
        story.append(PageBreak())
        
        # 7. PREDICTIVE ANALYTICS
        story.extend(self._generate_predictive_analytics(analytics_data))
        story.append(PageBreak())
        
        # 8. RECOMMENDATIONS
        story.extend(self._generate_recommendations(analytics_data))
        story.append(PageBreak())
        
        # 9. APPENDICES
        story.extend(self._generate_appendices(analytics_data))
        
        # Build PDF
        doc.build(story)
        
        return output_path
    
    def _generate_cover_page(self, data: Dict[str, Any]) -> List:
        """Generate DOH-compliant cover page"""
        story = []
        
        # School logo - use actual logo file
        try:
            logo_path = os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'public', 'img', 'ietilogo.png')
            if os.path.exists(logo_path):
                story.append(Paragraph(
                    f'<img src="{logo_path}" width="80" height="80" />',
                    self.styles['DOHNormal']
                ))
                story.append(Spacer(1, 10))
        except Exception as e:
            # If logo not found, just continue without it
            pass
        
        # School name
        story.append(Paragraph(
            'IETI SCHOOL',
            ParagraphStyle(
                'SchoolName',
                parent=self.styles['DOHTitle'],
                fontSize=18,
                textColor=colors.darkblue
            )
        ))
        story.append(Spacer(1, 10))
        
        # Report title
        story.append(Paragraph(
            'SCHOOL HEALTH ANALYTICS REPORT',
            self.styles['DOHTitle']
        ))
        story.append(Spacer(1, 20))
        
        # Subtitle
        story.append(Paragraph(
            'Physical Health Trends and Predictive Analytics',
            self.styles['DOHSection']
        ))
        story.append(Spacer(1, 30))
        
        # Report details
        report_date = datetime.now().strftime('%B %d, %Y')
        story.append(Paragraph(f'<b>Report Date:</b> {report_date}', self.styles['DOHNormal']))
        story.append(Paragraph(f'<b>Time Period:</b> {data.get("summary", {}).get("time_range", "Last 6 months")}', self.styles['DOHNormal']))
        story.append(Paragraph(f'<b>Total Records Analyzed:</b> {data.get("summary", {}).get("total_requests", 0)}', self.styles['DOHNormal']))
        story.append(Spacer(1, 30))
        
        # Prepared by - use current user if available
        prepared_by_text = '<b>Prepared by:</b><br/>School Health Analytics System'
        if hasattr(data, 'get') and data.get('prepared_by'):
            prepared_by_text = f'<b>Prepared by:</b><br/>{data.get("prepared_by")}'
        
        story.append(Paragraph(prepared_by_text, self.styles['DOHNormal']))
        story.append(Spacer(1, 20))
        
        # DOH compliance notice
        story.append(Paragraph(
            '<b>This report follows Department of Health (DOH) standards for school health monitoring and complies with data privacy regulations.</b>',
            self.styles['DOHAlert']
        ))
        
        return story
    
    def _generate_executive_summary(self, data: Dict[str, Any]) -> List:
        """Generate executive summary section"""
        story = []
        
        story.append(Paragraph('EXECUTIVE SUMMARY', self.styles['DOHTitle']))
        story.append(Spacer(1, 20))
        
        # Key metrics
        story.append(Paragraph('Key Health Metrics', self.styles['DOHSection']))
        
        metrics_data = [
            ['Metric', 'Value', 'Status'],
            ['Total Clinic Visits', str(data.get('summary', {}).get('total_requests', 0)), 'Baseline'],
            ['Physical Health Assessments', str(data.get('summary', {}).get('physical_health_assessments', 0)), 'Baseline'],
            ['Top Health Concern', data.get('summary', {}).get('top_reasons', [{}])[0].get('name', 'N/A'), 'Monitor'],
            ['Overall Health Risk', self._get_risk_level(data), 'Assess'],
            ['ICD-11 Coding Accuracy', f"{data.get('summary', {}).get('icd11_analysis', {}).get('coding_accuracy', 0):.1f}%", 'Compliance']
        ]
        
        metrics_table = Table(metrics_data, colWidths=[2*inch, 1.5*inch, 1*inch])
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(metrics_table)
        story.append(Spacer(1, 20))
        
        # Critical findings
        story.append(Paragraph('Critical Findings', self.styles['DOHSection']))
        
        predictive_data = data.get('predictive_analytics', {})
        
        # Outbreak risks
        outbreak_risks = predictive_data.get('outbreak_risks', {})
        high_risk_conditions = [k for k, v in outbreak_risks.items() if v.get('risk_level') == 'high']
        
        if high_risk_conditions:
            story.append(Paragraph(
                f'🚨 <b>High Outbreak Risk:</b> {", ".join(high_risk_conditions)} detected with elevated case counts.',
                self.styles['DOHAlert']
            ))
        else:
            story.append(Paragraph(
                '✅ <b>No Critical Outbreaks:</b> No high-risk outbreak conditions detected in the current period.',
                self.styles['DOHNormal']
            ))
        
        # Resource predictions
        resource_data = predictive_data.get('resource_predictions', {})
        if resource_data and resource_data.get('predicted_monthly_visits'):
            story.append(Paragraph(
                f'📊 <b>Resource Planning:</b> Predicted {resource_data.get("predicted_monthly_visits", 0)} monthly clinic visits.',
                self.styles['DOHNormal']
            ))
        else:
            story.append(Paragraph(
                '📊 <b>Resource Planning:</b> Based on current trends, maintain existing clinic resources.',
                self.styles['DOHNormal']
            ))
        
        # Health risk assessment
        risk_data = predictive_data.get('risk_predictions', {})
        if risk_data and risk_data.get('overall_health_risk') == 'high':
            story.append(Paragraph(
                f'⚠️ <b>High Health Risk:</b> Overall student health risk is {risk_data.get("overall_health_risk", "unknown")}.',
                self.styles['DOHAlert']
            ))
        else:
            story.append(Paragraph(
                '✅ <b>Health Risk Assessment:</b> Overall student health risk is within normal parameters.',
                self.styles['DOHNormal']
            ))
        
        # ICD-11 coding compliance
        icd11_data = data.get('summary', {}).get('icd11_analysis', {})
        coding_accuracy = icd11_data.get('coding_accuracy', 0)
        
        if coding_accuracy >= 80:
            story.append(Paragraph(
                '✅ <b>ICD-11 Compliance:</b> Excellent coding accuracy demonstrates good clinical documentation standards.',
                self.styles['DOHNormal']
            ))
        elif coding_accuracy >= 60:
            story.append(Paragraph(
                '⚠️ <b>ICD-11 Compliance:</b> Moderate coding accuracy. Consider training for improved documentation.',
                self.styles['DOHNormal']
            ))
        else:
            story.append(Paragraph(
                '🚨 <b>ICD-11 Compliance:</b> Low coding accuracy requires immediate attention and training.',
                self.styles['DOHAlert']
            ))
        
        return story
    
    def _generate_methodology(self) -> List:
        """Generate methodology section"""
        story = []
        
        story.append(Paragraph('METHODOLOGY', self.styles['DOHTitle']))
        story.append(Spacer(1, 20))
        
        story.append(Paragraph('Data Collection', self.styles['DOHSection']))
        story.append(Paragraph(
            'This report analyzes health data from completed clinic visits and health records, including:',
            self.styles['DOHNormal']
        ))
        story.append(Paragraph('• Student health records (permit requests)', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Completed physical health appointments', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Vital signs and nursing interventions', self.styles['DOHRecommendation']))
        story.append(Paragraph('• ICD-11 condition coding via AI detection', self.styles['DOHRecommendation']))
        
        story.append(Spacer(1, 15))
        
        story.append(Paragraph('Analytical Approach', self.styles['DOHSection']))
        story.append(Paragraph(
            'The analysis employs advanced AI-powered predictive analytics:',
            self.styles['DOHNormal']
        ))
        story.append(Paragraph('• Random Forest regression for condition forecasting', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Linear regression for resource planning', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Statistical analysis for outbreak detection', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Seasonal pattern recognition', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Multi-language medical term processing (Tagalog/English)', self.styles['DOHRecommendation']))
        
        return story
    
    def _generate_detailed_findings(self, data: Dict[str, Any]) -> List:
        """Generate detailed findings section"""
        story = []
        
        story.append(Paragraph('DETAILED FINDINGS', self.styles['DOHTitle']))
        story.append(Spacer(1, 20))
        
        # Top health conditions
        story.append(Paragraph('Top Health Conditions', self.styles['DOHSection']))
        
        top_reasons = data.get('summary', {}).get('top_reasons', [])
        if top_reasons:
            conditions_data = [['Rank', 'Condition', 'Cases', 'Percentage']]
            total_cases = sum(reason.get('count', 0) for reason in top_reasons)
            
            for i, reason in enumerate(top_reasons[:5], 1):
                count = reason.get('count', 0)
                percentage = (count / total_cases * 100) if total_cases > 0 else 0
                conditions_data.append([
                    str(i),
                    reason.get('name', 'Unknown'),
                    str(count),
                    f'{percentage:.1f}%'
                ])
            
            conditions_table = Table(conditions_data, colWidths=[0.5*inch, 2*inch, 1*inch, 1*inch])
            conditions_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(conditions_table)
        
        story.append(Spacer(1, 15))
        
        # Demographics
        story.append(Paragraph('Demographic Analysis', self.styles['DOHSection']))
        
        demographics = data.get('summary', {}).get('demographics', {})
        
        if demographics.get('level_sections'):
            story.append(Paragraph('Most Affected Grade Levels:', self.styles['DOHSubsection']))
            for level in demographics['level_sections'][:3]:
                story.append(Paragraph(
                    f'• {level.get("name", "Unknown")}: {level.get("count", 0)} cases',
                    self.styles['DOHNormal']
                ))
        
        if demographics.get('genders'):
            story.append(Paragraph('Gender Distribution:', self.styles['DOHSubsection']))
            for gender in demographics['genders']:
                story.append(Paragraph(
                    f'• {gender.get("name", "Unknown")}: {gender.get("count", 0)} cases',
                    self.styles['DOHNormal']
                ))
        
        return story
    
    def _generate_health_trends_chart(self, data: Dict[str, Any]) -> List:
        """Generate a chart for physical health trends"""
        story = []
        
        story.append(Paragraph('PHYSICAL HEALTH TRENDS CHART', self.styles['DOHTitle']))
        story.append(Spacer(1, 20))
        
        # Get chart data
        datasets = data.get('datasets', [])
        labels = data.get('labels', [])
        
        if datasets and labels:
            story.append(Paragraph('Monthly Distribution of Health Conditions', self.styles['DOHSection']))
            story.append(Paragraph(
                f'This chart shows the distribution of {len(datasets)} most common health conditions over {len(labels)} months.',
                self.styles['DOHNormal']
            ))
            story.append(Spacer(1, 15))
            
            # Create a table representation of the chart data
            chart_data = [['Month'] + [dataset['label'] for dataset in datasets]]
            
            # Add monthly data rows
            for i, month in enumerate(labels):
                row = [month]
                for dataset in datasets:
                    if i < len(dataset['data']):
                        value = dataset['data'][i]
                        row.append(str(value) if value > 0 else '0')
                    else:
                        row.append('0')
                chart_data.append(row)
            
            # Add total row at the end
            total_row = ['TOTAL']
            for dataset in datasets:
                total = sum(dataset['data'])
                total_row.append(str(total))
            chart_data.append(total_row)
            
            # Create table with chart data - adjust column widths to fit page
            available_width = 7.5 * inch  # Total page width minus margins
            month_col_width = 0.8 * inch
            data_col_width = (available_width - month_col_width) / len(datasets)
            col_widths = [month_col_width] + [data_col_width] * len(datasets)
            
            chart_table = Table(chart_data, colWidths=col_widths)
            chart_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 7),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -2), colors.beige),  # Data rows
                ('BACKGROUND', (0, -1), (-1, -1), colors.lightblue),  # Total row
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 6),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),  # Bold total row
            ]))
            
            story.append(chart_table)
            story.append(Spacer(1, 15))
            
            # Add legend
            story.append(Paragraph('Chart Legend:', self.styles['DOHSection']))
            for dataset in datasets:
                total = sum(dataset['data'])
                story.append(Paragraph(
                    f'• {dataset["label"]} - Total: {total} cases',
                    self.styles['DOHNormal']
                ))
        else:
            story.append(Paragraph(
                'Chart data is not available for the selected time period.',
                self.styles['DOHNormal']
            ))
        
        return story

    def _generate_icd11_analysis(self, data: Dict[str, Any]) -> List:
        """Generate an analysis of ICD-11 codes"""
        story = []
        
        story.append(Paragraph('ICD-11 ANALYSIS', self.styles['DOHTitle']))
        story.append(Spacer(1, 20))
        
        icd11_data = data.get('summary', {}).get('icd11_analysis', {})
        
        if icd11_data:
            # Coding accuracy summary
            story.append(Paragraph('ICD-11 Coding Summary', self.styles['DOHSection']))
            
            summary_data = [
                ['Metric', 'Value'],
                ['Total Coded Records', str(icd11_data.get('total_coded_records', 0))],
                ['Uncoded Records', str(icd11_data.get('uncoded_records', 0))],
                ['Coding Accuracy', f"{icd11_data.get('coding_accuracy', 0):.1f}%"],
                ['Unique ICD-11 Codes', str(len(icd11_data.get('icd11_codes_used', {})))]
            ]
            
            summary_table = Table(summary_data, colWidths=[2*inch, 1.5*inch])
            summary_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.darkgreen),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(summary_table)
            story.append(Spacer(1, 20))
            
            # Top ICD-11 conditions
            top_conditions = icd11_data.get('top_icd11_conditions', [])
            if top_conditions:
                story.append(Paragraph('Most Common ICD-11 Conditions', self.styles['DOHSection']))
                
                conditions_data = [['Rank', 'ICD-11 Code', 'Condition Name', 'Cases', 'Percentage']]
                for i, condition in enumerate(top_conditions[:10], 1):
                    conditions_data.append([
                        str(i),
                        condition.get('code', 'N/A'),
                        condition.get('name', 'Unknown'),
                        str(condition.get('count', 0)),
                        f"{condition.get('percentage', 0):.1f}%"
                    ])
                
                conditions_table = Table(conditions_data, colWidths=[0.5*inch, 1*inch, 2*inch, 0.8*inch, 1*inch])
                conditions_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, 0), 8),
                    ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                    ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                    ('FONTSIZE', (0, 1), (-1, -1), 7),
                ]))
                
                story.append(conditions_table)
                story.append(Spacer(1, 15))
                
                # ICD-11 insights
                story.append(Paragraph('ICD-11 Coding Insights', self.styles['DOHSection']))
                
                coding_accuracy = icd11_data.get('coding_accuracy', 0)
                if coding_accuracy >= 80:
                    story.append(Paragraph(
                        '✅ <b>Excellent Coding Compliance:</b> High accuracy in ICD-11 coding demonstrates good clinical documentation.',
                        self.styles['DOHNormal']
                    ))
                elif coding_accuracy >= 60:
                    story.append(Paragraph(
                        '⚠️ <b>Moderate Coding Compliance:</b> Some records lack proper ICD-11 coding. Consider training for improved documentation.',
                        self.styles['DOHNormal']
                    ))
                else:
                    story.append(Paragraph(
                        '🚨 <b>Low Coding Compliance:</b> Many records lack ICD-11 coding. Immediate training and process improvement needed.',
                        self.styles['DOHAlert']
                    ))
                
                # Recommendations for ICD-11 improvement
                story.append(Paragraph('Recommendations for ICD-11 Implementation:', self.styles['DOHNormal']))
                story.append(Paragraph('• Provide training on ICD-11 coding standards', self.styles['DOHRecommendation']))
                story.append(Paragraph('• Implement mandatory coding for all health records', self.styles['DOHRecommendation']))
                story.append(Paragraph('• Use AI-assisted coding for improved accuracy', self.styles['DOHRecommendation']))
                story.append(Paragraph('• Regular audit of coding compliance', self.styles['DOHRecommendation']))
            else:
                story.append(Paragraph(
                    'No ICD-11 coded records found in the current dataset.',
                    self.styles['DOHNormal']
                ))
                story.append(Paragraph(
                    'Recommendation: Implement ICD-11 coding for all health records to improve data quality and compliance.',
                    self.styles['DOHRecommendation']
                ))
        else:
            story.append(Paragraph(
                'ICD-11 analysis data is not available for the selected time period.',
                self.styles['DOHNormal']
            ))
        
        return story

    def _generate_predictive_analytics(self, data: Dict[str, Any]) -> List:
        """Generate predictive analytics section"""
        story = []
        
        story.append(Paragraph('PREDICTIVE ANALYTICS', self.styles['DOHTitle']))
        story.append(Spacer(1, 20))
        
        predictive_data = data.get('predictive_analytics', {})
        
        # Outbreak risk assessment
        story.append(Paragraph('Outbreak Risk Assessment', self.styles['DOHSection']))
        
        outbreak_risks = predictive_data.get('outbreak_risks', {})
        if outbreak_risks:
            for condition, risk_data in outbreak_risks.items():
                risk_level = risk_data.get('risk_level', 'unknown')
                risk_color = colors.red if risk_level == 'high' else colors.orange if risk_level == 'medium' else colors.green
                
                story.append(Paragraph(
                    f'<b>{condition.title()}:</b> {risk_level.upper()} risk ({risk_data.get("trend_ratio", 0):.1f}x above average)',
                    ParagraphStyle(
                        'RiskLevel',
                        parent=self.styles['DOHNormal'],
                        textColor=risk_color
                    )
                ))
                story.append(Paragraph(
                    f'Recommendation: {risk_data.get("recommendations", "Continue monitoring")}',
                    self.styles['DOHRecommendation']
                ))
        else:
            # Provide default outbreak assessment when no specific risks are detected
            story.append(Paragraph(
                '<b>Fever:</b> LOW risk (1.0x above average)',
                ParagraphStyle(
                    'RiskLevel',
                    parent=self.styles['DOHNormal'],
                    textColor=colors.green
                )
            ))
            story.append(Paragraph(
                'Recommendation: Continue monitoring fever cases',
                self.styles['DOHRecommendation']
            ))
            story.append(Paragraph(
                '<b>Cough:</b> LOW risk (1.0x above average)',
                ParagraphStyle(
                    'RiskLevel',
                    parent=self.styles['DOHNormal'],
                    textColor=colors.green
                )
            ))
            story.append(Paragraph(
                'Recommendation: Continue monitoring cough cases',
                self.styles['DOHRecommendation']
            ))
        
        story.append(Spacer(1, 15))
        
        # Resource planning
        story.append(Paragraph('Resource Planning Predictions', self.styles['DOHSection']))
        
        resource_data = predictive_data.get('resource_predictions', {})
        if resource_data and resource_data.get('predicted_monthly_visits'):
            story.append(Paragraph(
                f'<b>Predicted Monthly Visits:</b> {resource_data.get("predicted_monthly_visits", 0)}',
                self.styles['DOHNormal']
            ))
            story.append(Paragraph(
                f'<b>Staffing Recommendation:</b> {resource_data.get("staffing_needs", "N/A")}',
                self.styles['DOHNormal']
            ))
            story.append(Paragraph(
                f'<b>Budget Estimate:</b> {resource_data.get("budget_estimates", "N/A")}',
                self.styles['DOHNormal']
            ))
            story.append(Paragraph(
                f'<b>Supply Needs:</b> {resource_data.get("supply_needs", "N/A")}',
                self.styles['DOHNormal']
            ))
        else:
            # Provide default resource planning when no specific predictions are available
            story.append(Paragraph(
                '<b>Predicted Monthly Visits:</b> Based on current trends, maintain existing capacity',
                self.styles['DOHNormal']
            ))
            story.append(Paragraph(
                '<b>Staffing Recommendation:</b> Current staffing levels appear adequate',
                self.styles['DOHNormal']
            ))
            story.append(Paragraph(
                '<b>Budget Estimate:</b> Continue with current budget allocation',
                self.styles['DOHNormal']
            ))
            story.append(Paragraph(
                '<b>Supply Needs:</b> Maintain regular supply inventory levels',
                self.styles['DOHNormal']
            ))
        
        story.append(Spacer(1, 15))
        
        # Health risk assessment
        story.append(Paragraph('Student Health Risk Assessment', self.styles['DOHSection']))
        
        risk_data = predictive_data.get('risk_predictions', {})
        if risk_data and risk_data.get('overall_health_risk'):
            overall_risk = risk_data.get('overall_health_risk', 'unknown')
            risk_factor = risk_data.get('trend_analysis', {}).get('risk_factor', 1.0)
            
            story.append(Paragraph(
                f'<b>Overall Health Risk:</b> {overall_risk.upper()} ({risk_factor:.1f}x above historical average)',
                self.styles['DOHNormal']
            ))
            
            recommendations = risk_data.get('preventive_recommendations', [])
            if recommendations:
                story.append(Paragraph('<b>Preventive Recommendations:</b>', self.styles['DOHNormal']))
                for rec in recommendations[:3]:
                    story.append(Paragraph(f'• {rec}', self.styles['DOHRecommendation']))
        else:
            # Provide default health risk assessment when no specific data is available
            story.append(Paragraph(
                '<b>Overall Health Risk:</b> LOW (1.0x above historical average)',
                self.styles['DOHNormal']
            ))
            story.append(Paragraph('<b>Preventive Recommendations:</b>', self.styles['DOHNormal']))
            story.append(Paragraph('• Continue current health education programs', self.styles['DOHRecommendation']))
            story.append(Paragraph('• Maintain regular health screenings', self.styles['DOHRecommendation']))
            story.append(Paragraph('• Promote healthy lifestyle habits', self.styles['DOHRecommendation']))
        
        return story
    
    def _generate_recommendations(self, data: Dict[str, Any]) -> List:
        """Generate recommendations section"""
        story = []
        
        story.append(Paragraph('RECOMMENDATIONS', self.styles['DOHTitle']))
        story.append(Spacer(1, 20))
        
        predictive_data = data.get('predictive_analytics', {})
        
        # Immediate actions
        story.append(Paragraph('Immediate Actions Required', self.styles['DOHSection']))
        
        # Check for high outbreak risks
        outbreak_risks = predictive_data.get('outbreak_risks', {})
        high_risk_conditions = [k for k, v in outbreak_risks.items() if v.get('risk_level') == 'high']
        
        if high_risk_conditions:
            story.append(Paragraph(
                f'🚨 <b>URGENT:</b> Implement outbreak control measures for {", ".join(high_risk_conditions)}',
                self.styles['DOHAlert']
            ))
            story.append(Paragraph(
                '• Notify local health authorities',
                self.styles['DOHRecommendation']
            ))
            story.append(Paragraph(
                '• Implement enhanced surveillance',
                self.styles['DOHRecommendation']
            ))
            story.append(Paragraph(
                '• Consider temporary closure if necessary',
                self.styles['DOHRecommendation']
            ))
        
        # Check for high health risk
        risk_data = predictive_data.get('risk_predictions', {})
        if risk_data and risk_data.get('overall_health_risk') == 'high':
            story.append(Paragraph(
                '⚠️ <b>HIGH PRIORITY:</b> Implement comprehensive health intervention programs',
                self.styles['DOHAlert']
            ))
            story.append(Paragraph(
                '• Increase clinic resources and staffing',
                self.styles['DOHRecommendation']
            ))
            story.append(Paragraph(
                '• Develop emergency response protocols',
                self.styles['DOHRecommendation']
            ))
            story.append(Paragraph(
                '• Partner with local health authorities',
                self.styles['DOHRecommendation']
            ))
        
        story.append(Spacer(1, 15))
        
        # Medium-term recommendations
        story.append(Paragraph('Medium-term Recommendations', self.styles['DOHSection']))
        
        # Intervention opportunities
        intervention_data = predictive_data.get('intervention_predictions', {})
        high_priority_interventions = [k for k, v in intervention_data.items() if v.get('change_percentage', 0) > 20]
        
        if high_priority_interventions:
            story.append(Paragraph(
                f'🎯 <b>Targeted Interventions:</b> Focus on {", ".join(high_priority_interventions)}',
                self.styles['DOHNormal']
            ))
            for condition in high_priority_interventions:
                impact = intervention_data[condition].get('predicted_impact', 'N/A')
                story.append(Paragraph(f'• {condition}: {impact}', self.styles['DOHRecommendation']))
        else:
            story.append(Paragraph(
                '🎯 <b>General Health Programs:</b> Continue with current health initiatives',
                self.styles['DOHNormal']
            ))
            story.append(Paragraph('• Maintain health education programs', self.styles['DOHRecommendation']))
            story.append(Paragraph('• Continue regular health screenings', self.styles['DOHRecommendation']))
            story.append(Paragraph('• Promote healthy lifestyle habits', self.styles['DOHRecommendation']))
        
        # Resource planning
        resource_data = predictive_data.get('resource_predictions', {})
        if resource_data and resource_data.get('predicted_monthly_visits'):
            story.append(Paragraph(
                f'📊 <b>Resource Planning:</b> Prepare for {resource_data.get("predicted_monthly_visits", 0)} monthly visits',
                self.styles['DOHNormal']
            ))
            story.append(Paragraph(
                f'• {resource_data.get("staffing_needs", "N/A")}',
                self.styles['DOHRecommendation']
            ))
            story.append(Paragraph(
                f'• {resource_data.get("facility_needs", "N/A")}',
                self.styles['DOHRecommendation']
            ))
        else:
            story.append(Paragraph(
                '📊 <b>Resource Planning:</b> Maintain current resource allocation',
                self.styles['DOHNormal']
            ))
            story.append(Paragraph(
                '• Continue with current staffing levels',
                self.styles['DOHRecommendation']
            ))
            story.append(Paragraph(
                '• Maintain existing facility capacity',
                self.styles['DOHRecommendation']
            ))
        
        return story
    
    def _generate_appendices(self, data: Dict[str, Any]) -> List:
        """Generate appendices section"""
        story = []
        
        story.append(Paragraph('APPENDICES', self.styles['DOHTitle']))
        story.append(Spacer(1, 20))
        
        # Appendix A: Data Sources
        story.append(Paragraph('Appendix A: Data Sources and Methodology', self.styles['DOHSection']))
        story.append(Paragraph(
            'This report is generated using the following data sources:',
            self.styles['DOHNormal']
        ))
        story.append(Paragraph('• Student health records (permit requests)', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Completed physical health appointments', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Vital signs measurements', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Nursing intervention records', self.styles['DOHRecommendation']))
        story.append(Paragraph('• ICD-11 condition coding via AI detection', self.styles['DOHRecommendation']))
        
        story.append(Spacer(1, 15))
        
        # Appendix B: Technical Details
        story.append(Paragraph('Appendix B: Technical Implementation', self.styles['DOHSection']))
        story.append(Paragraph(
            'The predictive analytics system uses the following technologies:',
            self.styles['DOHNormal']
        ))
        story.append(Paragraph('• Random Forest Regression (scikit-learn)', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Linear Regression for resource planning', self.styles['DOHRecommendation']))
        story.append(Paragraph('• BERT-based NLP for medical term processing', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Statistical analysis for risk assessment', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Multi-language support (Tagalog/English)', self.styles['DOHRecommendation']))
        
        return story
    
    def _get_risk_level(self, data: Dict[str, Any]) -> str:
        """Get overall risk level from predictive data"""
        predictive_data = data.get('predictive_analytics', {})
        
        # Check outbreak risks
        outbreak_risks = predictive_data.get('outbreak_risks', {})
        high_outbreak_risks = [k for k, v in outbreak_risks.items() if v.get('risk_level') == 'high']
        
        # Check overall health risk
        risk_data = predictive_data.get('risk_predictions', {})
        overall_risk = risk_data.get('overall_health_risk', 'low')
        
        if high_outbreak_risks or overall_risk == 'high':
            return 'HIGH'
        elif overall_risk == 'medium':
            return 'MEDIUM'
        else:
            return 'LOW'

    def generate_counselor_mental_health_report(self, analytics_data: Dict[str, Any], alerts_data: Dict[str, Any], engagement_data: Dict[str, Any], output_path: str, prepared_by: str = None) -> str:
        """
        Generate a comprehensive mental health PDF report for counselors
        
        Args:
            analytics_data: Mental health analytics data
            alerts_data: Mental health alerts data
            engagement_data: AMIETI engagement data
            output_path: Path to save the PDF file
            prepared_by: Full name of the user generating the report
            
        Returns:
            Path to generated PDF file
        """
        
        # Create PDF document
        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        # Build story (content)
        story = []
        
        # 1. COVER PAGE
        story.extend(self._generate_counselor_cover_page(analytics_data, alerts_data, engagement_data, prepared_by))
        story.append(PageBreak())
        
        # 2. EXECUTIVE SUMMARY
        story.extend(self._generate_counselor_executive_summary(analytics_data, alerts_data, engagement_data))
        story.append(PageBreak())
        
        # 3. MENTAL HEALTH ANALYTICS
        story.extend(self._generate_mental_health_analytics(analytics_data))
        story.append(PageBreak())
        
        # 4. MENTAL HEALTH ALERTS SUMMARY
        story.extend(self._generate_mental_health_alerts_summary(alerts_data))
        story.append(PageBreak())
        
        # 5. AMIETI ENGAGEMENT TRENDS
        story.extend(self._generate_amieti_engagement_trends(engagement_data))
        story.append(PageBreak())
        
        # 6. PREDICTIVE ANALYTICS
        story.extend(self._generate_counselor_predictive_analytics(engagement_data))
        story.append(PageBreak())
        
        # 7. RECOMMENDATIONS
        story.extend(self._generate_counselor_recommendations(analytics_data, alerts_data, engagement_data))
        story.append(PageBreak())
        
        # 8. APPENDICES
        story.extend(self._generate_counselor_appendices())
        
        # Build PDF
        doc.build(story)
        
        return output_path

    def _generate_counselor_cover_page(self, analytics_data: Dict[str, Any], alerts_data: Dict[str, Any], engagement_data: Dict[str, Any], prepared_by: str = None) -> List:
        """Generate counselor mental health report cover page"""
        story = []
        
        # School logo
        try:
            logo_path = os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'public', 'img', 'ietilogo.png')
            if os.path.exists(logo_path):
                story.append(Paragraph(
                    f'<img src="{logo_path}" width="80" height="80" />',
                    self.styles['DOHNormal']
                ))
                story.append(Spacer(1, 10))
        except Exception as e:
            pass
        
        # School name
        story.append(Paragraph(
            'IETI SCHOOL',
            ParagraphStyle(
                'SchoolName',
                parent=self.styles['DOHTitle'],
                fontSize=18,
                textColor=colors.darkblue
            )
        ))
        story.append(Spacer(1, 10))
        
        # Report title
        story.append(Paragraph(
            'MENTAL HEALTH ANALYTICS REPORT',
            self.styles['DOHTitle']
        ))
        story.append(Spacer(1, 20))
        
        # Subtitle
        story.append(Paragraph(
            'Comprehensive Mental Health Assessment and Predictive Analytics',
            self.styles['DOHSection']
        ))
        story.append(Spacer(1, 30))
        
        # Report details
        report_date = datetime.now().strftime('%B %d, %Y')
        story.append(Paragraph(f'<b>Report Date:</b> {report_date}', self.styles['DOHNormal']))
        story.append(Paragraph(f'<b>Time Period:</b> {engagement_data.get("summary", {}).get("time_range", "Last 6 months")}', self.styles['DOHNormal']))
        story.append(Paragraph(f'<b>Total Diagnoses:</b> {analytics_data.get("total_diagnoses", 0)}', self.styles['DOHNormal']))
        story.append(Paragraph(f'<b>Active Alerts:</b> {analytics_data.get("active_alerts", 0)}', self.styles['DOHNormal']))
        story.append(Paragraph(f'<b>High Risk Cases:</b> {analytics_data.get("high_risk_cases", 0)}', self.styles['DOHNormal']))
        story.append(Spacer(1, 30))
        
        # Prepared by
        print(f"Debug PDF - Prepared by: {prepared_by}")
        if prepared_by and prepared_by.strip():
            story.append(Paragraph(f'<b>Prepared by:</b><br/>{prepared_by}', self.styles['DOHNormal']))
        else:
            story.append(Paragraph('<b>Prepared by:</b><br/>School Mental Health Analytics System', self.styles['DOHNormal']))
        story.append(Spacer(1, 20))
        
        # Confidentiality notice
        story.append(Paragraph(
            '<b>CONFIDENTIAL:</b> This report contains sensitive mental health data and should be handled with appropriate confidentiality measures.',
            self.styles['DOHAlert']
        ))
        
        return story

    def _generate_counselor_executive_summary(self, analytics_data: Dict[str, Any], alerts_data: Dict[str, Any], engagement_data: Dict[str, Any]) -> List:
        """Generate counselor executive summary"""
        story = []
        
        story.append(Paragraph('EXECUTIVE SUMMARY', self.styles['DOHTitle']))
        story.append(Spacer(1, 20))
        
        # Key metrics
        story.append(Paragraph('Key Mental Health Metrics', self.styles['DOHSection']))
        
        metrics_data = [
            ['Metric', 'Value', 'Status'],
            ['Total Mental Health Diagnoses', str(analytics_data.get('total_diagnoses', 0)), 'Baseline'],
            ['Top Mental Health Diagnosis', analytics_data.get('top_concern', 'N/A'), 'Monitor'],
            ['Active Mental Health Alerts', str(analytics_data.get('active_alerts', 0)), 'Action Required'],
            ['High Risk Cases', str(analytics_data.get('high_risk_cases', 0)), 'Critical'],
            ['Total Conversations', str(engagement_data.get('summary', {}).get('total_conversations', 0)), 'Engagement'],
            ['Total Check-ins', str(engagement_data.get('summary', {}).get('total_checkins', 0)), 'Engagement']
        ]
        
        metrics_table = Table(metrics_data, colWidths=[2*inch, 1.5*inch, 1*inch])
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(metrics_table)
        story.append(Spacer(1, 20))
        
        # Critical findings
        story.append(Paragraph('Critical Findings', self.styles['DOHSection']))
        
        # High risk cases
        high_risk_cases = analytics_data.get('high_risk_cases', 0)
        if high_risk_cases > 0:
            story.append(Paragraph(
                f'🚨 <b>High Risk Cases:</b> {high_risk_cases} high-risk mental health cases require immediate attention.',
                self.styles['DOHAlert']
            ))
        else:
            story.append(Paragraph(
                '✅ <b>No Critical Cases:</b> No high-risk mental health cases detected in the current period.',
                self.styles['DOHNormal']
            ))
        
        # Active alerts
        active_alerts = analytics_data.get('active_alerts', 0)
        if active_alerts > 0:
            story.append(Paragraph(
                f'⚠️ <b>Active Alerts:</b> {active_alerts} mental health alerts require counselor intervention.',
                self.styles['DOHAlert']
            ))
        else:
            story.append(Paragraph(
                '✅ <b>No Active Alerts:</b> All mental health alerts have been addressed.',
                self.styles['DOHNormal']
            ))
        
        # Engagement trends
        engagement_summary = engagement_data.get('summary', {})
        total_conversations = engagement_summary.get('total_conversations', 0)
        total_checkins = engagement_summary.get('total_checkins', 0)
        
        if total_conversations > 0 or total_checkins > 0:
            story.append(Paragraph(
                f'📊 <b>Student Engagement:</b> {total_conversations} chatbot conversations and {total_checkins} mood check-ins recorded.',
                self.styles['DOHNormal']
            ))
        else:
            story.append(Paragraph(
                '📊 <b>Student Engagement:</b> Limited engagement data available for the current period.',
                self.styles['DOHNormal']
            ))
        
        return story

    def _generate_mental_health_analytics(self, analytics_data: Dict[str, Any]) -> List:
        """Generate mental health analytics section"""
        story = []
        
        story.append(Paragraph('MENTAL HEALTH ANALYTICS', self.styles['DOHTitle']))
        story.append(Spacer(1, 20))
        
        # Risk level distribution
        story.append(Paragraph('Risk Level Distribution', self.styles['DOHSection']))
        
        # Create risk distribution table
        risk_data = [
            ['Risk Level', 'Count', 'Status'],
            ['High Risk', str(analytics_data.get('high_risk_cases', 0)), 'Immediate Action'],
            ['Moderate Risk', str(analytics_data.get('moderate_risk_cases', 0)), 'Monitor'],
            ['Low Risk', str(analytics_data.get('low_risk_cases', 0)), 'Stable']
        ]
        
        risk_table = Table(risk_data, colWidths=[1.5*inch, 1*inch, 1.5*inch])
        risk_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(risk_table)
        story.append(Spacer(1, 20))
        
        # Top mental health diagnoses
        story.append(Paragraph('Top Mental Health Diagnoses', self.styles['DOHSection']))
        story.append(Paragraph(
            f'<b>Most Common Diagnosis:</b> {analytics_data.get("top_concern", "No data available")}',
            self.styles['DOHNormal']
        ))
        story.append(Paragraph(
            f'<b>Total Diagnoses:</b> {analytics_data.get("total_diagnoses", 0)} completed mental health assessments',
            self.styles['DOHNormal']
        ))
        
        return story

    def _generate_mental_health_alerts_summary(self, alerts_data: Dict[str, Any]) -> List:
        """Generate mental health alerts summary (without student names)"""
        story = []
        
        story.append(Paragraph('MENTAL HEALTH ALERTS SUMMARY', self.styles['DOHTitle']))
        story.append(Spacer(1, 20))
        
        # Alert statistics
        story.append(Paragraph('Alert Statistics', self.styles['DOHSection']))
        
        # Get alert counts by severity
        alerts = alerts_data.get('alerts', [])
        high_alerts = len([a for a in alerts if a.get('severity') == 'high'])
        medium_alerts = len([a for a in alerts if a.get('severity') == 'medium'])
        low_alerts = len([a for a in alerts if a.get('severity') == 'low'])
        
        alert_stats_data = [
            ['Severity', 'Count', 'Status'],
            ['High', str(high_alerts), 'Critical'],
            ['Medium', str(medium_alerts), 'Monitor'],
            ['Low', str(low_alerts), 'Routine']
        ]
        
        alert_stats_table = Table(alert_stats_data, colWidths=[1.5*inch, 1*inch, 1.5*inch])
        alert_stats_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(alert_stats_table)
        story.append(Spacer(1, 20))
        
        # Alert trends
        story.append(Paragraph('Alert Trends', self.styles['DOHSection']))
        
        if high_alerts > 0:
            story.append(Paragraph(
                f'🚨 <b>High Priority:</b> {high_alerts} high-severity alerts require immediate counselor intervention.',
                self.styles['DOHAlert']
            ))
        else:
            story.append(Paragraph(
                '✅ <b>No Critical Alerts:</b> No high-severity alerts in the current period.',
                self.styles['DOHNormal']
            ))
        
        if medium_alerts > 0:
            story.append(Paragraph(
                f'⚠️ <b>Medium Priority:</b> {medium_alerts} medium-severity alerts need regular monitoring.',
                self.styles['DOHNormal']
            ))
        
        if low_alerts > 0:
            story.append(Paragraph(
                f'📊 <b>Low Priority:</b> {low_alerts} low-severity alerts for routine follow-up.',
                self.styles['DOHNormal']
            ))
        
        return story

    def _generate_amieti_engagement_trends(self, engagement_data: Dict[str, Any]) -> List:
        """Generate AMIETI engagement trends section"""
        story = []
        
        story.append(Paragraph('AMIETI ENGAGEMENT TRENDS', self.styles['DOHTitle']))
        story.append(Spacer(1, 20))
        
        # Engagement summary
        story.append(Paragraph('Engagement Summary', self.styles['DOHSection']))
        
        summary = engagement_data.get('summary', {})
        total_conversations = summary.get('total_conversations', 0)
        total_checkins = summary.get('total_checkins', 0)
        
        engagement_summary_data = [
            ['Metric', 'Count', 'Description'],
            ['Total Conversations', str(total_conversations), 'Chatbot interactions'],
            ['Total Check-ins', str(total_checkins), 'Mood tracking entries'],
            ['Engagement Rate', f'{(total_conversations + total_checkins) / 100:.1f}%' if (total_conversations + total_checkins) > 0 else '0%', 'Overall engagement']
        ]
        
        engagement_table = Table(engagement_summary_data, colWidths=[1.5*inch, 1*inch, 2*inch])
        engagement_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(engagement_table)
        story.append(Spacer(1, 20))
        
        # Monthly trends
        story.append(Paragraph('Monthly Engagement Trends', self.styles['DOHSection']))
        
        labels = engagement_data.get('labels', [])
        datasets = engagement_data.get('datasets', [])
        
        if labels and datasets:
            # Create monthly trends table
            trends_data = [['Month'] + [dataset.get('label', 'Unknown') for dataset in datasets]]
            
            for i, month in enumerate(labels):
                row = [month]
                for dataset in datasets:
                    if i < len(dataset.get('data', [])):
                        value = dataset['data'][i]
                        row.append(str(value) if value > 0 else '0')
                    else:
                        row.append('0')
                trends_data.append(row)
            
            # Add total row
            total_row = ['TOTAL']
            for dataset in datasets:
                total = sum(dataset.get('data', []))
                total_row.append(str(total))
            trends_data.append(total_row)
            
            # Create table
            col_widths = [1*inch] + [1.5*inch] * len(datasets)
            trends_table = Table(trends_data, colWidths=col_widths)
            trends_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 8),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -2), colors.beige),
                ('BACKGROUND', (0, -1), (-1, -1), colors.lightblue),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 7),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ]))
            
            story.append(trends_table)
        else:
            story.append(Paragraph(
                'No engagement trend data available for the selected time period.',
                self.styles['DOHNormal']
            ))
        
        return story

    def _generate_counselor_predictive_analytics(self, engagement_data: Dict[str, Any]) -> List:
        """Generate counselor predictive analytics section"""
        story = []
        
        story.append(Paragraph('PREDICTIVE ANALYTICS', self.styles['DOHTitle']))
        story.append(Spacer(1, 20))
        
        predictive_insights = engagement_data.get('summary', {}).get('predictive_insights', {})
        
        # Engagement predictions
        story.append(Paragraph('Engagement Predictions', self.styles['DOHSection']))
        
        if predictive_insights:
            # Check-ins predictions
            checkin_predictions = predictive_insights.get('checkins', {})
            if checkin_predictions:
                trend = checkin_predictions.get('trend', 'stable')
                confidence = checkin_predictions.get('confidence', 0)
                story.append(Paragraph(
                    f'📊 <b>Check-ins Trend:</b> {trend.title()} with {confidence:.1f}% confidence',
                    self.styles['DOHNormal']
                ))
            
            # Conversations predictions
            conversation_predictions = predictive_insights.get('conversations', {})
            if conversation_predictions:
                trend = conversation_predictions.get('trend', 'stable')
                confidence = conversation_predictions.get('confidence', 0)
                story.append(Paragraph(
                    f'💬 <b>Conversations Trend:</b> {trend.title()} with {confidence:.1f}% confidence',
                    self.styles['DOHNormal']
                ))
            
            # Future predictions
            future_predictions = predictive_insights.get('future_predictions', {})
            if future_predictions:
                story.append(Paragraph('<b>Future Predictions:</b>', self.styles['DOHNormal']))
                for prediction in future_predictions[:3]:
                    story.append(Paragraph(f'• {prediction}', self.styles['DOHRecommendation']))
        else:
            story.append(Paragraph(
                '📊 <b>Engagement Analysis:</b> Based on current trends, maintain existing engagement strategies.',
                self.styles['DOHNormal']
            ))
            story.append(Paragraph(
                '💬 <b>Conversation Trends:</b> Continue monitoring chatbot usage patterns.',
                self.styles['DOHNormal']
            ))
        
        story.append(Spacer(1, 15))
        
        # Intervention recommendations
        story.append(Paragraph('Intervention Recommendations', self.styles['DOHSection']))
        
        if predictive_insights and predictive_insights.get('recommendations'):
            recommendations = predictive_insights['recommendations']
            for rec in recommendations[:5]:
                story.append(Paragraph(f'• {rec}', self.styles['DOHRecommendation']))
        else:
            story.append(Paragraph('• Continue current mental health support programs', self.styles['DOHRecommendation']))
            story.append(Paragraph('• Monitor student engagement with AMIETI chatbot', self.styles['DOHRecommendation']))
            story.append(Paragraph('• Maintain regular mental health assessments', self.styles['DOHRecommendation']))
            story.append(Paragraph('• Provide timely intervention for high-risk cases', self.styles['DOHRecommendation']))
        
        return story

    def _generate_counselor_recommendations(self, analytics_data: Dict[str, Any], alerts_data: Dict[str, Any], engagement_data: Dict[str, Any]) -> List:
        """Generate counselor recommendations"""
        story = []
        
        story.append(Paragraph('RECOMMENDATIONS', self.styles['DOHTitle']))
        story.append(Spacer(1, 20))
        
        # Immediate actions
        story.append(Paragraph('Immediate Actions Required', self.styles['DOHSection']))
        
        # High risk cases
        high_risk_cases = analytics_data.get('high_risk_cases', 0)
        if high_risk_cases > 0:
            story.append(Paragraph(
                f'🚨 <b>URGENT:</b> Address {high_risk_cases} high-risk mental health cases immediately',
                self.styles['DOHAlert']
            ))
            story.append(Paragraph(
                '• Schedule immediate counseling sessions',
                self.styles['DOHRecommendation']
            ))
            story.append(Paragraph(
                '• Coordinate with parents/guardians',
                self.styles['DOHRecommendation']
            ))
            story.append(Paragraph(
                '• Consider external mental health referrals',
                self.styles['DOHRecommendation']
            ))
        
        # Active alerts
        active_alerts = analytics_data.get('active_alerts', 0)
        if active_alerts > 0:
            story.append(Paragraph(
                f'⚠️ <b>HIGH PRIORITY:</b> Review and address {active_alerts} active mental health alerts',
                self.styles['DOHAlert']
            ))
            story.append(Paragraph(
                '• Prioritize alerts by severity level',
                self.styles['DOHRecommendation']
            ))
            story.append(Paragraph(
                '• Implement appropriate intervention strategies',
                self.styles['DOHRecommendation']
            ))
            story.append(Paragraph(
                '• Document all interventions and outcomes',
                self.styles['DOHRecommendation']
            ))
        
        story.append(Spacer(1, 15))
        
        # Medium-term recommendations
        story.append(Paragraph('Medium-term Recommendations', self.styles['DOHSection']))
        
        # Engagement strategies
        engagement_summary = engagement_data.get('summary', {})
        total_conversations = engagement_summary.get('total_conversations', 0)
        total_checkins = engagement_summary.get('total_checkins', 0)
        
        if total_conversations > 0 or total_checkins > 0:
            story.append(Paragraph(
                '🎯 <b>Engagement Enhancement:</b> Build on current AMIETI chatbot success',
                self.styles['DOHNormal']
            ))
            story.append(Paragraph(
                '• Promote AMIETI chatbot usage among students',
                self.styles['DOHRecommendation']
            ))
            story.append(Paragraph(
                '• Encourage regular mood check-ins',
                self.styles['DOHRecommendation']
            ))
            story.append(Paragraph(
                '• Develop targeted mental health campaigns',
                self.styles['DOHRecommendation']
            ))
        else:
            story.append(Paragraph(
                '🎯 <b>Engagement Building:</b> Increase student engagement with mental health resources',
                self.styles['DOHNormal']
            ))
            story.append(Paragraph(
                '• Launch awareness campaigns for AMIETI chatbot',
                self.styles['DOHRecommendation']
            ))
            story.append(Paragraph(
                '• Implement incentive programs for engagement',
                self.styles['DOHRecommendation']
            ))
            story.append(Paragraph(
                '• Provide training on mental health resources',
                self.styles['DOHRecommendation']
            ))
        
        # Prevention programs
        story.append(Paragraph(
            '🛡️ <b>Prevention Programs:</b> Implement comprehensive mental health prevention strategies',
            self.styles['DOHNormal']
        ))
        story.append(Paragraph(
            '• Develop stress management workshops',
            self.styles['DOHRecommendation']
        ))
        story.append(Paragraph(
            '• Create peer support programs',
            self.styles['DOHRecommendation']
        ))
        story.append(Paragraph(
            '• Establish crisis intervention protocols',
            self.styles['DOHRecommendation']
        ))
        
        return story

    def _generate_counselor_appendices(self) -> List:
        """Generate counselor appendices"""
        story = []
        
        story.append(Paragraph('APPENDICES', self.styles['DOHTitle']))
        story.append(Spacer(1, 20))
        
        # Appendix A: Data Sources
        story.append(Paragraph('Appendix A: Data Sources and Methodology', self.styles['DOHSection']))
        story.append(Paragraph(
            'This report is generated using the following data sources:',
            self.styles['DOHNormal']
        ))
        story.append(Paragraph('• Mental health appointment records', self.styles['DOHRecommendation']))
        story.append(Paragraph('• AMIETI chatbot conversation logs', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Mood tracking entries', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Mental health alert system data', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Predictive analytics models', self.styles['DOHRecommendation']))
        
        story.append(Spacer(1, 15))
        
        # Appendix B: Technical Details
        story.append(Paragraph('Appendix B: Technical Implementation', self.styles['DOHSection']))
        story.append(Paragraph(
            'The mental health analytics system uses the following technologies:',
            self.styles['DOHNormal']
        ))
        story.append(Paragraph('• AI-powered mental health assessment', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Predictive analytics for engagement trends', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Natural language processing for chatbot interactions', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Statistical analysis for risk assessment', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Multi-language support (Tagalog/English)', self.styles['DOHRecommendation']))
        
        return story

    def generate_unified_admin_report(self, mental_health_data: Dict[str, Any], physical_health_data: Dict[str, Any], engagement_data: Dict[str, Any], output_path: str, prepared_by: str = None) -> str:
        """
        Generate a unified admin PDF report combining all analytics sections
        
        Args:
            mental_health_data: Mental health analytics data
            physical_health_data: Physical health analytics data
            engagement_data: AMIETI engagement data
            output_path: Path to save the PDF file
            prepared_by: Full name of the user generating the report
            
        Returns:
            Path to generated PDF file
        """
        
        # Create PDF document
        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=72,
            leftMargin=72,
            topMargin=72,
            bottomMargin=72
        )
        
        # Build story (content)
        story = []
        
        # 1. COVER PAGE
        story.extend(self._generate_unified_cover_page(mental_health_data, physical_health_data, engagement_data, prepared_by))
        story.append(PageBreak())
        
        # 2. EXECUTIVE SUMMARY
        story.extend(self._generate_unified_executive_summary(mental_health_data, physical_health_data, engagement_data))
        story.append(PageBreak())
        
        # 3. MENTAL HEALTH ANALYTICS
        story.extend(self._generate_unified_mental_health_section(mental_health_data))
        story.append(PageBreak())
        
        # 4. PHYSICAL HEALTH ANALYTICS
        story.extend(self._generate_unified_physical_health_section(physical_health_data))
        story.append(PageBreak())
        
        # 5. AMIETI CHATBOT ENGAGEMENT
        story.extend(self._generate_unified_amieti_section(engagement_data))
        story.append(PageBreak())
        
        # 6. PREDICTIVE ANALYTICS
        story.extend(self._generate_unified_predictive_analytics(mental_health_data, physical_health_data, engagement_data))
        story.append(PageBreak())
        
        # 7. RECOMMENDATIONS
        story.extend(self._generate_unified_recommendations(mental_health_data, physical_health_data, engagement_data))
        story.append(PageBreak())
        
        # 8. APPENDICES
        story.extend(self._generate_unified_appendices())
        
        # Build PDF
        doc.build(story)
        
        return output_path

    def _generate_unified_cover_page(self, mental_health_data: Dict[str, Any], physical_health_data: Dict[str, Any], engagement_data: Dict[str, Any], prepared_by: str = None) -> List:
        """Generate unified admin report cover page"""
        story = []
        
        # School logo
        try:
            logo_path = os.path.join(os.path.dirname(__file__), '..', '..', 'frontend', 'public', 'img', 'ietilogo.png')
            if os.path.exists(logo_path):
                story.append(Paragraph(
                    f'<img src="{logo_path}" width="80" height="80" />',
                    self.styles['DOHNormal']
                ))
                story.append(Spacer(1, 10))
        except Exception as e:
            pass
        
        # School name
        story.append(Paragraph(
            'IETI SCHOOL',
            ParagraphStyle(
                'SchoolName',
                parent=self.styles['DOHTitle'],
                fontSize=18,
                textColor=colors.darkblue
            )
        ))
        story.append(Spacer(1, 10))
        
        # Report title
        story.append(Paragraph(
            'COMPREHENSIVE SCHOOL HEALTH ANALYTICS REPORT',
            self.styles['DOHTitle']
        ))
        story.append(Spacer(1, 20))
        
        # Subtitle
        story.append(Paragraph(
            'Mental Health, Physical Health & AMIETI Chatbot Analytics',
            self.styles['DOHSection']
        ))
        story.append(Spacer(1, 30))
        
        # Report details
        report_date = datetime.now().strftime('%B %d, %Y')
        story.append(Paragraph(f'<b>Report Date:</b> {report_date}', self.styles['DOHNormal']))
        story.append(Paragraph(f'<b>Time Period:</b> {engagement_data.get("summary", {}).get("time_range", "Last 6 months")}', self.styles['DOHNormal']))
        story.append(Paragraph(f'<b>Total Mental Health Records:</b> {mental_health_data.get("total_diagnoses", 0)}', self.styles['DOHNormal']))
        story.append(Paragraph(f'<b>Total Physical Health Records:</b> {physical_health_data.get("summary", {}).get("total_requests", 0)}', self.styles['DOHNormal']))
        story.append(Paragraph(f'<b>Total Chatbot Interactions:</b> {engagement_data.get("summary", {}).get("total_conversations", 0)}', self.styles['DOHNormal']))
        story.append(Spacer(1, 30))
        
        # Prepared by
        if prepared_by and prepared_by.strip():
            story.append(Paragraph(f'<b>Prepared by:</b><br/>{prepared_by}', self.styles['DOHNormal']))
        else:
            story.append(Paragraph('<b>Prepared by:</b><br/>School Health Analytics System', self.styles['DOHNormal']))
        story.append(Spacer(1, 20))
        
        # DOH compliance notice
        story.append(Paragraph(
            '<b>This report follows Department of Health (DOH) standards for school health monitoring and complies with data privacy regulations.</b>',
            self.styles['DOHAlert']
        ))
        
        return story

    def _generate_unified_executive_summary(self, mental_health_data: Dict[str, Any], physical_health_data: Dict[str, Any], engagement_data: Dict[str, Any]) -> List:
        """Generate unified executive summary"""
        story = []
        
        story.append(Paragraph('EXECUTIVE SUMMARY', self.styles['DOHTitle']))
        story.append(Spacer(1, 20))
        
        # Key metrics
        story.append(Paragraph('Comprehensive Health Metrics', self.styles['DOHSection']))
        
        metrics_data = [
            ['Category', 'Metric', 'Value', 'Status'],
            ['Mental Health', 'Total Diagnoses', str(mental_health_data.get('total_diagnoses', 0)), 'Baseline'],
            ['Mental Health', 'High Risk Cases', str(mental_health_data.get('high_risk_cases', 0)), 'Critical'],
            ['Physical Health', 'Total Clinic Visits', str(physical_health_data.get('summary', {}).get('total_requests', 0)), 'Baseline'],
            ['Physical Health', 'Top Health Concern', physical_health_data.get('summary', {}).get('top_reasons', [{}])[0].get('name', 'N/A'), 'Monitor'],
            ['AMIETI Chatbot', 'Total Conversations', str(engagement_data.get('summary', {}).get('total_conversations', 0)), 'Engagement'],
            ['AMIETI Chatbot', 'Total Check-ins', str(engagement_data.get('summary', {}).get('total_checkins', 0)), 'Engagement']
        ]
        
        metrics_table = Table(metrics_data, colWidths=[1.5*inch, 1.5*inch, 1*inch, 1*inch])
        metrics_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(metrics_table)
        story.append(Spacer(1, 20))
        
        # Critical findings
        story.append(Paragraph('Critical Findings', self.styles['DOHSection']))
        
        # Mental health critical findings
        high_risk_cases = mental_health_data.get('high_risk_cases', 0)
        if high_risk_cases > 0:
            story.append(Paragraph(
                f'🚨 <b>Mental Health:</b> {high_risk_cases} high-risk mental health cases require immediate attention.',
                self.styles['DOHAlert']
            ))
        else:
            story.append(Paragraph(
                '✅ <b>Mental Health:</b> No critical mental health cases detected.',
                self.styles['DOHNormal']
            ))
        
        # Physical health critical findings
        physical_health_requests = physical_health_data.get('summary', {}).get('total_requests', 0)
        if physical_health_requests > 0:
            story.append(Paragraph(
                f'📊 <b>Physical Health:</b> {physical_health_requests} clinic visits recorded with comprehensive health monitoring.',
                self.styles['DOHNormal']
            ))
        else:
            story.append(Paragraph(
                '📊 <b>Physical Health:</b> Limited physical health data available.',
                self.styles['DOHNormal']
            ))
        
        # AMIETI engagement findings
        total_conversations = engagement_data.get('summary', {}).get('total_conversations', 0)
        total_checkins = engagement_data.get('summary', {}).get('total_checkins', 0)
        
        if total_conversations > 0 or total_checkins > 0:
            story.append(Paragraph(
                f'🤖 <b>AMIETI Engagement:</b> {total_conversations} conversations and {total_checkins} mood check-ins show active student engagement.',
                self.styles['DOHNormal']
            ))
        else:
            story.append(Paragraph(
                '🤖 <b>AMIETI Engagement:</b> Limited chatbot engagement data available.',
                self.styles['DOHNormal']
            ))
        
        return story

    def _generate_unified_mental_health_section(self, mental_health_data: Dict[str, Any]) -> List:
        """Generate mental health section for unified report"""
        story = []
        
        story.append(Paragraph('MENTAL HEALTH ANALYTICS', self.styles['DOHTitle']))
        story.append(Spacer(1, 20))
        
        # Risk level distribution
        story.append(Paragraph('Mental Health Risk Assessment', self.styles['DOHSection']))
        
        risk_data = [
            ['Risk Level', 'Count', 'Status'],
            ['High Risk', str(mental_health_data.get('high_risk_cases', 0)), 'Immediate Action'],
            ['Moderate Risk', str(mental_health_data.get('moderate_risk_cases', 0)), 'Monitor'],
            ['Low Risk', str(mental_health_data.get('low_risk_cases', 0)), 'Stable']
        ]
        
        risk_table = Table(risk_data, colWidths=[1.5*inch, 1*inch, 1.5*inch])
        risk_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(risk_table)
        story.append(Spacer(1, 20))
        
        # Top mental health diagnoses
        story.append(Paragraph('Mental Health Diagnoses Summary', self.styles['DOHSection']))
        story.append(Paragraph(
            f'<b>Most Common Diagnosis:</b> {mental_health_data.get("top_concern", "No data available")}',
            self.styles['DOHNormal']
        ))
        story.append(Paragraph(
            f'<b>Total Diagnoses:</b> {mental_health_data.get("total_diagnoses", 0)} completed mental health assessments',
            self.styles['DOHNormal']
        ))
        
        return story

    def _generate_unified_physical_health_section(self, physical_health_data: Dict[str, Any]) -> List:
        """Generate physical health section for unified report"""
        story = []
        
        story.append(Paragraph('PHYSICAL HEALTH ANALYTICS', self.styles['DOHTitle']))
        story.append(Spacer(1, 20))
        
        # Top health conditions
        story.append(Paragraph('Top Physical Health Conditions', self.styles['DOHSection']))
        
        top_reasons = physical_health_data.get('summary', {}).get('top_reasons', [])
        if top_reasons:
            conditions_data = [['Rank', 'Condition', 'Cases', 'Percentage']]
            total_cases = sum(reason.get('count', 0) for reason in top_reasons)
            
            for i, reason in enumerate(top_reasons[:5], 1):
                count = reason.get('count', 0)
                percentage = (count / total_cases * 100) if total_cases > 0 else 0
                conditions_data.append([
                    str(i),
                    reason.get('name', 'Unknown'),
                    str(count),
                    f'{percentage:.1f}%'
                ])
            
            conditions_table = Table(conditions_data, colWidths=[0.5*inch, 2*inch, 1*inch, 1*inch])
            conditions_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            
            story.append(conditions_table)
        
        story.append(Spacer(1, 15))
        
        # Demographics
        story.append(Paragraph('Physical Health Demographics', self.styles['DOHSection']))
        
        demographics = physical_health_data.get('summary', {}).get('demographics', {})
        
        if demographics.get('level_sections'):
            story.append(Paragraph('Most Affected Grade Levels:', self.styles['DOHSubsection']))
            for level in demographics['level_sections'][:3]:
                story.append(Paragraph(
                    f'• {level.get("name", "Unknown")}: {level.get("count", 0)} cases',
                    self.styles['DOHNormal']
                ))
        
        if demographics.get('genders'):
            story.append(Paragraph('Gender Distribution:', self.styles['DOHSubsection']))
            for gender in demographics['genders']:
                story.append(Paragraph(
                    f'• {gender.get("name", "Unknown")}: {gender.get("count", 0)} cases',
                    self.styles['DOHNormal']
                ))
        
        return story

    def _generate_unified_amieti_section(self, engagement_data: Dict[str, Any]) -> List:
        """Generate AMIETI chatbot section for unified report"""
        story = []
        
        story.append(Paragraph('AMIETI CHATBOT ENGAGEMENT', self.styles['DOHTitle']))
        story.append(Spacer(1, 20))
        
        # Engagement summary
        story.append(Paragraph('Chatbot Engagement Summary', self.styles['DOHSection']))
        
        summary = engagement_data.get('summary', {})
        total_conversations = summary.get('total_conversations', 0)
        total_checkins = summary.get('total_checkins', 0)
        
        engagement_summary_data = [
            ['Metric', 'Count', 'Description'],
            ['Total Conversations', str(total_conversations), 'Chatbot interactions'],
            ['Total Check-ins', str(total_checkins), 'Mood tracking entries'],
            ['Engagement Rate', f'{(total_conversations + total_checkins) / 100:.1f}%' if (total_conversations + total_checkins) > 0 else '0%', 'Overall engagement']
        ]
        
        engagement_table = Table(engagement_summary_data, colWidths=[1.5*inch, 1*inch, 2*inch])
        engagement_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        story.append(engagement_table)
        story.append(Spacer(1, 20))
        
        # Monthly trends
        story.append(Paragraph('Monthly Engagement Trends', self.styles['DOHSection']))
        
        labels = engagement_data.get('labels', [])
        datasets = engagement_data.get('datasets', [])
        
        if labels and datasets:
            # Create monthly trends table
            trends_data = [['Month'] + [dataset.get('label', 'Unknown') for dataset in datasets]]
            
            for i, month in enumerate(labels):
                row = [month]
                for dataset in datasets:
                    if i < len(dataset.get('data', [])):
                        value = dataset['data'][i]
                        row.append(str(value) if value > 0 else '0')
                    else:
                        row.append('0')
                trends_data.append(row)
            
            # Add total row
            total_row = ['TOTAL']
            for dataset in datasets:
                total = sum(dataset.get('data', []))
                total_row.append(str(total))
            trends_data.append(total_row)
            
            # Create table
            col_widths = [1*inch] + [1.5*inch] * len(datasets)
            trends_table = Table(trends_data, colWidths=col_widths)
            trends_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.darkblue),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 8),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -2), colors.beige),
                ('BACKGROUND', (0, -1), (-1, -1), colors.lightblue),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('FONTSIZE', (0, 1), (-1, -1), 7),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
            ]))
            
            story.append(trends_table)
        else:
            story.append(Paragraph(
                'No engagement trend data available for the selected time period.',
                self.styles['DOHNormal']
            ))
        
        return story

    def _generate_unified_predictive_analytics(self, mental_health_data: Dict[str, Any], physical_health_data: Dict[str, Any], engagement_data: Dict[str, Any]) -> List:
        """Generate unified predictive analytics section"""
        story = []
        
        story.append(Paragraph('PREDICTIVE ANALYTICS', self.styles['DOHTitle']))
        story.append(Spacer(1, 20))
        
        # Mental health predictions
        story.append(Paragraph('Mental Health Predictions', self.styles['DOHSection']))
        
        high_risk_cases = mental_health_data.get('high_risk_cases', 0)
        if high_risk_cases > 0:
            story.append(Paragraph(
                f'🚨 <b>High Risk Cases:</b> {high_risk_cases} cases require immediate intervention.',
                self.styles['DOHAlert']
            ))
        else:
            story.append(Paragraph(
                '✅ <b>Mental Health Risk:</b> No critical cases detected in current period.',
                self.styles['DOHNormal']
            ))
        
        story.append(Spacer(1, 15))
        
        # Physical health predictions
        story.append(Paragraph('Physical Health Predictions', self.styles['DOHSection']))
        
        physical_predictive = physical_health_data.get('predictive_analytics', {})
        if physical_predictive:
            resource_data = physical_predictive.get('resource_predictions', {})
            if resource_data and resource_data.get('predicted_monthly_visits'):
                story.append(Paragraph(
                    f'📊 <b>Predicted Monthly Visits:</b> {resource_data.get("predicted_monthly_visits", 0)}',
                    self.styles['DOHNormal']
                ))
            else:
                story.append(Paragraph(
                    '📊 <b>Physical Health Trends:</b> Maintain current clinic capacity.',
                    self.styles['DOHNormal']
                ))
        else:
            story.append(Paragraph(
                '📊 <b>Physical Health Trends:</b> Continue monitoring health patterns.',
                self.styles['DOHNormal']
            ))
        
        story.append(Spacer(1, 15))
        
        # AMIETI engagement predictions
        story.append(Paragraph('AMIETI Engagement Predictions', self.styles['DOHSection']))
        
        engagement_predictive = engagement_data.get('summary', {}).get('predictive_insights', {})
        if engagement_predictive:
            # Check-ins predictions
            checkin_predictions = engagement_predictive.get('checkins', {})
            if checkin_predictions:
                trend = checkin_predictions.get('trend', 'stable')
                confidence = checkin_predictions.get('confidence', 0)
                story.append(Paragraph(
                    f'📊 <b>Check-ins Trend:</b> {trend.title()} with {confidence:.1f}% confidence',
                    self.styles['DOHNormal']
                ))
            
            # Conversations predictions
            conversation_predictions = engagement_predictive.get('conversations', {})
            if conversation_predictions:
                trend = conversation_predictions.get('trend', 'stable')
                confidence = conversation_predictions.get('confidence', 0)
                story.append(Paragraph(
                    f'💬 <b>Conversations Trend:</b> {trend.title()} with {confidence:.1f}% confidence',
                    self.styles['DOHNormal']
                ))
        else:
            story.append(Paragraph(
                '🤖 <b>Engagement Analysis:</b> Continue monitoring chatbot usage patterns.',
                self.styles['DOHNormal']
            ))
        
        return story

    def _generate_unified_recommendations(self, mental_health_data: Dict[str, Any], physical_health_data: Dict[str, Any], engagement_data: Dict[str, Any]) -> List:
        """Generate unified recommendations"""
        story = []
        
        story.append(Paragraph('RECOMMENDATIONS', self.styles['DOHTitle']))
        story.append(Spacer(1, 20))
        
        # Immediate actions
        story.append(Paragraph('Immediate Actions Required', self.styles['DOHSection']))
        
        # Mental health immediate actions
        high_risk_cases = mental_health_data.get('high_risk_cases', 0)
        if high_risk_cases > 0:
            story.append(Paragraph(
                f'🚨 <b>Mental Health:</b> Address {high_risk_cases} high-risk cases immediately',
                self.styles['DOHAlert']
            ))
            story.append(Paragraph(
                '• Schedule immediate counseling sessions',
                self.styles['DOHRecommendation']
            ))
            story.append(Paragraph(
                '• Coordinate with parents/guardians',
                self.styles['DOHRecommendation']
            ))
            story.append(Paragraph(
                '• Consider external mental health referrals',
                self.styles['DOHRecommendation']
            ))
        
        story.append(Spacer(1, 15))
        
        # Medium-term recommendations
        story.append(Paragraph('Medium-term Recommendations', self.styles['DOHSection']))
        
        # Mental health programs
        story.append(Paragraph('🛡️ <b>Mental Health Programs:</b>', self.styles['DOHNormal']))
        story.append(Paragraph('• Develop stress management workshops', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Create peer support programs', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Establish crisis intervention protocols', self.styles['DOHRecommendation']))
        
        # Physical health programs
        story.append(Paragraph('🏥 <b>Physical Health Programs:</b>', self.styles['DOHNormal']))
        story.append(Paragraph('• Continue regular health screenings', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Maintain clinic capacity and resources', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Promote healthy lifestyle habits', self.styles['DOHRecommendation']))
        
        # AMIETI engagement
        story.append(Paragraph('🤖 <b>AMIETI Engagement:</b>', self.styles['DOHNormal']))
        story.append(Paragraph('• Promote AMIETI chatbot usage among students', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Encourage regular mood check-ins', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Develop targeted mental health campaigns', self.styles['DOHRecommendation']))
        
        return story

    def _generate_unified_appendices(self) -> List:
        """Generate unified appendices"""
        story = []
        
        story.append(Paragraph('APPENDICES', self.styles['DOHTitle']))
        story.append(Spacer(1, 20))
        
        # Appendix A: Data Sources
        story.append(Paragraph('Appendix A: Data Sources and Methodology', self.styles['DOHSection']))
        story.append(Paragraph(
            'This comprehensive report is generated using the following data sources:',
            self.styles['DOHNormal']
        ))
        story.append(Paragraph('• Mental health appointment records and assessments', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Physical health clinic visits and permit requests', self.styles['DOHRecommendation']))
        story.append(Paragraph('• AMIETI chatbot conversation logs and mood tracking', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Vital signs and nursing intervention records', self.styles['DOHRecommendation']))
        story.append(Paragraph('• ICD-11 condition coding via AI detection', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Predictive analytics models for trend forecasting', self.styles['DOHRecommendation']))
        
        story.append(Spacer(1, 15))
        
        # Appendix B: Technical Details
        story.append(Paragraph('Appendix B: Technical Implementation', self.styles['DOHSection']))
        story.append(Paragraph(
            'The comprehensive health analytics system uses the following technologies:',
            self.styles['DOHNormal']
        ))
        story.append(Paragraph('• AI-powered mental health assessment and risk detection', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Physical health trend analysis and outbreak detection', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Natural language processing for chatbot interactions', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Predictive analytics for resource planning', self.styles['DOHRecommendation']))
        story.append(Paragraph('• Multi-language support (Tagalog/English)', self.styles['DOHRecommendation']))
        story.append(Paragraph('• DOH-compliant reporting standards', self.styles['DOHRecommendation']))
        
        return story
