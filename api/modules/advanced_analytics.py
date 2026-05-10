"""
Advanced Analytics Module
Provides comprehensive analytics and insights for construction estimation
"""

import logging
from typing import Dict, List

import pandas as pd
import plotly.express as px

logger = logging.getLogger(__name__)

class AdvancedAnalytics:
    """Advanced analytics engine for construction estimation"""
    
    def __init__(self):
        self.analytics_cache = {}
    
    def generate_cost_insights(self, abstracts: Dict[str, pd.DataFrame], 
                             measurements: Dict[str, pd.DataFrame]) -> Dict:
        """Generate comprehensive cost insights"""
        try:
            insights = {
                'total_cost': 0,
                'cost_breakdown': {},
                'top_cost_items': [],
                'cost_efficiency': {},
                'recommendations': []
            }
            
            # Combine all abstract data
            all_abstracts = []
            for sheet_name, df in abstracts.items():
                if not df.empty:
                    df_copy = df.copy()
                    df_copy['work_type'] = sheet_name
                    all_abstracts.append(df_copy)
            
            if not all_abstracts:
                return insights
            
            combined_df = pd.concat(all_abstracts, ignore_index=True)
            
            # Total cost
            insights['total_cost'] = combined_df['amount'].sum()
            
            # Cost breakdown by work type
            cost_by_type = combined_df.groupby('work_type')['amount'].sum()
            insights['cost_breakdown'] = cost_by_type.to_dict()
            
            # Top cost items
            top_items = combined_df.nlargest(10, 'amount')
            insights['top_cost_items'] = top_items[['description', 'amount', 'work_type']].to_dict('records')
            
            # Cost efficiency analysis
            insights['cost_efficiency'] = self._analyze_cost_efficiency(combined_df)
            
            # Generate recommendations
            insights['recommendations'] = self._generate_cost_recommendations(combined_df)
            
            return insights
            
        except Exception as e:
            logger.error(f"Error generating cost insights: {e}")
            return {}
    
    def _analyze_cost_efficiency(self, df: pd.DataFrame) -> Dict:
        """Analyze cost efficiency metrics"""
        efficiency = {}
        
        try:
            # Rate variance analysis
            rate_stats = df.groupby('work_type')['rate'].agg(['mean', 'std', 'min', 'max'])
            efficiency['rate_variance'] = rate_stats.to_dict('index')
            
            # Quantity efficiency
            qty_stats = df.groupby('work_type')['quantity'].agg(['mean', 'std', 'sum'])
            efficiency['quantity_analysis'] = qty_stats.to_dict('index')
            
            # Cost per unit analysis
            df['cost_per_unit'] = df['amount'] / df['quantity'].replace(0, 1)
            cost_per_unit = df.groupby('work_type')['cost_per_unit'].mean()
            efficiency['cost_per_unit'] = cost_per_unit.to_dict()
            
        except Exception as e:
            logger.error(f"Error in cost efficiency analysis: {e}")
        
        return efficiency
    
    def _generate_cost_recommendations(self, df: pd.DataFrame) -> List[str]:
        """Generate cost optimization recommendations"""
        recommendations = []
        
        try:
            # High cost items
            high_cost_threshold = df['amount'].quantile(0.8)
            high_cost_items = df[df['amount'] > high_cost_threshold]
            
            if not high_cost_items.empty:
                recommendations.append(
                    f"Review {len(high_cost_items)} high-cost items representing "
                    f"{(high_cost_items['amount'].sum() / df['amount'].sum() * 100):.1f}% of total cost"
                )
            
            # Rate variance analysis
            work_types = df['work_type'].unique()
            for work_type in work_types:
                work_df = df[df['work_type'] == work_type]
                if len(work_df) > 1:
                    rate_cv = work_df['rate'].std() / work_df['rate'].mean()
                    if rate_cv > 0.3:  # High coefficient of variation
                        recommendations.append(
                            f"High rate variance in {work_type} - consider rate standardization"
                        )
            
            # Quantity optimization
            small_qty_items = df[df['quantity'] < 1]
            if not small_qty_items.empty:
                recommendations.append(
                    f"Consider consolidating {len(small_qty_items)} small quantity items"
                )
            
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
        
        return recommendations
    
    def create_cost_dashboard(self, abstracts: Dict[str, pd.DataFrame]) -> Dict:
        """Create comprehensive cost dashboard"""
        dashboard = {
            'charts': {},
            'metrics': {},
            'tables': {}
        }
        
        try:
            # Combine data
            all_abstracts = []
            for sheet_name, df in abstracts.items():
                if not df.empty:
                    df_copy = df.copy()
                    df_copy['work_type'] = sheet_name
                    all_abstracts.append(df_copy)
            
            if not all_abstracts:
                return dashboard
            
            combined_df = pd.concat(all_abstracts, ignore_index=True)
            
            # Cost distribution pie chart
            cost_by_type = combined_df.groupby('work_type')['amount'].sum().reset_index()
            dashboard['charts']['cost_distribution'] = px.pie(
                cost_by_type, values='amount', names='work_type',
                title="Cost Distribution by Work Type"
            )
            
            # Top items bar chart
            top_items = combined_df.nlargest(10, 'amount')
            dashboard['charts']['top_items'] = px.bar(
                top_items, x='amount', y='description',
                orientation='h', title="Top 10 Cost Items"
            )
            
            # Rate analysis
            rate_by_type = combined_df.groupby('work_type')['rate'].mean().reset_index()
            dashboard['charts']['rate_analysis'] = px.bar(
                rate_by_type, x='work_type', y='rate',
                title="Average Rate by Work Type"
            )
            
            # Metrics
            dashboard['metrics'] = {
                'total_cost': combined_df['amount'].sum(),
                'total_items': len(combined_df),
                'avg_rate': combined_df['rate'].mean(),
                'total_quantity': combined_df['quantity'].sum()
            }
            
            # Summary table
            summary = combined_df.groupby('work_type').agg({
                'amount': ['sum', 'count', 'mean'],
                'quantity': 'sum',
                'rate': 'mean'
            }).round(2)
            dashboard['tables']['summary'] = summary
            
        except Exception as e:
            logger.error(f"Error creating dashboard: {e}")
        
        return dashboard
    
    def generate_trend_analysis(self, historical_data: List[Dict]) -> Dict:
        """Generate trend analysis from historical project data"""
        trends = {
            'cost_trends': {},
            'rate_trends': {},
            'efficiency_trends': {}
        }
        
        try:
            if not historical_data:
                return trends
            
            # Convert to DataFrame
            df = pd.DataFrame(historical_data)
            df['date'] = pd.to_datetime(df['date'])
            
            # Cost trends over time
            monthly_costs = df.groupby(df['date'].dt.to_period('M'))['total_cost'].mean()
            trends['cost_trends'] = {
                'monthly_average': monthly_costs.to_dict(),
                'growth_rate': self._calculate_growth_rate(monthly_costs)
            }
            
            # Rate trends
            if 'avg_rate' in df.columns:
                rate_trends = df.groupby(df['date'].dt.to_period('M'))['avg_rate'].mean()
                trends['rate_trends'] = {
                    'monthly_rates': rate_trends.to_dict(),
                    'rate_inflation': self._calculate_growth_rate(rate_trends)
                }
            
        except Exception as e:
            logger.error(f"Error in trend analysis: {e}")
        
        return trends
    
    def _calculate_growth_rate(self, series: pd.Series) -> float:
        """Calculate growth rate for a time series"""
        try:
            if len(series) < 2:
                return 0.0
            
            first_value = series.iloc[0]
            last_value = series.iloc[-1]
            
            if first_value == 0:
                return 0.0
            
            periods = len(series) - 1
            growth_rate = ((last_value / first_value) ** (1/periods) - 1) * 100
            
            return round(growth_rate, 2)
            
        except Exception as e:
            logger.error(f"Error calculating growth rate: {e}")
            return 0.0
    
    def create_comparison_analysis(self, project_data: List[Dict]) -> Dict:
        """Create comparative analysis between projects"""
        comparison = {
            'cost_comparison': {},
            'efficiency_comparison': {},
            'recommendations': []
        }
        
        try:
            if len(project_data) < 2:
                return comparison
            
            df = pd.DataFrame(project_data)
            
            # Cost per square foot comparison
            if 'total_area' in df.columns and 'total_cost' in df.columns:
                df['cost_per_sqft'] = df['total_cost'] / df['total_area'].replace(0, 1)
                comparison['cost_comparison']['cost_per_sqft'] = df[['project_name', 'cost_per_sqft']].to_dict('records')
            
            # Project type comparison
            if 'project_type' in df.columns:
                type_comparison = df.groupby('project_type').agg({
                    'total_cost': ['mean', 'min', 'max'],
                    'cost_per_sqft': 'mean'
                }).round(2)
                comparison['cost_comparison']['by_type'] = type_comparison.to_dict()
            
            # Generate comparison recommendations
            comparison['recommendations'] = self._generate_comparison_recommendations(df)
            
        except Exception as e:
            logger.error(f"Error in comparison analysis: {e}")
        
        return comparison
    
    def _generate_comparison_recommendations(self, df: pd.DataFrame) -> List[str]:
        """Generate recommendations based on project comparison"""
        recommendations = []
        
        try:
            if 'cost_per_sqft' in df.columns:
                mean_cost = df['cost_per_sqft'].mean()
                high_cost_projects = df[df['cost_per_sqft'] > mean_cost * 1.2]
                
                if not high_cost_projects.empty:
                    recommendations.append(
                        f"{len(high_cost_projects)} projects have significantly higher cost per sq.ft than average"
                    )
            
            if 'project_type' in df.columns:
                type_costs = df.groupby('project_type')['total_cost'].mean()
                if len(type_costs) > 1:
                    most_expensive = type_costs.idxmax()
                    least_expensive = type_costs.idxmin()
                    recommendations.append(
                        f"{most_expensive} projects are typically more expensive than {least_expensive} projects"
                    )
            
        except Exception as e:
            logger.error(f"Error generating comparison recommendations: {e}")
        
        return recommendations