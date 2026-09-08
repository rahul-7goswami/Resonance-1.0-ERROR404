import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient
from business.business import app
from agent_io import input_document, prompt_for
from formula_engine import Formula, calculate_formulas, evaluate


class LifeAndAgentTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        env = patch.dict('os.environ', {'DFLOW_DATA_DIR': self.temp.name}); env.start(); self.addCleanup(env.stop)
        self.goal = {'focus': 'College & education', 'thoughts': 'Compare college environments.',
                     'timeline': 'This year', 'values': 'Small classes and practical learning', 'location': 'India'}

    def test_json_is_separate_and_round_trips(self):
        first = input_document('life', 'organize', self.goal)
        second = input_document('life', 'research', self.goal)
        self.assertNotEqual(first['request_id'], second['request_id'])
        files = list((Path(self.temp.name)/'life').glob('*.json'))
        self.assertEqual(len(files), 2)
        self.assertEqual(json.loads(files[0].read_text())['variables'], self.goal)
        for domain in ['business', 'finance', 'life']:
            self.assertTrue(prompt_for(domain))

    def test_life_organizes_json_input(self):
        outline = {'title': 'Find a learning environment', 'understanding': 'Compare college fit.',
                   'priorities': ['Practical learning'], 'questions': ['Which programs?'], 'research_plan': ['Compare student experiences.']}
        with TestClient(app) as client, patch('life.life.generate', return_value=(json.dumps(outline), {})) as mock:
            result = client.post('/api/life/organize', json=self.goal)
            self.assertEqual(result.status_code, 200)
            self.assertIn('"variables"', mock.call_args.args[0])
            self.assertEqual(mock.call_args.kwargs['domain'], 'life')
            for path in ['/life', '/finance', '/pricing', '/domain-transition.js']:
                self.assertEqual(client.get(path).status_code, 200)
            self.assertEqual(client.get('/data/inputs/life/private.json').status_code, 404)

    def test_formula_interpreter(self):
        self.assertEqual(evaluate('(income-spending)*12', {'income': 100, 'spending': 40}), 720)
        for expression in ["__import__('os')", 'income.real', '[1][0]', '2**1000', '1/0', 'missing+1']:
            with self.assertRaises((ValueError, ArithmeticError)):
                evaluate(expression, {'income': 100})
        f = Formula(name='Savings', expression='income-spending', unit='INR', explanation='Monthly balance')
        self.assertEqual(calculate_formulas([f], {'income': 200000, 'spending': 50000})[0]['display'], '₹1.50 lakh')


if __name__ == '__main__':
    unittest.main()
