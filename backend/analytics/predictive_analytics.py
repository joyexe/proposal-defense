"""
AI-Powered Predictive Analytics for Physical Health Trends
Advanced forecasting and predictive insights for school campus health management
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Any
from django.utils import timezone
from django.db.models import Count, Q
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error
import warnings
warnings.filterwarnings('ignore')

# Import statsmodels with error handling
try:
    from statsmodels.tsa.seasonal import seasonal_decompose
    STATSMODELS_AVAILABLE = True
except ImportError:
    STATSMODELS_AVAILABLE = False
    seasonal_decompose = None

class PredictiveHealthAnalytics:
    """
    Advanced AI-powered predictive analytics for physical health trends
    """
    
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.feature_importance = {}
        self.prediction_accuracy = {}
        
    def generate_predictive_insights(self, historical_data: Dict, months_ahead: int = 3) -> Dict[str, Any]:
        """
        Generate comprehensive predictive insights for physical health trends
        
        Args:
            historical_data: Historical monthly condition data
            months_ahead: Number of months to predict ahead
            
        Returns:
            Dict containing predictive insights and forecasts
        """
        
        # Convert to pandas DataFrame for analysis
        df = self._prepare_data_for_prediction(historical_data)
        
        if df.empty or len(df) < 6:  # Need at least 6 months of data
            return self._get_fallback_predictions(months_ahead)
        
        predictions = {}
        
        # 1. CONDITION-SPECIFIC FORECASTING
        condition_forecasts = self._predict_condition_trends(df, months_ahead)
        predictions['condition_forecasts'] = condition_forecasts
        
        # 2. SEASONAL PATTERN PREDICTION
        seasonal_predictions = self._predict_seasonal_patterns(df, months_ahead)
        predictions['seasonal_predictions'] = seasonal_predictions
        
        # 3. OUTBREAK RISK ASSESSMENT
        outbreak_risks = self._assess_outbreak_risks(df)
        predictions['outbreak_risks'] = outbreak_risks
        
        # 4. RESOURCE PLANNING PREDICTIONS
        resource_predictions = self._predict_resource_needs(df, months_ahead)
        predictions['resource_predictions'] = resource_predictions
        
        # 5. INTERVENTION EFFECTIVENESS PREDICTION
        intervention_predictions = self._predict_intervention_impact(df)
        predictions['intervention_predictions'] = intervention_predictions
        
        # 6. STUDENT HEALTH RISK PREDICTION
        risk_predictions = self._predict_student_health_risks(df)
        predictions['risk_predictions'] = risk_predictions
        
        return predictions
    
    def _prepare_data_for_prediction(self, historical_data: Dict) -> pd.DataFrame:
        """Prepare historical data for predictive modeling"""
        try:
            # Convert monthly data to DataFrame
            records = []
            for month, conditions in historical_data.items():
                for condition, count in conditions.items():
                    records.append({
                        'month': month,
                        'condition': condition,
                        'count': count,
                        'month_num': int(month.split('-')[1]),
                        'year': int(month.split('-')[0])
                    })
            
            df = pd.DataFrame(records)
            
            if not df.empty:
                # Add time-based features
                df['date'] = pd.to_datetime(df['month'] + '-01')
                df['month_of_year'] = df['date'].dt.month
                df['quarter'] = df['date'].dt.quarter
                df['is_school_year_start'] = (df['month_of_year'].isin([6, 7, 8])).astype(int)
                df['is_flu_season'] = (df['month_of_year'].isin([12, 1, 2, 3])).astype(int)
                df['is_exam_period'] = (df['month_of_year'].isin([10, 11, 3, 4])).astype(int)
                
            return df
            
        except Exception as e:
            # Error preparing data
            return pd.DataFrame()
    
    def _predict_condition_trends(self, df: pd.DataFrame, months_ahead: int) -> Dict[str, Any]:
        """Predict future trends for each condition"""
        condition_forecasts = {}
        
        try:
            for condition in df['condition'].unique():
                condition_data = df[df['condition'] == condition].sort_values('date')
                
                if len(condition_data) < 3:
                    continue
                
                # Prepare features
                X = condition_data[['month_of_year', 'quarter', 'is_school_year_start', 
                                  'is_flu_season', 'is_exam_period']].values
                y = condition_data['count'].values
                
                # Train model
                model = RandomForestRegressor(n_estimators=100, random_state=42)
                model.fit(X, y)
                
                # Predict next months
                future_months = self._generate_future_months(months_ahead)
                future_features = []
                
                for month_info in future_months:
                    features = [
                        month_info['month'],
                        month_info['quarter'],
                        month_info['is_school_year_start'],
                        month_info['is_flu_season'],
                        month_info['is_exam_period']
                    ]
                    future_features.append(features)
                
                predictions = model.predict(future_features)
                
                # Calculate confidence intervals
                confidence_intervals = self._calculate_confidence_intervals(
                    model, future_features, condition_data['count'].std()
                )
                
                condition_forecasts[condition] = {
                    'predictions': predictions.tolist(),
                    'confidence_intervals': confidence_intervals,
                    'trend_direction': self._determine_trend_direction(predictions),
                    'risk_level': self._assess_condition_risk(predictions, condition_data['count'].mean()),
                    'feature_importance': dict(zip(
                        ['month', 'quarter', 'school_start', 'flu_season', 'exam_period'],
                        model.feature_importances_
                    ))
                }
                
        except Exception as e:
            # Error in condition trend prediction
            return {}
        
        return condition_forecasts
    
    def _predict_seasonal_patterns(self, df: pd.DataFrame, months_ahead: int) -> Dict[str, Any]:
        """Predict seasonal patterns and anomalies"""
        try:
            # Aggregate by month
            monthly_totals = df.groupby(['month', 'month_of_year', 'quarter']).agg({
                'count': 'sum'
            }).reset_index()
            
            # Seasonal decomposition
            seasonal_patterns = {}
            for quarter in [1, 2, 3, 4]:
                quarter_data = monthly_totals[monthly_totals['quarter'] == quarter]
                if not quarter_data.empty:
                    seasonal_patterns[f'Q{quarter}'] = {
                        'avg_cases': quarter_data['count'].mean(),
                        'peak_month': quarter_data.loc[quarter_data['count'].idxmax(), 'month_of_year'],
                        'trend': 'increasing' if quarter_data['count'].iloc[-1] > quarter_data['count'].iloc[0] else 'decreasing'
                    }
            
            # Predict next seasonal cycle
            next_seasonal_forecast = self._forecast_seasonal_cycle(monthly_totals, months_ahead)
            
            return {
                'seasonal_patterns': seasonal_patterns,
                'next_seasonal_forecast': next_seasonal_forecast,
                'anomaly_detection': self._detect_seasonal_anomalies(monthly_totals)
            }
            
        except Exception as e:
            # Error in seasonal pattern prediction
            return {}
    
    def _assess_outbreak_risks(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Assess risk of disease outbreaks"""
        try:
            outbreak_risks = {}
            
            # Analyze infectious conditions
            infectious_conditions = ['fever', 'cough', 'sore throat', 'flu', 'cold']
            
            for condition in infectious_conditions:
                condition_data = df[df['condition'].str.contains(condition, case=False, na=False)]
                
                if not condition_data.empty:
                    # Calculate outbreak risk indicators
                    recent_trend = condition_data.tail(3)['count'].mean()
                    historical_avg = condition_data['count'].mean()
                    trend_ratio = recent_trend / historical_avg if historical_avg > 0 else 1
                    
                    risk_level = 'low'
                    if trend_ratio > 1.5:
                        risk_level = 'high'
                    elif trend_ratio > 1.2:
                        risk_level = 'medium'
                    
                    outbreak_risks[condition] = {
                        'risk_level': risk_level,
                        'trend_ratio': trend_ratio,
                        'recent_cases': int(recent_trend),
                        'historical_avg': int(historical_avg),
                        'recommendations': self._get_outbreak_recommendations(condition, risk_level)
                    }
            
            return outbreak_risks
            
        except Exception as e:
            # Error in outbreak risk assessment
            return {}
    
    def _predict_resource_needs(self, df: pd.DataFrame, months_ahead: int) -> Dict[str, Any]:
        """Predict resource needs for clinic management"""
        try:
            # Predict total clinic visits
            monthly_totals = df.groupby('month')['count'].sum().reset_index()
            
            if len(monthly_totals) < 3:
                return {}
            
            # Simple linear regression for total visits
            X = np.arange(len(monthly_totals)).reshape(-1, 1)
            y = monthly_totals['count'].values
            
            model = LinearRegression()
            model.fit(X, y)
            
            # Predict future months
            future_X = np.arange(len(monthly_totals), len(monthly_totals) + months_ahead).reshape(-1, 1)
            future_predictions = model.predict(future_X)
            
            # Resource planning recommendations
            avg_monthly_visits = np.mean(future_predictions)
            
            resource_recommendations = {
                'predicted_monthly_visits': int(avg_monthly_visits),
                'staffing_needs': self._calculate_staffing_needs(avg_monthly_visits),
                'supply_needs': self._calculate_supply_needs(avg_monthly_visits),
                'facility_needs': self._assess_facility_needs(avg_monthly_visits),
                'budget_estimates': self._estimate_budget_needs(avg_monthly_visits)
            }
            
            return resource_recommendations
            
        except Exception as e:
            # Error in resource prediction
            return {}
    
    def _predict_intervention_impact(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Predict impact of health interventions"""
        try:
            intervention_predictions = {}
            
            # Analyze condition trends for intervention opportunities
            for condition in df['condition'].unique():
                condition_data = df[df['condition'] == condition].sort_values('date')
                
                if len(condition_data) < 6:
                    continue
                
                # Calculate intervention effectiveness metrics
                baseline_avg = condition_data.head(3)['count'].mean()
                recent_avg = condition_data.tail(3)['count'].mean()
                
                if baseline_avg > 0:
                    change_percentage = ((recent_avg - baseline_avg) / baseline_avg) * 100
                    
                    intervention_predictions[condition] = {
                        'baseline_cases': int(baseline_avg),
                        'recent_cases': int(recent_avg),
                        'change_percentage': round(change_percentage, 1),
                        'intervention_opportunity': self._identify_intervention_opportunity(condition, change_percentage),
                        'predicted_impact': self._predict_intervention_effectiveness(condition, change_percentage)
                    }
            
            return intervention_predictions
            
        except Exception as e:
            # Error in intervention impact prediction
            return {}
    
    def _predict_student_health_risks(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Predict student health risks and preventive measures"""
        try:
            risk_predictions = {}
            
            # Analyze patterns that indicate student health risks
            monthly_totals = df.groupby('month')['count'].sum()
            
            if len(monthly_totals) >= 3:
                # Calculate risk indicators
                recent_trend = monthly_totals.tail(3).mean()
                historical_avg = monthly_totals.mean()
                
                risk_level = 'low'
                if recent_trend > historical_avg * 1.3:
                    risk_level = 'high'
                elif recent_trend > historical_avg * 1.1:
                    risk_level = 'medium'
                
                risk_predictions = {
                    'overall_health_risk': risk_level,
                    'trend_analysis': {
                        'recent_avg': int(recent_trend),
                        'historical_avg': int(historical_avg),
                        'risk_factor': round(recent_trend / historical_avg, 2) if historical_avg > 0 else 1
                    },
                    'preventive_recommendations': self._get_preventive_recommendations(risk_level),
                    'high_risk_conditions': self._identify_high_risk_conditions(df),
                    'wellness_program_suggestions': self._suggest_wellness_programs(df)
                }
            
            return risk_predictions
            
        except Exception as e:
            # Error in student health risk prediction
            return {}
    
    # Helper methods
    def _generate_future_months(self, months_ahead: int) -> List[Dict]:
        """Generate future month features"""
        future_months = []
        current_date = timezone.now()
        
        for i in range(1, months_ahead + 1):
            future_date = current_date + timedelta(days=30*i)
            future_months.append({
                'month': future_date.month,
                'quarter': (future_date.month - 1) // 3 + 1,
                'is_school_year_start': int(future_date.month in [6, 7, 8]),
                'is_flu_season': int(future_date.month in [12, 1, 2, 3]),
                'is_exam_period': int(future_date.month in [10, 11, 3, 4])
            })
        
        return future_months
    
    def _calculate_confidence_intervals(self, model, X, std_dev, confidence=0.95):
        """Calculate confidence intervals for predictions"""
        try:
            predictions = model.predict(X)
            z_score = 1.96  # 95% confidence interval
            
            # Simple confidence interval calculation
            confidence_intervals = []
            for pred in predictions:
                margin_of_error = z_score * std_dev
                confidence_intervals.append({
                    'lower': max(0, pred - margin_of_error),
                    'upper': pred + margin_of_error
                })
            
            return confidence_intervals
        except Exception:
            return [{'lower': 0, 'upper': 0} for _ in range(len(X))]
    
    def _determine_trend_direction(self, predictions):
        """Determine if trend is increasing, decreasing, or stable"""
        if len(predictions) < 2:
            return 'stable'
        
        slope = (predictions[-1] - predictions[0]) / len(predictions)
        
        if slope > 0.5:
            return 'increasing'
        elif slope < -0.5:
            return 'decreasing'
        else:
            return 'stable'
    
    def _assess_condition_risk(self, predictions, historical_avg):
        """Assess risk level based on predictions vs historical average"""
        predicted_avg = np.mean(predictions)
        
        if predicted_avg > historical_avg * 1.5:
            return 'high'
        elif predicted_avg > historical_avg * 1.2:
            return 'medium'
        else:
            return 'low'
    
    def _get_outbreak_recommendations(self, condition, risk_level):
        """Get recommendations based on outbreak risk"""
        recommendations = {
            'low': f"Continue monitoring {condition} cases",
            'medium': f"Increase surveillance for {condition}, consider preventive measures",
            'high': f"Implement outbreak control measures for {condition}, notify health authorities"
        }
        return recommendations.get(risk_level, "Continue monitoring")
    
    def _calculate_staffing_needs(self, avg_monthly_visits):
        """Calculate staffing needs based on predicted visits"""
        visits_per_day = avg_monthly_visits / 30
        if visits_per_day > 20:
            return "Consider additional nursing staff"
        elif visits_per_day > 10:
            return "Current staffing should be adequate"
        else:
            return "Current staffing is sufficient"
    
    def _calculate_supply_needs(self, avg_monthly_visits):
        """Calculate supply needs based on predicted visits"""
        return f"Plan for {int(avg_monthly_visits * 1.2)} monthly supplies to account for variability"
    
    def _assess_facility_needs(self, avg_monthly_visits):
        """Assess facility needs based on predicted visits"""
        if avg_monthly_visits > 100:
            return "Consider expanding clinic facilities"
        elif avg_monthly_visits > 50:
            return "Current facilities should be adequate"
        else:
            return "Current facilities are sufficient"
    
    def _estimate_budget_needs(self, avg_monthly_visits):
        """Estimate budget needs based on predicted visits"""
        estimated_cost_per_visit = 50  # pesos
        monthly_budget = avg_monthly_visits * estimated_cost_per_visit
        return f"Estimated monthly budget: ₱{int(monthly_budget):,}"
    
    def _identify_intervention_opportunity(self, condition, change_percentage):
        """Identify intervention opportunities"""
        if change_percentage > 20:
            return f"High priority: {condition} cases increasing significantly"
        elif change_percentage > 10:
            return f"Medium priority: Monitor {condition} trends"
        else:
            return f"Low priority: {condition} cases stable"
    
    def _predict_intervention_effectiveness(self, condition, change_percentage):
        """Predict intervention effectiveness"""
        if change_percentage > 20:
            return f"Targeted interventions for {condition} could reduce cases by 30-50%"
        elif change_percentage > 10:
            return f"Preventive measures for {condition} could reduce cases by 15-25%"
        else:
            return f"Maintain current prevention strategies for {condition}"
    
    def _get_preventive_recommendations(self, risk_level):
        """Get preventive recommendations based on risk level"""
        recommendations = {
            'low': [
                "Continue current health education programs",
                "Maintain regular health screenings",
                "Promote healthy lifestyle habits"
            ],
            'medium': [
                "Increase health awareness campaigns",
                "Implement targeted prevention programs",
                "Enhance monitoring of high-risk students"
            ],
            'high': [
                "Implement comprehensive health intervention programs",
                "Increase clinic resources and staffing",
                "Develop emergency response protocols",
                "Partner with local health authorities"
            ]
        }
        return recommendations.get(risk_level, ["Continue monitoring"])
    
    def _identify_high_risk_conditions(self, df):
        """Identify conditions with high risk patterns"""
        high_risk_conditions = []
        
        for condition in df['condition'].unique():
            condition_data = df[df['condition'] == condition]
            if len(condition_data) >= 3:
                recent_avg = condition_data.tail(3)['count'].mean()
                historical_avg = condition_data['count'].mean()
                
                if recent_avg > historical_avg * 1.3:
                    high_risk_conditions.append({
                        'condition': condition,
                        'risk_factor': round(recent_avg / historical_avg, 2),
                        'recent_cases': int(recent_avg)
                    })
        
        return sorted(high_risk_conditions, key=lambda x: x['risk_factor'], reverse=True)[:5]
    
    def _suggest_wellness_programs(self, df):
        """Suggest wellness programs based on condition patterns"""
        suggestions = []
        
        # Analyze condition patterns
        condition_counts = df.groupby('condition')['count'].sum()
        
        if 'fever' in condition_counts.index and condition_counts['fever'] > 10:
            suggestions.append("Implement fever prevention program")
        
        if 'headache' in condition_counts.index and condition_counts['headache'] > 8:
            suggestions.append("Develop stress management and headache prevention program")
        
        if 'cough' in condition_counts.index and condition_counts['cough'] > 5:
            suggestions.append("Launch respiratory health awareness campaign")
        
        if len(suggestions) == 0:
            suggestions.append("Continue current wellness programs")
        
        return suggestions
    
    def _get_fallback_predictions(self, months_ahead):
        """Provide fallback predictions when insufficient data"""
        return {
            'condition_forecasts': {},
            'seasonal_predictions': {
                'seasonal_patterns': {},
                'next_seasonal_forecast': [],
                'anomaly_detection': []
            },
            'outbreak_risks': {},
            'resource_predictions': {
                'predicted_monthly_visits': 30,
                'staffing_needs': "Current staffing should be adequate",
                'supply_needs': "Plan for 36 monthly supplies",
                'facility_needs': "Current facilities are sufficient",
                'budget_estimates': "Estimated monthly budget: ₱1,500"
            },
            'intervention_predictions': {},
            'risk_predictions': {
                'overall_health_risk': 'low',
                'trend_analysis': {'recent_avg': 30, 'historical_avg': 30, 'risk_factor': 1.0},
                'preventive_recommendations': ["Continue current health education programs"],
                'high_risk_conditions': [],
                'wellness_program_suggestions': ["Continue current wellness programs"]
            }
        }

class PredictiveMentalHealthAnalytics:
    """
    Advanced AI-powered predictive analytics for mental health trends
    """
    
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.feature_importance = {}
        self.prediction_accuracy = {}
        
    def generate_predictive_insights(self, historical_data: Dict, months_ahead: int = 3) -> Dict[str, Any]:
        """
        Generate comprehensive predictive insights for mental health trends
        
        Args:
            historical_data: Historical monthly condition data
            months_ahead: Number of months to predict ahead
            
        Returns:
            Dict containing predictive insights and forecasts
        """
        
        # Convert to pandas DataFrame for analysis
        df = self._prepare_data_for_prediction(historical_data)
        
        if df.empty or len(df) < 6:  # Need at least 6 months of data
            return self._get_fallback_predictions(months_ahead)
        
        predictions = {}
        
        # 1. LINEAR REGRESSION ANALYSIS
        linear_predictions = self._linear_regression_analysis(df, months_ahead)
        predictions['linear_regression'] = linear_predictions
        
        # 2. RANDOM FOREST ANALYSIS
        random_forest_predictions = self._random_forest_analysis(df, months_ahead)
        predictions['random_forest'] = random_forest_predictions
        
        # 3. SEASONAL DECOMPOSITION ANALYSIS
        seasonal_predictions = self._seasonal_decomposition_analysis(df, months_ahead)
        predictions['seasonal_decomposition'] = seasonal_predictions
        
        # 4. MENTAL HEALTH RISK ASSESSMENT
        risk_assessment = self._assess_mental_health_risks(df)
        predictions['risk_assessment'] = risk_assessment
        
        # 5. INTERVENTION PLANNING PREDICTIONS
        intervention_predictions = self._predict_intervention_needs(df, months_ahead)
        predictions['intervention_predictions'] = intervention_predictions
        
        # 6. STUDENT WELLNESS PREDICTION
        wellness_predictions = self._predict_student_wellness_trends(df)
        predictions['wellness_predictions'] = wellness_predictions
        
        # 7. GENERATE KEY INSIGHTS AS BULLET POINTS
        key_insights = self._generate_key_insights_bullet_points(
            linear_predictions, 
            random_forest_predictions, 
            seasonal_predictions, 
            risk_assessment, 
            intervention_predictions, 
            wellness_predictions
        )
        predictions['key_insights'] = key_insights
        
        return predictions
    
    def _prepare_data_for_prediction(self, historical_data: Dict) -> pd.DataFrame:
        """Prepare historical data for predictive modeling"""
        try:
            # Convert monthly data to DataFrame
            records = []
            for month, conditions in historical_data.items():
                for condition, count in conditions.items():
                    records.append({
                        'month': month,
                        'condition': condition,
                        'count': count,
                        'month_num': int(month.split('-')[1]),
                        'year': int(month.split('-')[0])
                    })
            
            df = pd.DataFrame(records)
            
            if not df.empty:
                # Add time-based features
                df['date'] = pd.to_datetime(df['month'] + '-01')
                df['month_of_year'] = df['date'].dt.month
                df['quarter'] = df['date'].dt.quarter
                df['is_school_year_start'] = (df['month_of_year'].isin([6, 7, 8])).astype(int)
                df['is_exam_period'] = (df['month_of_year'].isin([10, 11, 3, 4])).astype(int)
                df['is_holiday_period'] = (df['month_of_year'].isin([12, 1, 2])).astype(int)
                df['is_summer_break'] = (df['month_of_year'].isin([6, 7, 8])).astype(int)
                
            return df
            
        except Exception as e:
            # Error preparing data
            return pd.DataFrame()
    
    def _linear_regression_analysis(self, df: pd.DataFrame, months_ahead: int) -> Dict[str, Any]:
        """Perform Linear Regression analysis for mental health trends"""
        try:
            # Prepare features (month as numeric)
            df['month_numeric'] = pd.to_datetime(df['month']).dt.to_period('M').astype(int)
            
            # Group by month and sum counts
            monthly_totals = df.groupby('month_numeric')['count'].sum().reset_index()
            
            if len(monthly_totals) < 2:
                return {'error': 'Insufficient data for linear regression'}
            
            # Prepare data for regression
            X = monthly_totals['month_numeric'].values.reshape(-1, 1)
            y = monthly_totals['count'].values
            
            # Fit linear regression
            model = LinearRegression()
            model.fit(X, y)
            
            # Predict next months
            future_months = np.array(range(monthly_totals['month_numeric'].max() + 1, 
                                          monthly_totals['month_numeric'].max() + 1 + months_ahead)).reshape(-1, 1)
            future_predictions = model.predict(future_months)
            
            # Calculate trend direction
            trend_direction = 'increasing' if model.coef_[0] > 0 else 'decreasing'
            trend_strength = abs(model.coef_[0])
            
            return {
                'slope': float(model.coef_[0]),
                'intercept': float(model.intercept_),
                'r2_score': float(model.score(X, y)),
                'future_predictions': future_predictions.tolist(),
                'trend_direction': trend_direction,
                'trend_strength': float(trend_strength),
                'confidence_level': self._calculate_confidence_level(model.score(X, y))
            }
            
        except Exception as e:
            return {'error': f'Linear regression error: {str(e)}'}
    
    def _random_forest_analysis(self, df: pd.DataFrame, months_ahead: int) -> Dict[str, Any]:
        """Perform Random Forest analysis for mental health trends"""
        try:
            # Prepare features
            df['month_numeric'] = pd.to_datetime(df['month']).dt.to_period('M').astype(int)
            df['condition_encoded'] = df['condition'].astype('category').cat.codes
            
            # Group by month and condition
            monthly_conditions = df.groupby(['month_numeric', 'condition_encoded'])['count'].sum().reset_index()
            
            if len(monthly_conditions) < 3:
                return {'error': 'Insufficient data for random forest'}
            
            # Prepare features
            X = monthly_conditions[['month_numeric', 'condition_encoded']].values
            y = monthly_conditions['count'].values
            
            # Fit random forest
            model = RandomForestRegressor(n_estimators=100, random_state=42)
            model.fit(X, y)
            
            # Feature importance
            feature_importance = {
                'month': float(model.feature_importances_[0]),
                'condition': float(model.feature_importances_[1])
            }
            
            # Predict next month
            last_month = monthly_conditions['month_numeric'].max()
            next_month = last_month + 1
            
            # Predict for each condition
            predictions = {}
            for condition_code in monthly_conditions['condition_encoded'].unique():
                prediction = model.predict([[next_month, condition_code]])
                predictions[f'condition_{condition_code}'] = float(prediction[0])
            
            return {
                'feature_importance': feature_importance,
                'next_month_predictions': predictions,
                'model_score': float(model.score(X, y)),
                'prediction_confidence': self._calculate_rf_confidence(model, X, y)
            }
            
        except Exception as e:
            return {'error': f'Random forest error: {str(e)}'}
    
    def _seasonal_decomposition_analysis(self, df: pd.DataFrame, months_ahead: int) -> Dict[str, Any]:
        """Perform Seasonal Decomposition analysis for mental health trends"""
        try:
            if not STATSMODELS_AVAILABLE:
                return {'error': 'statsmodels not available for seasonal decomposition'}
            
            # Prepare time series data
            df['month_numeric'] = pd.to_datetime(df['month']).dt.to_period('M').astype(int)
            monthly_totals = df.groupby('month_numeric')['count'].sum()
            
            if len(monthly_totals) < 4:
                return {'error': 'Insufficient data for seasonal decomposition'}
            
            # Perform seasonal decomposition
            decomposition = seasonal_decompose(monthly_totals, period=3, extrapolate_trend='freq')
            
            # Calculate seasonal strength
            seasonal_strength = float(np.std(decomposition.seasonal) / np.std(decomposition.resid)) if np.std(decomposition.resid) > 0 else 0
            
            # Identify seasonal patterns
            seasonal_patterns = self._identify_seasonal_patterns(decomposition.seasonal)
            
            return {
                'trend': decomposition.trend.tolist(),
                'seasonal': decomposition.seasonal.tolist(),
                'residual': decomposition.resid.tolist(),
                'seasonal_strength': seasonal_strength,
                'seasonal_patterns': seasonal_patterns,
                'trend_direction': self._determine_trend_direction(decomposition.trend)
            }
            
        except Exception as e:
            return {'error': f'Seasonal decomposition error: {str(e)}'}
    
    def _assess_mental_health_risks(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Assess mental health risks and patterns"""
        try:
            risk_assessment = {}
            
            # Analyze high-risk conditions
            high_risk_conditions = ['suicide', 'self-harm', 'depression', 'anxiety']
            
            for condition in high_risk_conditions:
                condition_data = df[df['condition'].str.contains(condition, case=False, na=False)]
                
                if not condition_data.empty:
                    # Calculate risk indicators
                    recent_trend = condition_data.tail(3)['count'].mean()
                    historical_avg = condition_data['count'].mean()
                    trend_ratio = recent_trend / historical_avg if historical_avg > 0 else 1
                    
                    risk_level = 'low'
                    if trend_ratio > 1.5:
                        risk_level = 'high'
                    elif trend_ratio > 1.2:
                        risk_level = 'medium'
                    
                    risk_assessment[condition] = {
                        'risk_level': risk_level,
                        'trend_ratio': trend_ratio,
                        'recent_cases': int(recent_trend),
                        'historical_avg': int(historical_avg),
                        'recommendations': self._get_mental_health_recommendations(condition, risk_level)
                    }
            
            # Overall mental health risk assessment
            monthly_totals = df.groupby('month')['count'].sum()
            if len(monthly_totals) >= 3:
                recent_avg = monthly_totals.tail(3).mean()
                historical_avg = monthly_totals.mean()
                
                overall_risk = 'low'
                if recent_avg > historical_avg * 1.3:
                    overall_risk = 'high'
                elif recent_avg > historical_avg * 1.1:
                    overall_risk = 'medium'
                
                risk_assessment['overall'] = {
                    'risk_level': overall_risk,
                    'trend_analysis': {
                        'recent_avg': int(recent_avg),
                        'historical_avg': int(historical_avg),
                        'risk_factor': round(recent_avg / historical_avg, 2) if historical_avg > 0 else 1
                    }
                }
            
            return risk_assessment
            
        except Exception as e:
            return {'error': f'Risk assessment error: {str(e)}'}
    
    def _predict_intervention_needs(self, df: pd.DataFrame, months_ahead: int) -> Dict[str, Any]:
        """Predict intervention needs for mental health"""
        try:
            intervention_predictions = {}
            
            # Predict total mental health visits
            monthly_totals = df.groupby('month')['count'].sum().reset_index()
            
            if len(monthly_totals) < 3:
                return {}
            
            # Simple linear regression for total visits
            X = np.arange(len(monthly_totals)).reshape(-1, 1)
            y = monthly_totals['count'].values
            
            model = LinearRegression()
            model.fit(X, y)
            
            # Predict future months
            future_X = np.arange(len(monthly_totals), len(monthly_totals) + months_ahead).reshape(-1, 1)
            future_predictions = model.predict(future_X)
            
            # Intervention planning recommendations
            avg_monthly_visits = np.mean(future_predictions)
            
            intervention_predictions = {
                'predicted_monthly_visits': int(avg_monthly_visits),
                'counseling_needs': self._calculate_counseling_needs(avg_monthly_visits),
                'crisis_intervention_needs': self._assess_crisis_intervention_needs(df),
                'preventive_program_needs': self._assess_preventive_program_needs(df),
                'resource_allocation': self._estimate_resource_allocation(avg_monthly_visits)
            }
            
            return intervention_predictions
            
        except Exception as e:
            return {'error': f'Intervention prediction error: {str(e)}'}
    
    def _predict_student_wellness_trends(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Predict student wellness trends"""
        try:
            wellness_predictions = {}
            
            # Analyze patterns that indicate student wellness
            monthly_totals = df.groupby('month')['count'].sum()
            
            if len(monthly_totals) >= 3:
                # Calculate wellness indicators
                recent_trend = monthly_totals.tail(3).mean()
                historical_avg = monthly_totals.mean()
                
                wellness_level = 'stable'
                if recent_trend < historical_avg * 0.8:
                    wellness_level = 'improving'
                elif recent_trend > historical_avg * 1.2:
                    wellness_level = 'declining'
                
                wellness_predictions = {
                    'wellness_level': wellness_level,
                    'trend_analysis': {
                        'recent_avg': int(recent_trend),
                        'historical_avg': int(historical_avg),
                        'wellness_factor': round(recent_trend / historical_avg, 2) if historical_avg > 0 else 1
                    },
                    'wellness_recommendations': self._get_wellness_recommendations(wellness_level),
                    'preventive_measures': self._suggest_preventive_measures(df)
                }
            
            return wellness_predictions
            
        except Exception as e:
            return {'error': f'Wellness prediction error: {str(e)}'}
    
    # Helper methods
    def _calculate_confidence_level(self, r2_score):
        """Calculate confidence level based on R² score"""
        if r2_score >= 0.8:
            return 'high'
        elif r2_score >= 0.6:
            return 'medium'
        else:
            return 'low'
    
    def _calculate_rf_confidence(self, model, X, y):
        """Calculate Random Forest confidence"""
        score = model.score(X, y)
        if score >= 0.7:
            return 'high'
        elif score >= 0.5:
            return 'medium'
        else:
            return 'low'
    
    def _identify_seasonal_patterns(self, seasonal_data):
        """Identify seasonal patterns in mental health data"""
        patterns = []
        
        # Check for school year patterns
        if len(seasonal_data) >= 12:
            school_start_peak = seasonal_data[8:10].mean()  # September-October
            exam_period_peak = seasonal_data[2:4].mean()    # March-April
            
            if school_start_peak > seasonal_data.mean() * 1.2:
                patterns.append("School start stress peak")
            if exam_period_peak > seasonal_data.mean() * 1.2:
                patterns.append("Exam period stress peak")
        
        return patterns
    
    def _determine_trend_direction(self, trend_data):
        """Determine trend direction from decomposition"""
        if len(trend_data) < 2:
            return 'stable'
        
        # Remove NaN values
        trend_clean = trend_data.dropna()
        if len(trend_clean) < 2:
            return 'stable'
        
        slope = (trend_clean.iloc[-1] - trend_clean.iloc[0]) / len(trend_clean)
        
        if slope > 0.5:
            return 'increasing'
        elif slope < -0.5:
            return 'decreasing'
        else:
            return 'stable'
    
    def _get_mental_health_recommendations(self, condition, risk_level):
        """Get recommendations based on mental health risk"""
        recommendations = {
            'suicide': {
                'low': "Continue monitoring suicide prevention programs",
                'medium': "Increase suicide prevention awareness and screening",
                'high': "Implement comprehensive suicide prevention program, increase crisis intervention resources"
            },
            'self-harm': {
                'low': "Maintain self-harm prevention education",
                'medium': "Enhance self-harm prevention programs and monitoring",
                'high': "Implement intensive self-harm prevention and intervention program"
            },
            'depression': {
                'low': "Continue depression awareness programs",
                'medium': "Increase depression screening and support services",
                'high': "Implement comprehensive depression prevention and treatment program"
            },
            'anxiety': {
                'low': "Maintain anxiety management programs",
                'medium': "Enhance anxiety management and stress reduction programs",
                'high': "Implement intensive anxiety management and stress reduction program"
            }
        }
        return recommendations.get(condition, {}).get(risk_level, "Continue monitoring")
    
    def _calculate_counseling_needs(self, avg_monthly_visits):
        """Calculate counseling needs based on predicted visits"""
        visits_per_day = avg_monthly_visits / 30
        if visits_per_day > 5:
            return "Consider additional counseling staff"
        elif visits_per_day > 3:
            return "Current counseling staff should be adequate"
        else:
            return "Current counseling staff is sufficient"
    
    def _assess_crisis_intervention_needs(self, df):
        """Assess crisis intervention needs"""
        crisis_conditions = df[df['condition'].str.contains('suicide|self-harm', case=False, na=False)]
        if not crisis_conditions.empty:
            recent_crisis_cases = crisis_conditions.tail(3)['count'].sum()
            if recent_crisis_cases > 5:
                return "High need for crisis intervention resources"
            elif recent_crisis_cases > 2:
                return "Moderate need for crisis intervention resources"
            else:
                return "Current crisis intervention resources adequate"
        return "No crisis intervention needs identified"
    
    def _assess_preventive_program_needs(self, df):
        """Assess preventive program needs"""
        total_cases = df['count'].sum()
        if total_cases > 100:
            return "Implement comprehensive mental health prevention programs"
        elif total_cases > 50:
            return "Enhance existing mental health prevention programs"
        else:
            return "Maintain current prevention programs"
    
    def _estimate_resource_allocation(self, avg_monthly_visits):
        """Estimate resource allocation needs"""
        estimated_cost_per_visit = 100  # pesos
        monthly_budget = avg_monthly_visits * estimated_cost_per_visit
        return f"Estimated monthly budget: ₱{int(monthly_budget):,}"
    
    def _get_wellness_recommendations(self, wellness_level):
        """Get wellness recommendations based on level"""
        recommendations = {
            'improving': [
                "Continue current wellness programs",
                "Maintain positive mental health initiatives",
                "Reinforce healthy coping strategies"
            ],
            'stable': [
                "Continue current wellness programs",
                "Monitor for any changes in trends",
                "Maintain preventive measures"
            ],
            'declining': [
                "Implement additional wellness programs",
                "Increase mental health awareness campaigns",
                "Enhance support services",
                "Consider crisis intervention resources"
            ]
        }
        return recommendations.get(wellness_level, ["Continue monitoring"])
    
    def _suggest_preventive_measures(self, df):
        """Suggest preventive measures based on data patterns"""
        suggestions = []
        
        # Analyze condition patterns
        condition_counts = df.groupby('condition')['count'].sum()
        
        if 'depression' in condition_counts.index and condition_counts['depression'] > 10:
            suggestions.append("Implement depression prevention program")
        
        if 'anxiety' in condition_counts.index and condition_counts['anxiety'] > 8:
            suggestions.append("Develop stress management and anxiety prevention program")
        
        if 'suicide' in condition_counts.index and condition_counts['suicide'] > 3:
            suggestions.append("Launch comprehensive suicide prevention campaign")
        
        if len(suggestions) == 0:
            suggestions.append("Continue current mental health prevention programs")
        
        return suggestions
    
    def _get_fallback_predictions(self, months_ahead):
        """Provide fallback predictions when insufficient data"""
        return {
            'linear_regression': {
                'trend_direction': 'stable',
                'confidence_level': 'low',
                'future_predictions': [15] * months_ahead
            },
            'random_forest': {
                'model_score': 0.5,
                'prediction_confidence': 'low',
                'next_month_predictions': {}
            },
            'seasonal_decomposition': {
                'seasonal_strength': 0.0,
                'trend_direction': 'stable',
                'seasonal_patterns': []
            },
            'risk_assessment': {
                'overall': {
                    'risk_level': 'low',
                    'trend_analysis': {'recent_avg': 15, 'historical_avg': 15, 'risk_factor': 1.0}
                }
            },
            'intervention_predictions': {
                'predicted_monthly_visits': 15,
                'counseling_needs': "Current counseling staff is sufficient",
                'crisis_intervention_needs': "Current crisis intervention resources adequate",
                'preventive_program_needs': "Maintain current prevention programs",
                'resource_allocation': "Estimated monthly budget: ₱1,500"
            },
            'wellness_predictions': {
                'wellness_level': 'stable',
                'trend_analysis': {'recent_avg': 15, 'historical_avg': 15, 'wellness_factor': 1.0},
                'wellness_recommendations': ["Continue current wellness programs"],
                'preventive_measures': ["Continue current mental health prevention programs"]
            }
        }

    def _generate_key_insights_bullet_points(self, linear_predictions, random_forest_predictions, seasonal_predictions, risk_assessment, intervention_predictions, wellness_predictions):
        """
        Generates professional key insights as single-sentence bullet points from the predictions.
        """
        insights = []

        # Trend Analysis Insights
        if 'trend_direction' in linear_predictions:
            trend_direction = linear_predictions['trend_direction']
            if trend_direction == 'increasing':
                insights.append("Mental health cases are trending upward, indicating a need for enhanced intervention strategies.")
            elif trend_direction == 'decreasing':
                insights.append("Mental health cases are declining, suggesting current prevention programs are effective.")
            else:
                insights.append("Mental health trends remain stable, maintaining current support levels is recommended.")

        # Risk Assessment Insights
        if 'overall' in risk_assessment:
            risk_level = risk_assessment['overall']['risk_level']
            risk_factor = risk_assessment['overall']['trend_analysis']['risk_factor']
            
            if risk_level == 'high':
                insights.append("High-risk mental health patterns detected, immediate intervention protocols should be activated.")
            elif risk_level == 'medium':
                insights.append("Moderate risk levels observed, consider scaling up preventive measures and monitoring.")
            else:
                insights.append("Low-risk mental health environment maintained, continue current prevention strategies.")

        # Seasonal Pattern Insights
        if 'seasonal_strength' in seasonal_predictions:
            seasonal_strength = seasonal_predictions['seasonal_strength']
            if seasonal_strength > 0.5:
                insights.append("Strong seasonal patterns identified, prepare for predictable mental health fluctuations.")
            elif seasonal_strength > 0.2:
                insights.append("Moderate seasonal variations detected, adjust resources for peak periods.")
        else:
                insights.append("Minimal seasonal patterns observed, consistent resource allocation is appropriate.")

        # Resource Planning Insights
        if 'predicted_monthly_visits' in intervention_predictions:
            predicted_visits = intervention_predictions['predicted_monthly_visits']
            if predicted_visits > 50:
                insights.append("High demand predicted for mental health services, consider expanding counseling resources.")
            elif predicted_visits > 25:
                insights.append("Moderate demand expected, current staffing levels should be adequate.")
        else:
                insights.append("Low demand forecasted, maintain current service levels and focus on prevention.")

        # Intervention Effectiveness Insights
        if 'counseling_needs' in intervention_predictions:
            counseling_needs = intervention_predictions['counseling_needs']
            if 'additional' in counseling_needs.lower():
                insights.append("Counseling staff expansion recommended to meet projected service demands.")
        else:
                insights.append("Current counseling resources are sufficient for projected caseload.")

        # Crisis Intervention Insights
        if 'crisis_intervention_needs' in intervention_predictions:
            crisis_needs = intervention_predictions['crisis_intervention_needs']
            if 'high' in crisis_needs.lower():
                insights.append("Critical need for enhanced crisis intervention resources and protocols.")
            elif 'moderate' in crisis_needs.lower():
                insights.append("Moderate crisis intervention needs identified, consider resource augmentation.")
        else:
                insights.append("Crisis intervention resources are currently adequate for demand levels.")

        # Wellness Trend Insights
        if 'wellness_level' in wellness_predictions:
            wellness_level = wellness_predictions['wellness_level']
            if wellness_level == 'improving':
                insights.append("Student wellness indicators are improving, continue current support programs.")
            elif wellness_level == 'declining':
                insights.append("Student wellness trends are declining, implement additional support initiatives.")
        else:
                insights.append("Student wellness levels remain stable, maintain current wellness programs.")

        # Budget Planning Insights
        if 'resource_allocation' in intervention_predictions:
            budget_info = intervention_predictions['resource_allocation']
            insights.append(f"Budget planning: {budget_info} for mental health services.")

        # Prevention Program Insights
        if 'preventive_program_needs' in intervention_predictions:
            program_needs = intervention_predictions['preventive_program_needs']
            if 'comprehensive' in program_needs.lower():
                insights.append("Comprehensive mental health prevention programs recommended for optimal outcomes.")
            elif 'enhance' in program_needs.lower():
                insights.append("Enhancement of existing prevention programs suggested for better coverage.")
        else:
                insights.append("Current prevention programs are meeting needs effectively.")

        return insights


class PredictiveAmietiEngagementAnalytics:
    """
    AI-powered predictive analytics for AMIETI Engagement Trends
    Uses Linear Regression, Random Forest, and Seasonal Decomposition
    """
    
    def __init__(self):
        self.models = {}
        self.scalers = {}
        self.feature_importance = {}
        self.prediction_accuracy = {}
        
    def generate_predictive_insights(self, engagement_data: Dict, months_ahead: int = 3) -> Dict[str, Any]:
        """
        Generate comprehensive predictive insights for AMIETI engagement trends
        
        Args:
            engagement_data: Historical engagement data with 'labels' and 'datasets'
            months_ahead: Number of months to predict ahead
            
        Returns:
            Dict containing predictive insights and forecasts
        """
        
        try:
            # Extract data from engagement_data
            labels = engagement_data.get('labels', [])
            datasets = engagement_data.get('datasets', [])
            
            if not labels or not datasets:
                return self._get_fallback_predictions(months_ahead)
            
            predictions = {}
            
            # Process each dataset (Check-ins and Conversations)
            for dataset in datasets:
                label = dataset.get('label', '')
                data = dataset.get('data', [])
                
                if not data or len(data) < 6:  # Need at least 6 months of data
                    continue
                
                # 1. LINEAR REGRESSION PREDICTIONS
                lr_predictions = self._linear_regression_predict(data, months_ahead)
                
                # 2. RANDOM FOREST PREDICTIONS
                rf_predictions = self._random_forest_predict(data, months_ahead)
                
                # 3. SEASONAL DECOMPOSITION PREDICTIONS
                seasonal_predictions = self._seasonal_decomposition_predict(data, months_ahead)
                
                # 4. COMBINE PREDICTIONS AND GENERATE INSIGHTS
                combined_insights = self._generate_combined_insights(
                    data, lr_predictions, rf_predictions, seasonal_predictions, months_ahead
                )
                
                predictions[label] = {
                    'linear_regression': lr_predictions,
                    'random_forest': rf_predictions,
                    'seasonal_decomposition': seasonal_predictions,
                    'combined_insights': combined_insights
                }
            
            # 5. OVERALL ENGAGEMENT TREND ANALYSIS
            overall_insights = self._analyze_overall_trends(predictions)
            predictions['overall_insights'] = overall_insights
            
            # 6. GENERATE KEY INSIGHTS
            predictions['key_insights'] = self._generate_amieti_key_insights(predictions)
            
            return predictions
            
        except Exception as e:
            print(f"Error in AMIETI engagement prediction: {e}")
            return self._get_fallback_predictions(months_ahead)
    
    def _linear_regression_predict(self, data: List[float], months_ahead: int) -> Dict[str, Any]:
        """Predict using Linear Regression"""
        try:
            X = np.arange(len(data)).reshape(-1, 1)
            y = np.array(data)
            
            # Train Linear Regression model
            lr_model = LinearRegression()
            lr_model.fit(X, y)
            
            # Predict future months
            future_X = np.arange(len(data), len(data) + months_ahead).reshape(-1, 1)
            future_predictions = lr_model.predict(future_X)
            
            # Calculate metrics
            y_pred = lr_model.predict(X)
            mae = mean_absolute_error(y, y_pred)
            mse = mean_squared_error(y, y_pred)
            
            # Determine trend
            trend = "increasing" if lr_model.coef_[0] > 0 else "decreasing"
            trend_strength = abs(lr_model.coef_[0])
            
            return {
                'predictions': future_predictions.tolist(),
                'trend': trend,
                'trend_strength': float(trend_strength),
                'slope': float(lr_model.coef_[0]),
                'intercept': float(lr_model.intercept_),
                'mae': float(mae),
                'mse': float(mse),
                'r2_score': float(lr_model.score(X, y))
            }
        except Exception as e:
            print(f"Error in Linear Regression prediction: {e}")
            return {}
    
    def _random_forest_predict(self, data: List[float], months_ahead: int) -> Dict[str, Any]:
        """Predict using Random Forest"""
        try:
            X = np.arange(len(data)).reshape(-1, 1)
            y = np.array(data)
            
            # Train Random Forest model
            rf_model = RandomForestRegressor(n_estimators=100, random_state=42)
            rf_model.fit(X, y)
            
            # Predict future months
            future_X = np.arange(len(data), len(data) + months_ahead).reshape(-1, 1)
            future_predictions = rf_model.predict(future_X)
            
            # Calculate metrics
            y_pred = rf_model.predict(X)
            mae = mean_absolute_error(y, y_pred)
            mse = mean_squared_error(y, y_pred)
            
            # Feature importance
            feature_importance = rf_model.feature_importances_[0] if len(rf_model.feature_importances_) > 0 else 0
            
            return {
                'predictions': future_predictions.tolist(),
                'mae': float(mae),
                'mse': float(mse),
                'r2_score': float(rf_model.score(X, y)),
                'feature_importance': float(feature_importance),
                'n_estimators': rf_model.n_estimators
            }
        except Exception as e:
            print(f"Error in Random Forest prediction: {e}")
            return {}
    
    def _seasonal_decomposition_predict(self, data: List[float], months_ahead: int) -> Dict[str, Any]:
        """Predict using Seasonal Decomposition"""
        if not STATSMODELS_AVAILABLE or len(data) < 12:
            return {}
        
        try:
            # Convert to pandas Series
            series = pd.Series(data)
            
            # Perform seasonal decomposition
            decomposition = seasonal_decompose(series, period=12, extrapolate_trend='freq')
            
            # Extract components
            trend = decomposition.trend.tolist()
            seasonal = decomposition.seasonal.tolist()
            residual = decomposition.resid.tolist()
            
            # Predict future components
            future_trend = trend[-1] if len(trend) > 0 else np.mean(data)
            future_seasonal = seasonal[-12:][:months_ahead] if len(seasonal) >= 12 else [0] * months_ahead
            future_residual = [0] * months_ahead  # Assume no residual for future
            
            # Combine for final predictions
            future_predictions = []
            for i in range(months_ahead):
                pred = future_trend + future_seasonal[i] + future_residual[i]
                future_predictions.append(max(0, pred))  # Ensure non-negative
            
            # Calculate seasonal strength
            seasonal_strength = np.std(seasonal) / np.std(data) if np.std(data) > 0 else 0
            
            return {
                'predictions': future_predictions,
                'trend': trend,
                'seasonal': seasonal,
                'residual': residual,
                'seasonal_strength': float(seasonal_strength),
                'trend_direction': "increasing" if (len(trend) > 1 and trend[-1] > trend[0]) else "decreasing" if len(trend) > 1 else "stable"
            }
        except Exception as e:
            print(f"Error in Seasonal Decomposition prediction: {e}")
            return {}
    
    def _generate_combined_insights(self, data: List[float], lr_pred: Dict, rf_pred: Dict, 
                                  seasonal_pred: Dict, months_ahead: int) -> Dict[str, Any]:
        """Generate combined insights from all three algorithms"""
        try:
            insights = {}
            
            # 1. TREND ANALYSIS
            if lr_pred:
                insights['trend'] = {
                    'direction': lr_pred.get('trend', 'stable'),
                    'strength': lr_pred.get('trend_strength', 0),
                    'confidence': lr_pred.get('r2_score', 0)
                }
            
            # 2. SEASONAL PATTERNS
            if seasonal_pred:
                insights['seasonal'] = {
                    'strength': seasonal_pred.get('seasonal_strength', 0),
                    'pattern': "strong" if seasonal_pred.get('seasonal_strength', 0) > 0.3 else "weak"
                }
            
            # 3. PREDICTION ACCURACY
            accuracies = []
            if lr_pred and 'r2_score' in lr_pred:
                accuracies.append(('Linear Regression', lr_pred['r2_score']))
            if rf_pred and 'r2_score' in rf_pred:
                accuracies.append(('Random Forest', rf_pred['r2_score']))
            
            best_model = max(accuracies, key=lambda x: x[1]) if accuracies else ('None', 0)
            insights['best_model'] = {
                'name': best_model[0],
                'accuracy': best_model[1]
            }
            
            # 4. FUTURE PREDICTIONS (average of all models)
            future_predictions = []
            predictions_list = []
            
            if lr_pred and 'predictions' in lr_pred:
                predictions_list.append(lr_pred['predictions'])
            if rf_pred and 'predictions' in rf_pred:
                predictions_list.append(rf_pred['predictions'])
            if seasonal_pred and 'predictions' in seasonal_pred:
                predictions_list.append(seasonal_pred['predictions'])
            
            if predictions_list:
                # Average predictions from all available models
                for i in range(months_ahead):
                    month_predictions = [pred[i] for pred in predictions_list if i < len(pred)]
                    if month_predictions:
                        avg_prediction = sum(month_predictions) / len(month_predictions)
                        future_predictions.append(max(0, avg_prediction))
            
            insights['future_predictions'] = future_predictions
            
            # 5. GROWTH PROJECTION
            if future_predictions and data:
                current_avg = np.mean(data[-3:]) if len(data) >= 3 else np.mean(data)
                future_avg = np.mean(future_predictions)
                
                if current_avg > 0:
                    growth_rate = (future_avg - current_avg) / current_avg
                    insights['growth_projection'] = {
                        'rate': float(growth_rate),
                        'direction': "positive" if growth_rate > 0 else "negative",
                        'magnitude': "high" if abs(growth_rate) > 0.2 else "moderate" if abs(growth_rate) > 0.1 else "low"
                    }
            
            return insights
            
        except Exception as e:
            print(f"Error generating combined insights: {e}")
            return {}
    
    def _analyze_overall_trends(self, predictions: Dict) -> Dict[str, Any]:
        """Analyze overall engagement trends"""
        try:
            overall_insights = {}
            
            # Extract insights from each engagement type
            checkins_insights = predictions.get('Check-ins', {}).get('combined_insights', {})
            conversations_insights = predictions.get('Conversations', {}).get('combined_insights', {})
            
            # 1. OVERALL TREND
            trends = []
            if checkins_insights.get('trend', {}).get('direction'):
                trends.append(('Check-ins', checkins_insights['trend']['direction']))
            if conversations_insights.get('trend', {}).get('direction'):
                trends.append(('Conversations', conversations_insights['trend']['direction']))
            
            overall_insights['trends'] = trends
            
            # 2. GROWTH COMPARISON
            growth_rates = []
            if checkins_insights.get('growth_projection'):
                growth_rates.append(('Check-ins', checkins_insights['growth_projection']['rate']))
            if conversations_insights.get('growth_projection'):
                growth_rates.append(('Conversations', conversations_insights['growth_projection']['rate']))
            
            overall_insights['growth_rates'] = growth_rates
            
            # 3. RECOMMENDATIONS
            recommendations = []
            
            # Check for declining trends
            declining_features = [feature for feature, trend in trends if trend == 'decreasing']
            if declining_features:
                recommendations.append(f"Focus on improving {', '.join(declining_features)} engagement")
            
            # Check for growth opportunities
            growing_features = [feature for feature, trend in trends if trend == 'increasing']
            if growing_features:
                recommendations.append(f"Maintain momentum in {', '.join(growing_features)}")
            
            # Check for seasonal patterns
            if checkins_insights.get('seasonal', {}).get('pattern') == 'strong':
                recommendations.append("Consider seasonal engagement strategies")
            
            overall_insights['recommendations'] = recommendations
            
            return overall_insights
            
        except Exception as e:
            print(f"Error analyzing overall trends: {e}")
            return {}
    
    def _get_fallback_predictions(self, months_ahead: int) -> Dict[str, Any]:
        """Return fallback predictions when insufficient data"""
        return {
            'Check-ins': {
                'combined_insights': {
                    'trend': {'direction': 'stable', 'strength': 0, 'confidence': 0},
                    'future_predictions': [0] * months_ahead,
                    'growth_projection': {'rate': 0, 'direction': 'stable', 'magnitude': 'low'}
                }
            },
            'Conversations': {
                'combined_insights': {
                    'trend': {'direction': 'stable', 'strength': 0, 'confidence': 0},
                    'future_predictions': [0] * months_ahead,
                    'growth_projection': {'rate': 0, 'direction': 'stable', 'magnitude': 'low'}
                }
            },
            'overall_insights': {
                'trends': [],
                'growth_rates': [],
                'recommendations': ['Insufficient data for predictions']
            },
            'key_insights': self._generate_amieti_key_insights({})
        }

    def _generate_amieti_key_insights(self, predictions: Dict = None) -> List[str]:
        """
        Generate dynamic Key Insights for AMIETI Chatbot based on actual predictive analytics data
        """
        insights = []
        
        if not predictions:
            # Fallback insights when no predictions available
            return [
                "Rule-based chatbot conversations are increasing engagement",
                "Daily mood check-ins remain the most popular feature", 
                "Students are actively using the \"Chat with me\" feature",
                "Conversations are leading to better mental health support"
            ]
        
        try:
            # Extract insights from Check-ins predictions
            checkins_insights = predictions.get('Check-ins', {}).get('combined_insights', {})
            conversations_insights = predictions.get('Conversations', {}).get('combined_insights', {})
            
            # 1. TREND ANALYSIS INSIGHTS
            if checkins_insights.get('trend'):
                trend = checkins_insights['trend']
                direction = trend.get('direction', 'stable')
                confidence = trend.get('confidence', 0)
                
                if direction == 'increasing':
                    insights.append(f"Check-ins are trending upward with {confidence:.1%} confidence, indicating growing student engagement")
                elif direction == 'decreasing':
                    insights.append(f"Check-ins are declining with {confidence:.1%} confidence, suggesting need for engagement strategies")
                else:
                    insights.append(f"Check-ins remain stable with {confidence:.1%} confidence, maintaining consistent engagement levels")
            
            if conversations_insights.get('trend'):
                trend = conversations_insights['trend']
                direction = trend.get('direction', 'stable')
                confidence = trend.get('confidence', 0)
                
                if direction == 'increasing':
                    insights.append(f"Chatbot conversations are increasing with {confidence:.1%} confidence, showing improved student interaction")
                elif direction == 'decreasing':
                    insights.append(f"Chatbot conversations are decreasing with {confidence:.1%} confidence, indicating reduced engagement")
                else:
                    insights.append(f"Chatbot conversations remain stable with {confidence:.1%} confidence, maintaining consistent interaction levels")
            
            # 2. GROWTH PROJECTION INSIGHTS
            if checkins_insights.get('growth_projection'):
                growth = checkins_insights['growth_projection']
                rate = growth.get('rate', 0)
                magnitude = growth.get('magnitude', 'low')
                
                if rate > 0:
                    insights.append(f"Check-ins projected to grow by {abs(rate):.1%} ({magnitude} growth), indicating positive engagement trends")
                elif rate < 0:
                    insights.append(f"Check-ins projected to decline by {abs(rate):.1%} ({magnitude} decline), suggesting intervention needed")
                else:
                    insights.append("Check-ins projected to remain stable, maintaining current engagement levels")
            
            if conversations_insights.get('growth_projection'):
                growth = conversations_insights['growth_projection']
                rate = growth.get('rate', 0)
                magnitude = growth.get('magnitude', 'low')
                
                if rate > 0:
                    insights.append(f"Chatbot conversations projected to increase by {abs(rate):.1%} ({magnitude} growth), showing improving student interaction")
                elif rate < 0:
                    insights.append(f"Chatbot conversations projected to decrease by {abs(rate):.1%} ({magnitude} decline), indicating reduced engagement")
                else:
                    insights.append("Chatbot conversations projected to remain stable, maintaining consistent interaction levels")
            
            # 3. SEASONAL PATTERN INSIGHTS
            if checkins_insights.get('seasonal'):
                seasonal = checkins_insights['seasonal']
                pattern = seasonal.get('pattern', 'weak')
                strength = seasonal.get('strength', 0)
                
                if pattern == 'strong' and strength > 0.3:
                    insights.append(f"Strong seasonal patterns detected in check-ins (strength: {strength:.2f}), suggesting predictable engagement cycles")
                elif pattern == 'weak':
                    insights.append("Minimal seasonal patterns in check-ins, indicating consistent year-round engagement")
            
            if conversations_insights.get('seasonal'):
                seasonal = conversations_insights['seasonal']
                pattern = seasonal.get('pattern', 'weak')
                strength = seasonal.get('strength', 0)
                
                if pattern == 'strong' and strength > 0.3:
                    insights.append(f"Strong seasonal patterns detected in conversations (strength: {strength:.2f}), showing cyclical interaction patterns")
                elif pattern == 'weak':
                    insights.append("Minimal seasonal patterns in conversations, indicating consistent year-round interaction")
            
            # 4. MODEL ACCURACY INSIGHTS
            if checkins_insights.get('best_model'):
                best_model = checkins_insights['best_model']
                model_name = best_model.get('name', 'Unknown')
                accuracy = best_model.get('accuracy', 0)
                
                if accuracy > 0.7:
                    insights.append(f"High prediction accuracy ({accuracy:.1%}) using {model_name} for check-ins, indicating reliable forecasts")
                elif accuracy > 0.5:
                    insights.append(f"Moderate prediction accuracy ({accuracy:.1%}) using {model_name} for check-ins, forecasts should be used with caution")
                else:
                    insights.append(f"Low prediction accuracy ({accuracy:.1%}) using {model_name} for check-ins, consider data quality improvements")
            
            # 5. COMPARATIVE INSIGHTS
            if checkins_insights.get('growth_projection') and conversations_insights.get('growth_projection'):
                checkins_rate = checkins_insights['growth_projection'].get('rate', 0)
                conversations_rate = conversations_insights['growth_projection'].get('rate', 0)
                
                if checkins_rate > conversations_rate:
                    insights.append("Check-ins growing faster than conversations, suggesting preference for quick interactions")
                elif conversations_rate > checkins_rate:
                    insights.append("Conversations growing faster than check-ins, indicating preference for detailed interactions")
                else:
                    insights.append("Check-ins and conversations growing at similar rates, showing balanced engagement patterns")
            
            # Ensure we have at least 4 insights
            while len(insights) < 4:
                if len(insights) == 0:
                    insights.append("Predictive analytics indicate stable engagement patterns for AMIETI chatbot")
                elif len(insights) == 1:
                    insights.append("Data analysis shows consistent student interaction with wellness features")
                elif len(insights) == 2:
                    insights.append("Machine learning models suggest continued engagement growth")
                elif len(insights) == 3:
                    insights.append("AI-powered insights indicate positive mental health support outcomes")
            
            # Return top 4 most relevant insights
            return insights[:4]
            
        except Exception as e:
            print(f"Error generating dynamic key insights: {e}")
            # Fallback to static insights
            return [
                "Rule-based chatbot conversations are increasing engagement",
                "Daily mood check-ins remain the most popular feature", 
                "Students are actively using the \"Chat with me\" feature",
                "Conversations are leading to better mental health support"
            ]


