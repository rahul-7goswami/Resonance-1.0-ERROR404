import unittest
from unittest.mock import patch
from fastapi.testclient import TestClient
from business.business import app, Brief, Scenario, Simulation, simulate, money


class BusinessTests(unittest.TestCase):
    def test_indian_currency_display(self):
        for value, expected in [(0, '₹0'), (70000, '₹70,000'), (100000, '₹1.00 lakh'),
                                (1500000, '₹15.00 lakh'), (10000000, '₹1.00 crore'),
                                (-460000, '−₹4.60 lakh')]:
            self.assertEqual(money(value), expected)

    def setUp(self):
        self.brief = Brief(business="Software company", goal="Test expansion", budget=100, team=2, months=3)
        self.scenario = Scenario(title="Pilot", description="Small pilot", upfront=50, monthly_cost=20,
                                 monthly_revenue=60, launch_month=2, team_required=1)

    def test_cash_flow_and_peak_funding(self):
        result = simulate(Simulation(brief=self.brief, scenarios=[self.scenario]))['results'][0]
        self.assertEqual(result['net_value'], 10)
        self.assertEqual(result['funding_value'], 70)
        self.assertEqual(result['recovery'], 'Month 3')
        self.assertTrue(result['feasible'])

    def test_shock_and_infeasible_constraints(self):
        self.brief.budget = 60
        self.brief.team = 0
        result = simulate(Simulation(brief=self.brief, scenarios=[self.scenario], revenue_change=-100))
        self.assertEqual(result['results'][0]['net_value'], -110)
        self.assertEqual(len(result['results'][0]['issues']), 2)
        self.assertIn('No scenario fits', result['recommendation'])

    def test_routes_validation_and_private_files(self):
        with TestClient(app) as client:
            self.assertEqual(client.get('/business').status_code, 200)
            self.assertEqual(client.get('/business/business.html').status_code, 200)
            self.assertEqual(client.get('/business/business.py').status_code, 404)
            self.assertEqual(client.get('/.env').status_code, 404)
            data = client.get('/api/business/example').json()
            self.assertEqual(client.post('/api/business/simulate', json=data).status_code, 200)
            data['brief']['budget'] = -1
            self.assertEqual(client.post('/api/business/simulate', json=data).status_code, 422)

    def test_missing_ai_configuration_is_explicit(self):
        with patch.dict('os.environ', {}, clear=True), TestClient(app) as client:
            response = client.post('/api/business/propose', json=self.brief.model_dump())
            self.assertEqual(response.status_code, 503)


if __name__ == '__main__':
    unittest.main()
