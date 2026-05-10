"""
Enhanced Search Module
Provides advanced search and filtering capabilities with fuzzy matching
"""

import logging
import re
from functools import lru_cache
from typing import Any, Dict, List, Tuple

import pandas as pd

try:
    from rapidfuzz import fuzz, process
    FUZZY_AVAILABLE = True
except ImportError:
    FUZZY_AVAILABLE = False

logger = logging.getLogger(__name__)

class AdvancedSearch:
    """Advanced search engine with multiple algorithms and filtering"""
    
    def __init__(self):
        self.search_cache = {}
        self.cache_size_limit = 1000
    
    def multi_column_fuzzy_search(self, df: pd.DataFrame, query: str, 
                                 columns: List[str] = None, 
                                 min_score: int = 60) -> pd.DataFrame:
        """
        Perform fuzzy search across multiple columns
        
        Args:
            df: DataFrame to search
            query: Search query
            columns: Columns to search in (default: all text columns)
            min_score: Minimum fuzzy match score (0-100)
        
        Returns:
            Filtered DataFrame with match scores
        """
        if not FUZZY_AVAILABLE or df.empty or not query.strip():
            return df
        
        query = query.lower().strip()
        
        # Auto-detect text columns if not specified
        if columns is None:
            columns = df.select_dtypes(include=['object', 'string']).columns.tolist()
        
        # Filter columns that actually exist in the DataFrame
        columns = [col for col in columns if col in df.columns]
        
        if not columns:
            return df
        
        # Calculate fuzzy scores for each row
        scores = []
        for idx, row in df.iterrows():
            max_score = 0
            best_match_column = None
            
            for col in columns:
                cell_value = str(row[col]).lower() if pd.notna(row[col]) else ""
                
                if not cell_value:
                    continue
                
                # Multiple fuzzy matching algorithms
                token_sort_score = fuzz.token_sort_ratio(query, cell_value)
                token_set_score = fuzz.token_set_ratio(query, cell_value)
                partial_score = fuzz.partial_ratio(query, cell_value)
                ratio_score = fuzz.ratio(query, cell_value)
                
                # Weighted combined score
                combined_score = (
                    token_sort_score * 0.3 +
                    token_set_score * 0.3 +
                    partial_score * 0.2 +
                    ratio_score * 0.2
                )
                
                if combined_score > max_score:
                    max_score = combined_score
                    best_match_column = col
            
            scores.append({
                'index': idx,
                'score': max_score,
                'match_column': best_match_column
            })
        
        # Filter by minimum score
        filtered_indices = [item['index'] for item in scores if item['score'] >= min_score]
        
        if not filtered_indices:
            return pd.DataFrame(columns=df.columns)
        
        # Create result DataFrame with scores
        result_df = df.loc[filtered_indices].copy()
        
        # Add match scores
        score_map = {item['index']: item['score'] for item in scores if item['score'] >= min_score}
        result_df['match_score'] = result_df.index.map(score_map)
        
        # Sort by match score (descending)
        result_df = result_df.sort_values('match_score', ascending=False)
        
        return result_df
    
    def advanced_filter(self, df: pd.DataFrame, filters: Dict[str, Any]) -> pd.DataFrame:
        """
        Apply advanced filtering with multiple criteria
        
        Args:
            df: DataFrame to filter
            filters: Dictionary of filter criteria
                - text_filters: {column: query}
                - range_filters: {column: (min, max)}
                - exact_filters: {column: value}
                - date_filters: {column: (start_date, end_date)}
        
        Returns:
            Filtered DataFrame
        """
        if df.empty:
            return df
        
        filtered_df = df.copy()
        
        # Text filters with fuzzy matching
        text_filters = filters.get('text_filters', {})
        for column, query in text_filters.items():
            if column in filtered_df.columns and query:
                mask = filtered_df[column].astype(str).str.contains(
                    query, case=False, na=False, regex=False
                )
                filtered_df = filtered_df[mask]
        
        # Range filters for numeric columns
        range_filters = filters.get('range_filters', {})
        for column, (min_val, max_val) in range_filters.items():
            if column in filtered_df.columns:
                if min_val is not None:
                    filtered_df = filtered_df[filtered_df[column] >= min_val]
                if max_val is not None:
                    filtered_df = filtered_df[filtered_df[column] <= max_val]
        
        # Exact filters
        exact_filters = filters.get('exact_filters', {})
        for column, value in exact_filters.items():
            if column in filtered_df.columns and value is not None:
                filtered_df = filtered_df[filtered_df[column] == value]
        
        # Date filters
        date_filters = filters.get('date_filters', {})
        for column, (start_date, end_date) in date_filters.items():
            if column in filtered_df.columns:
                # Convert to datetime if not already
                if not pd.api.types.is_datetime64_any_dtype(filtered_df[column]):
                    filtered_df[column] = pd.to_datetime(filtered_df[column], errors='coerce')
                
                if start_date:
                    filtered_df = filtered_df[filtered_df[column] >= pd.to_datetime(start_date)]
                if end_date:
                    filtered_df = filtered_df[filtered_df[column] <= pd.to_datetime(end_date)]
        
        return filtered_df
    
    def smart_search_suggestions(self, df: pd.DataFrame, query: str, 
                               columns: List[str] = None, limit: int = 5) -> List[str]:
        """
        Generate smart search suggestions based on existing data
        
        Args:
            df: DataFrame to analyze
            query: Partial query
            columns: Columns to search for suggestions
            limit: Maximum number of suggestions
        
        Returns:
            List of suggested search terms
        """
        if df.empty or not query.strip():
            return []
        
        query = query.lower().strip()
        
        if columns is None:
            columns = df.select_dtypes(include=['object', 'string']).columns.tolist()
        
        suggestions = set()
        
        for column in columns:
            if column not in df.columns:
                continue
            
            # Get unique values from the column
            unique_values = df[column].dropna().astype(str).unique()
            
            for value in unique_values:
                value_lower = value.lower()
                
                # Add values that start with the query
                if value_lower.startswith(query):
                    suggestions.add(value)
                
                # Add values that contain the query
                elif query in value_lower:
                    suggestions.add(value)
                
                # Add fuzzy matches if available
                elif FUZZY_AVAILABLE and len(query) > 2:
                    if fuzz.partial_ratio(query, value_lower) > 80:
                        suggestions.add(value)
        
        # Sort suggestions by relevance
        sorted_suggestions = sorted(suggestions, key=lambda x: (
            not x.lower().startswith(query),  # Prioritize starts-with matches
            len(x),  # Shorter suggestions first
            x.lower()  # Alphabetical order
        ))
        
        return sorted_suggestions[:limit]
    
    def create_search_index(self, df: pd.DataFrame, columns: List[str] = None) -> Dict:
        """
        Create a search index for faster searching
        
        Args:
            df: DataFrame to index
            columns: Columns to include in index
        
        Returns:
            Search index dictionary
        """
        if df.empty:
            return {}
        
        if columns is None:
            columns = df.select_dtypes(include=['object', 'string']).columns.tolist()
        
        index = {
            'terms': {},  # term -> list of row indices
            'columns': columns,
            'total_rows': len(df)
        }
        
        for idx, row in df.iterrows():
            for column in columns:
                if column not in df.columns:
                    continue
                
                value = str(row[column]).lower() if pd.notna(row[column]) else ""
                
                if not value:
                    continue
                
                # Split into terms
                terms = re.findall(r'\b\w+\b', value)
                
                for term in terms:
                    if len(term) >= 2:  # Ignore single characters
                        if term not in index['terms']:
                            index['terms'][term] = []
                        index['terms'][term].append(idx)
        
        return index
    
    def search_with_index(self, df: pd.DataFrame, search_index: Dict, 
                         query: str) -> pd.DataFrame:
        """
        Fast search using pre-built index
        
        Args:
            df: Original DataFrame
            search_index: Pre-built search index
            query: Search query
        
        Returns:
            Filtered DataFrame
        """
        if df.empty or not query.strip() or not search_index:
            return df
        
        query_terms = re.findall(r'\b\w+\b', query.lower())
        
        if not query_terms:
            return df
        
        # Find rows that contain any of the query terms
        matching_indices = set()
        
        for term in query_terms:
            if term in search_index['terms']:
                matching_indices.update(search_index['terms'][term])
        
        if not matching_indices:
            return pd.DataFrame(columns=df.columns)
        
        # Return matching rows
        return df.loc[list(matching_indices)]
    
    def highlight_matches(self, text: str, query: str) -> str:
        """
        Highlight matching terms in text (for display purposes)
        
        Args:
            text: Original text
            query: Search query
        
        Returns:
            Text with highlighted matches
        """
        if not query.strip() or not text:
            return text
        
        query_terms = re.findall(r'\b\w+\b', query.lower())
        highlighted_text = text
        
        for term in query_terms:
            # Case-insensitive replacement with highlighting
            pattern = re.compile(re.escape(term), re.IGNORECASE)
            highlighted_text = pattern.sub(f"**{term}**", highlighted_text)
        
        return highlighted_text
    
    @lru_cache(maxsize=100)
    def cached_fuzzy_search(self, text: str, query: str) -> int:
        """
        Cached fuzzy search for better performance
        
        Args:
            text: Text to search in
            query: Search query
        
        Returns:
            Fuzzy match score (0-100)
        """
        if not FUZZY_AVAILABLE:
            return 0
        
        return fuzz.token_sort_ratio(query.lower(), text.lower())

