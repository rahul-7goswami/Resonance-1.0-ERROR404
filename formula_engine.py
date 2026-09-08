"""Bounded arithmetic interpreter for AI-defined formulas; never eval or exec."""
import ast
import math
import operator
from pydantic import BaseModel, ConfigDict, Field


class Formula(BaseModel):
    model_config = ConfigDict(extra='forbid')
    name: str = Field(min_length=1, max_length=120)
    expression: str = Field(min_length=1, max_length=300)
    unit: str = Field(min_length=1, max_length=40)
    explanation: str = Field(min_length=1, max_length=1200)


class FormulaSet(BaseModel):
    model_config = ConfigDict(extra='forbid')
    formulas: list[Formula] = Field(max_length=8)
    missing_information: list[str] = Field(max_length=8)


def evaluate(expression, variables):
    tree = ast.parse(expression, mode='eval')
    if len(list(ast.walk(tree))) > 80:
        raise ValueError('Formula is too complex')
    def visit(node):
        if isinstance(node, ast.Expression):
            value = visit(node.body)
        elif isinstance(node, ast.Constant) and type(node.value) in (int, float):
            value = node.value
        elif isinstance(node, ast.Name) and node.id in variables:
            value = variables[node.id]
        elif isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.USub, ast.UAdd)):
            value = -visit(node.operand) if isinstance(node.op, ast.USub) else visit(node.operand)
        elif isinstance(node, ast.BinOp):
            operations = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv}
            left, right = visit(node.left), visit(node.right)
            if isinstance(node.op, ast.Pow):
                if abs(right) > 120 or abs(left) > 1e6 or (left < 0 and right != int(right)):
                    raise ValueError('Power exceeds limits')
                value = left ** right
            elif type(node.op) in operations:
                value = operations[type(node.op)](left, right)
            else:
                raise ValueError('Unsupported arithmetic')
        else:
            raise ValueError('Only numeric variables and arithmetic are allowed')
        if type(value) not in (int, float) or not math.isfinite(value) or abs(value) > 1e15:
            raise ValueError('Invalid or excessive result')
        return value
    return visit(tree)


def calculate_formulas(formulas, variables):
    rows = []
    for f in formulas:
        try:
            value = round(evaluate(f.expression, variables), 4)
            display = f'{value:,.4f}'.rstrip('0').rstrip('.') + ' ' + f.unit
            if f.unit.lower() in {'inr', 'rupees', 'rupee', '₹'}:
                absolute = abs(value)
                suffix, divisor = (' crore', 10000000) if absolute >= 10000000 else (' lakh', 100000) if absolute >= 100000 else ('', 1)
                display = ('−' if value < 0 else '') + '₹' + f'{absolute/divisor:,.2f}' + suffix
            rows.append({**f.model_dump(), 'value': value, 'display': display, 'error': None})
        except (ValueError, SyntaxError, ArithmeticError, TypeError):
            rows.append({**f.model_dump(), 'value': None, 'error': 'Cannot calculate: check the variables, units and formula.'})
    return rows


FORMULA_INSTRUCTIONS = '''Create formulas relevant to the user's goal, using only the numeric
variables provided. Allowed: variable names, numeric constants, parentheses, + - * / **.
No function calls, attributes or code. Powers are bounded to exponents of magnitude 120.
Constants may represent unit conversions (e.g. 12 months/year, 100 percent), not invented
prices, rates or assumptions. State each output's unit and explain the formula. Do not
replace supplied variables with hardcoded values. If necessary values are missing, list
them and omit that formula. Return formulas and missing_information in the requested schema.'''
