def _mean(self, values):
    """Calcule la moyenne d'une liste de valeurs"""
    return sum(values) / len(values) if values else 0

def _linear_regression_slope(self, x_values, y_values):
    """Calcule la pente d'une régression linéaire simple"""
    if len(x_values) != len(y_values) or len(x_values) < 2:
        return 0
    
    n = len(x_values)
    sum_x = sum(x_values)
    sum_y = sum(y_values)
    sum_xy = sum(x * y for x, y in zip(x_values, y_values))
    sum_x2 = sum(x * x for x in x_values)
    
    denominator = n * sum_x2 - sum_x * sum_x
    if denominator == 0:
        return 0
    
    return (n * sum_xy - sum_x * sum_y) / denominator