class SmartFilter:
    """Smart filtering system with auto-detection and suggestions"""
    
    def __init__(self):
        self.filter_history = []
        self.max_history = 50
    
    def auto_detect_filters(self, df: pd.DataFrame) -> Dict[str, Dict]:
        """
        Auto-detect possible filters based on DataFrame content
        
        Args:
            df: DataFrame to analyze
        
        Returns:
            Dictionary of suggested filters
        """
        if df.empty:
            return {}
        
        suggested_filters = {}
        
        for column in df.columns:
            column_info = {
                'type': str(df[column].dtype),
                'unique_count': df[column].nunique(),
                'null_count': df[column].isnull().sum(),
                'suggestions': []
            }
            
            # Numeric columns - suggest range filters
            if pd.api.types.is_numeric_dtype(df[column]):
                column_info['min'] = df[column].min()
                column_info['max'] = df[column].max()
                column_info['mean'] = df[column].mean()
                column_info['suggestions'].append('range_filter')
            
            # Categorical columns - suggest exact filters
            elif df[column].nunique() <= 20:  # Reasonable number for dropdown
                column_info['unique_values'] = df[column].value_counts().head(10).to_dict()
                column_info['suggestions'].append('exact_filter')
            
            # Text columns - suggest text search
            elif pd.api.types.is_string_dtype(df[column]) or df[column].dtype == 'object':
                column_info['suggestions'].append('text_filter')
                
                # Sample values for suggestions
                sample_values = df[column].dropna().astype(str).head(5).tolist()
                column_info['sample_values'] = sample_values
            
            # Date columns - suggest date range filters
            elif pd.api.types.is_datetime64_any_dtype(df[column]):
                column_info['min_date'] = df[column].min()
                column_info['max_date'] = df[column].max()
                column_info['suggestions'].append('date_filter')
            
            suggested_filters[column] = column_info
        
        return suggested_filters
    
    def save_filter_preset(self, name: str, filters: Dict) -> bool:
        """
        Save filter configuration as preset
        
        Args:
            name: Preset name
            filters: Filter configuration
        
        Returns:
            Success status
        """
        try:
            preset = {
                'name': name,
                'filters': filters,
                'created_date': pd.Timestamp.now().isoformat(),
                'usage_count': 0
            }
            
            # Add to history (in a real app, this would be saved to database)
            self.filter_history.append(preset)
            
            # Limit history size
            if len(self.filter_history) > self.max_history:
                self.filter_history = self.filter_history[-self.max_history:]
            
            return True
            
        except Exception as e:
            logger.error(f"Error saving filter preset: {e}")
            return False
    
    def load_filter_presets(self) -> List[Dict]:
        """
        Load saved filter presets
        
        Returns:
            List of filter presets
        """
        return self.filter_history.copy()
    
    def apply_smart_filters(self, df: pd.DataFrame, 
                          smart_query: str) -> Tuple[pd.DataFrame, Dict]:
        """
        Apply smart filters based on natural language query
        
        Args:
            df: DataFrame to filter
            smart_query: Natural language filter query
        
        Returns:
            Tuple of (filtered_df, applied_filters)
        """
        if df.empty or not smart_query.strip():
            return df, {}
        
        applied_filters = {}
        filtered_df = df.copy()
        
        # Parse natural language query
        query_lower = smart_query.lower()
        
        # Extract numeric ranges (e.g., "cost between 1000 and 5000")
        range_pattern = r'(\w+)\s+between\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)'
        range_matches = re.findall(range_pattern, query_lower)
        
        for column, min_val, max_val in range_matches:
            # Find matching column
            matching_cols = [col for col in df.columns if column in col.lower()]
            if matching_cols:
                col = matching_cols[0]
                if pd.api.types.is_numeric_dtype(df[col]):
                    filtered_df = filtered_df[
                        (filtered_df[col] >= float(min_val)) & 
                        (filtered_df[col] <= float(max_val))
                    ]
                    applied_filters[col] = f"between {min_val} and {max_val}"
        
        # Extract exact matches (e.g., "status is active")
        exact_pattern = r'(\w+)\s+is\s+(\w+)'
        exact_matches = re.findall(exact_pattern, query_lower)
        
        for column, value in exact_matches:
            matching_cols = [col for col in df.columns if column in col.lower()]
            if matching_cols:
                col = matching_cols[0]
                filtered_df = filtered_df[filtered_df[col].astype(str).str.lower() == value]
                applied_filters[col] = f"equals {value}"
        
        # Extract text contains (e.g., "description contains concrete")
        contains_pattern = r'(\w+)\s+contains?\s+(\w+)'
        contains_matches = re.findall(contains_pattern, query_lower)
        
        for column, value in contains_matches:
            matching_cols = [col for col in df.columns if column in col.lower()]
            if matching_cols:
                col = matching_cols[0]
                filtered_df = filtered_df[
                    filtered_df[col].astype(str).str.contains(value, case=False, na=False)
                ]
                applied_filters[col] = f"contains {value}"
        
        return filtered_df, applied_filters