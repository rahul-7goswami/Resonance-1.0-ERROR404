import json
import unittest
import tempfile
from unittest.mock import patch

from fastapi import HTTPException
from fastapi.testclient import TestClient
from business.business import app
from finance.finance import Goal, grounded_report, snapshot


class FinanceTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory(); self.addCleanup(temp.cleanup)
        env = patch.dict('os.environ', {'DFLOW_DATA_DIR': temp.name}); env.start(); self.addCleanup(env.stop)
        self.goal = Goal(focus='Purchase', thoughts='Should I buy a car or keep using transit?',
                         location='Pune, India', timeline='Six months', income=80000, spending=40000,
                         savings=600000, reserve=300000, budget=800000)
        self.text = 'Check ownership costs. Compare local transit.'
        self.metadata = {'webSearchQueries': ['Pune transport costs'], 'groundingChunks': [
            {'web': {'uri': 'https://example.com/costs', 'title': 'Ownership costs'}},
            {'web': {'uri': 'https://example.org/transit', 'title': 'Transit'}}],
            'groundingSupports': [{'segment': {'text': 'Check ownership costs.'}, 'groundingChunkIndices': [0]},
                                  {'segment': {'text': 'Compare local transit.'}, 'groundingChunkIndices': [1]}]}

    def test_snapshot_and_unknown_values(self):
        self.assertEqual(snapshot(self.goal)[0]['value'], '₹40,000')
        self.assertEqual(snapshot(self.goal)[1]['value'], '₹3.00 lakh')
        self.goal.income = self.goal.savings = self.goal.budget = None
        self.assertEqual(snapshot(self.goal), [])

    def test_grounded_metadata_gate(self):
        result = grounded_report(self.text, self.metadata)
        self.assertEqual(result['evidence'][1]['source_ids'], [2])
        with self.assertRaises(HTTPException):
            grounded_report('Unsupported conclusion', {})
        self.metadata['groundingChunks'][0]['web']['uri'] = 'javascript:alert(1)'
        with self.assertRaises(HTTPException):
            grounded_report(self.text, self.metadata)

    def test_organize_and_research(self):
        outline = {'title': 'A practical commute', 'understanding': 'Choose a transport option.',
                   'priorities': ['Keep savings'], 'questions': ['How long is the commute?'],
                   'research_plan': ['Compare total ownership costs and transit.']}
        with TestClient(app) as client:
            with patch('finance.finance.generate', return_value=(json.dumps(outline), {})):
                r = client.post('/api/finance/organize', json=self.goal.model_dump())
                self.assertEqual(r.status_code, 200)
                self.assertEqual(r.json()['outline']['questions'], outline['questions'])
            formula = json.dumps({'formulas': [{'name': 'Monthly balance', 'expression': 'income-spending', 'unit': 'INR', 'explanation': 'Income less spending.'}], 'missing_information': []})
            with patch('finance.finance.generate', side_effect=[(self.text, self.metadata), (formula, {}), (self.text, self.metadata)]) as provider:
                r = client.post('/api/finance/research', json=self.goal.model_dump())
                self.assertEqual(r.status_code, 200)
                self.assertEqual(provider.call_count, 3)
                self.assertTrue(provider.call_args_list[0].kwargs['search'])
                self.assertTrue(provider.call_args_list[2].kwargs['search'])
                self.assertEqual(r.json()['calculations'][0]['value'], 40000)

    def test_missing_key_and_routes(self):
        with TestClient(app) as client, patch.dict('os.environ', {}, clear=True):
            self.assertEqual(client.get('/finance').status_code, 200)
            self.assertEqual(client.get('/finance/finance.html').status_code, 200)
            self.assertEqual(client.get('/finance/finance-scenario-simulator.html').status_code, 200)
            self.assertEqual(client.get('/finance/finance.py').status_code, 404)
            self.assertEqual(client.post('/api/finance/research', json=self.goal.model_dump()).status_code, 503)
            self.assertEqual(client.post('/api/finance/snapshot', json=self.goal.model_dump()).status_code, 200)
            data = self.goal.model_dump(); data['spending'] = -1
            self.assertEqual(client.post('/api/finance/snapshot', json=data).status_code, 422)


if __name__ == '__main__':
    unittest.main()
